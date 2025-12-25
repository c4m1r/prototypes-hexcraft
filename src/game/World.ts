import * as THREE from 'three';
import { Chunk, Block, BLOCK_TYPES } from '../types/game';
import { ChunkGenerator } from './ChunkGenerator';
import { hexToWorld, getChunkKey, worldToChunk, createHexGeometry, createHexGeometryWithUV, worldToHex } from '../utils/hexUtils';
import { GameSettings, DEFAULT_SETTINGS, RenderingMode } from '../types/settings';
import { TextureManager } from './TextureManager';

interface ChunkMeshData {
  mesh: THREE.InstancedMesh;
  blocks: Block[];
}

export class World {
  private chunks: Map<string, Chunk> = new Map();
  private chunkMeshes: Map<string, Map<string, ChunkMeshData>> = new Map();
  private generator: ChunkGenerator;
  private scene: THREE.Scene;
  private chunkSize: number = 14;
  private blockGeometry: THREE.CylinderGeometry;
  private materials: Map<string, THREE.MeshLambertMaterial> = new Map();
  private maxLoadedChunks: number = 15;
  private fogBarrier: THREE.Mesh | null = null;
  private showFogBarrier: boolean = true;
  private renderDistance: number = 3;
  private fogDensity: number = 1;
  private generatorSeed: number = 0;
  private loadAttempts: number = 0;
  private initialized: boolean = false;
  private debugLogsLeft: number = 20;
  // Лимитируем только аварийные попытки, когда size=0, чтобы не спамить консоль.
  private maxEmergencyAttempts: number = 20;
  private emergencyAttempts: number = 0;
  private stopEmergencyLogs: boolean = false;
  private fallbackInjected: boolean = false;
  private renderingMode: RenderingMode = 'prototype';
  private textureManager: TextureManager | null = null;
  private animationTime: number = 0;

  constructor(scene: THREE.Scene, settings?: GameSettings) {
    this.scene = scene;
    const finalSettings = settings || DEFAULT_SETTINGS;
    this.chunkSize = finalSettings.chunkSize;
    this.maxLoadedChunks = finalSettings.maxLoadedChunks;
    this.renderDistance = finalSettings.renderDistance;
    this.fogDensity = finalSettings.fogDensity;
    this.renderingMode = finalSettings.renderingMode;

    // Чтобы избежать постоянного удаления/добавления чанков, гарантируем,
    // что лимит загруженных чанков покрывает радиус видимости.
    const requiredChunks = 1 + 3 * this.renderDistance * (this.renderDistance + 1); // формула количества гексов в радиусе
    if (this.maxLoadedChunks < requiredChunks) {
      console.warn(
        `[World] maxLoadedChunks повышен ${this.maxLoadedChunks} -> ${requiredChunks} для renderDistance=${this.renderDistance}`
      );
      this.maxLoadedChunks = requiredChunks;
    }

    this.generator = new ChunkGenerator(this.chunkSize);
    this.generatorSeed = this.generator.getSeed();

    if (this.renderingMode === 'modern') {
      this.blockGeometry = createHexGeometryWithUV();
      this.textureManager = new TextureManager({
        atlasSize: 320,
        tileSize: 32,
        rows: 4,
        cols: 10
      });
      // Загружаем текстуру (путь будет обработан Vite)
      const texturePath = new URL('./texutres.png', import.meta.url).href;
      this.textureManager.loadAtlas(texturePath).then(() => {
        this.initializeMaterials();
      }).catch(err => {
        console.error('[World] Ошибка загрузки текстур:', err);
        this.renderingMode = 'prototype';
        this.initializeMaterials();
      });
    } else {
      this.blockGeometry = createHexGeometry();
      this.initializeMaterials();
    }

    this.createFogBarrier();
    this.updateFogDensity();
  }

  private initializeMaterials(): void {
    BLOCK_TYPES.forEach(blockType => {
      if (this.renderingMode === 'modern' && this.textureManager) {
        const material = this.textureManager.createMaterial(blockType.id, this.animationTime, blockType.color);
        if (material) {
          this.materials.set(blockType.id, material);
        } else {
          // Fallback на фиолетовый материал (error debug) для блоков без текстуры в атласе
          this.materials.set(
            blockType.id,
            new THREE.MeshLambertMaterial({
              color: 0xff00ff, // Фиолетовый цвет для блоков без текстуры
              side: THREE.DoubleSide
            })
          );
        }
      } else {
        const isLeaves = blockType.id === 'leaves';
        this.materials.set(
          blockType.id,
          new THREE.MeshLambertMaterial({
            color: blockType.color,
            transparent: isLeaves,
            opacity: isLeaves ? 0.75 : 1,
            side: isLeaves ? THREE.DoubleSide : THREE.FrontSide
          })
        );
      }
    });
  }

  initialize(): void {
    console.info(
      `[World] init seed=${this.generatorSeed} chunkSize=${this.chunkSize} renderDistance=${this.renderDistance} maxLoaded=${this.maxLoadedChunks}`
    );
    this.initialized = true;
    for (let q = -1; q <= 1; q++) {
      for (let r = -1; r <= 1; r++) {
        this.loadChunk(q, r);
      }
    }

    if (this.chunks.size === 0 && this.debugLogsLeft > 0) {
      console.error('[World] После initialize чанки не загружены, size=0');
      this.debugLogsLeft -= 1;
    }
  }

  update(playerX: number, playerZ: number): void {
    const playerChunk = worldToChunk(playerX, playerZ, this.chunkSize);

    if (this.chunks.size === 0) {
      console.warn('[World] Нет загруженных чанков, принудительная загрузка вокруг игрока');
      if (this.emergencyAttempts < this.maxEmergencyAttempts) {
        this.forceLoadAround(playerChunk.q, playerChunk.r);
        this.emergencyAttempts += 1;
      } else if (!this.stopEmergencyLogs) {
        console.error('[World] Достигнут лимит попыток загрузки чанков, прекращаю аварийные попытки');
        this.stopEmergencyLogs = true;
        if (!this.fallbackInjected) {
          this.injectFallbackChunk(playerChunk.q, playerChunk.r);
        }
      }
      if (this.debugLogsLeft > 0) {
        console.warn(
          `[World] chunks.size=0 перед циклом, playerChunk=${playerChunk.q},${playerChunk.r}, attempts=${this.emergencyAttempts}`
        );
        this.debugLogsLeft -= 1;
      }

      if (this.emergencyAttempts >= this.maxEmergencyAttempts) {
        return;
      }
    } else {
      this.emergencyAttempts = 0;
      this.stopEmergencyLogs = false;

      if (this.debugLogsLeft > 0) {
        console.info(`[World] update ok chunks=${this.chunks.size} meshes=${this.chunkMeshes.size}`);
        this.debugLogsLeft -= 1;
      }
    }

    for (let q = playerChunk.q - this.renderDistance; q <= playerChunk.q + this.renderDistance; q++) {
      for (let r = playerChunk.r - this.renderDistance; r <= playerChunk.r + this.renderDistance; r++) {
        const key = getChunkKey(q, r);
        if (!this.chunks.has(key)) {
          this.loadChunk(q, r);
        }
      }
    }

    this.unloadDistantChunks(playerChunk.q, playerChunk.r);
    this.updateFogBarrier(playerX, playerZ);

    // Обновление анимации текстур для режима Modern
    if (this.renderingMode === 'modern' && this.textureManager) {
      this.animationTime += 0.016; // Примерно 60 FPS
      this.textureManager.updateAnimation(0.016);
      this.updateAnimatedMaterials();
    }
  }

  private updateAnimatedMaterials(): void {
    if (!this.textureManager) return;

    const animatedBlocks = ['lava', 'water'];
    animatedBlocks.forEach(blockId => {
      const material = this.materials.get(blockId);
      if (material) {
        const newMaterial = this.textureManager!.createMaterial(blockId, this.animationTime);
        if (newMaterial) {
          // Для ShaderMaterial обновляем uniforms
          if (material instanceof THREE.ShaderMaterial) {
            const newShaderMaterial = newMaterial as THREE.ShaderMaterial;
            if (newShaderMaterial.uniforms) {
              material.uniforms.topTexture.value = newShaderMaterial.uniforms.topTexture.value;
              material.uniforms.sideTexture.value = newShaderMaterial.uniforms.sideTexture.value;
            }
          } else if (material instanceof THREE.MeshLambertMaterial) {
            // Для обычных материалов обновляем map
            if (material.map) {
              material.map.dispose();
            }
            material.map = (newMaterial as THREE.MeshLambertMaterial).map;
          }
          material.needsUpdate = true;
        }
      }
    });
  }

  setLighting(ambientColor: THREE.Color, directionalColor: THREE.Color, directionalDirection: THREE.Vector3): void {
    // Обновляем освещение для всех шейдер-материалов
    this.materials.forEach(material => {
      if (material instanceof THREE.ShaderMaterial && material.uniforms) {
        if (material.uniforms.ambientLightColor) {
          material.uniforms.ambientLightColor.value.copy(ambientColor);
        }
        if (material.uniforms.directionalLightColor) {
          material.uniforms.directionalLightColor.value.copy(directionalColor);
        }
        if (material.uniforms.directionalLightDirection) {
          material.uniforms.directionalLightDirection.value.copy(directionalDirection);
        }
      }
    });
  }

  private loadChunk(chunkQ: number, chunkR: number): void {
    const key = getChunkKey(chunkQ, chunkR);
    if (this.chunks.has(key)) return;

    const chunk = this.generator.generateChunk(chunkQ, chunkR);
    if (this.debugLogsLeft > 0) {
      console.info(`[World] loadChunk start key=${key} beforeSize=${this.chunks.size}`);
    }

    this.chunks.set(key, chunk);
    this.loadAttempts += 1;

    this.createChunkMeshes(chunk);

    if (chunk.blocks.length === 0) {
      console.warn(`[World] Пустой чанк ${key} biome=${chunk.biome}`);
    } else {
      console.debug(`[World] Чанк ${key} biome=${chunk.biome} blocks=${chunk.blocks.length}`);
    }

    if (this.debugLogsLeft > 0) {
      console.info(`[World] loadChunk done key=${key} afterSize=${this.chunks.size} blocks=${chunk.blocks.length}`);
      this.debugLogsLeft -= 1;
    }
  }

  private createChunkMeshes(chunk: Chunk): void {
    const key = getChunkKey(chunk.position.q, chunk.position.r);

    // Group blocks by type
    const blocksByType = new Map<string, Block[]>();
    chunk.blocks.forEach(block => {
      if (!blocksByType.has(block.type)) {
        blocksByType.set(block.type, []);
      }
      blocksByType.get(block.type)!.push(block);
    });

    const chunkMeshMap = new Map<string, ChunkMeshData>();

    blocksByType.forEach((blocks, type) => {
      let material = this.materials.get(type);
      if (!material) return;

      // TODO: для modern режима заменить материалы на текстурные,
      // когда появятся координаты в атласе texutres.png.
      if (this.renderingMode === 'modern') {
        // пока используем существующие цветные материалы как fallback
      }

      const mesh = new THREE.InstancedMesh(this.blockGeometry, material, blocks.length);
      // Инстансы расположены далеко от (0,0,0), без этого boundingSphere отсечет их.
      mesh.frustumCulled = false;
      const matrix = new THREE.Matrix4();

      blocks.forEach((block, index) => {
        const worldPos = hexToWorld(block.position.q, block.position.r, block.position.y);
        matrix.setPosition(worldPos);
        mesh.setMatrixAt(index, matrix);
      });

      mesh.instanceMatrix.needsUpdate = true;

      mesh.userData = {
        chunkKey: key,
        blockType: type,
        blocks: blocks
      };

      this.scene.add(mesh);
      chunkMeshMap.set(type, { mesh, blocks });
    });

    this.chunkMeshes.set(key, chunkMeshMap);
  }

  getHeightAt(x: number, z: number): number {
    const centerHex = worldToHex(x, z);
    let maxHeight = 0;

    // Check center and neighbors
    const neighbors = [
      { q: 0, r: 0 },
      { q: 1, r: 0 }, { q: -1, r: 0 },
      { q: 0, r: 1 }, { q: 0, r: -1 },
      { q: 1, r: -1 }, { q: -1, r: 1 }
    ];

    for (const offset of neighbors) {
      const q = centerHex.q + offset.q;
      const r = centerHex.r + offset.r;

      const chunkQ = Math.floor(q / this.chunkSize);
      const chunkR = Math.floor(r / this.chunkSize);
      const key = getChunkKey(chunkQ, chunkR);
      const chunk = this.chunks.get(key);

      if (chunk) {
        // Check height at this q,r, пропускаем проходимые блоки
        for (let y = 32; y >= 0; y--) {
          if (chunk.blockMap.has(`${q},${r},${y}`)) {
            const block = chunk.blockMap.get(`${q},${r},${y}`)!;
            // Пропускаем проходимые блоки (leaves, water, lava)
            if (this.isPassable(block.type)) {
              continue;
            }
            const blockPos = hexToWorld(q, r, y);
            const dist = Math.sqrt(Math.pow(blockPos.x - x, 2) + Math.pow(blockPos.z - z, 2));

            if (dist < 2) {
              maxHeight = Math.max(maxHeight, blockPos.y + 0.5);
              break;
            }
          }
        }
      }
    }

    return maxHeight;
  }

  getBlockTypeAt(x: number, y: number, z: number): string | null {
    const hex = worldToHex(x, z);
    const blockY = Math.floor(y);
    return this.getBlockAt(hex.q, hex.r, blockY)?.type || null;
  }

  isPassable(blockType: string): boolean {
    return blockType === 'leaves' || blockType === 'water' || blockType === 'lava';
  }

  getPassableSlowdown(blockType: string): number {
    // Коэффициент замедления: 1.0 = нормальная скорость, меньше = медленнее
    switch (blockType) {
      case 'leaves':
        return 0.7; // Замедление на 30%
      case 'water':
        return 0.5; // Замедление на 50%
      case 'lava':
        return 0.3; // Замедление на 70%
      default:
        return 1.0;
    }
  }

  addBlock(block: Block): void {
    const chunkPos = worldToChunk(
      hexToWorld(block.position.q, block.position.r, 0).x,
      hexToWorld(block.position.q, block.position.r, 0).z,
      this.chunkSize
    );
    const key = getChunkKey(chunkPos.q, chunkPos.r);
    const chunk = this.chunks.get(key);

    if (chunk) {
      const blockKey = `${block.position.q},${block.position.r},${block.position.y}`;
      if (!chunk.blockMap.has(blockKey)) {
        chunk.blocks.push(block);
        chunk.blockMap.set(blockKey, block);

        // Recreate meshes for this chunk
        this.removeChunkMeshes(key);
        this.createChunkMeshes(chunk);
      }
    }
  }

  removeBlock(q: number, r: number, y: number): void {
    const worldPos = hexToWorld(q, r, 0);
    const chunkPos = worldToChunk(worldPos.x, worldPos.z, this.chunkSize);
    const key = getChunkKey(chunkPos.q, chunkPos.r);
    const chunk = this.chunks.get(key);

    if (chunk) {
      const blockKey = `${q},${r},${y}`;
      if (chunk.blockMap.has(blockKey)) {
        const block = chunk.blockMap.get(blockKey)!;
        chunk.blockMap.delete(blockKey);
        const index = chunk.blocks.indexOf(block);
        if (index !== -1) {
          chunk.blocks.splice(index, 1);
        }

        // Recreate meshes
        this.removeChunkMeshes(key);
        this.createChunkMeshes(chunk);
      }
    }
  }

  getBlockAt(q: number, r: number, y: number): Block | null {
    const worldPos = hexToWorld(q, r, 0);
    const chunkPos = worldToChunk(worldPos.x, worldPos.z, this.chunkSize);
    const key = getChunkKey(chunkPos.q, chunkPos.r);
    const chunk = this.chunks.get(key);

    if (chunk) {
      return chunk.blockMap.get(`${q},${r},${y}`) || null;
    }
    return null;
  }

  private removeChunkMeshes(key: string): void {
    const meshMap = this.chunkMeshes.get(key);
    if (meshMap) {
      meshMap.forEach(({ mesh }) => {
        this.scene.remove(mesh);
        mesh.dispose();
      });
      this.chunkMeshes.delete(key);
    }
  }

  private unloadDistantChunks(playerChunkQ: number, playerChunkR: number): void {
    const unloadDistance = Math.max(this.renderDistance + 2, 7);
    const keepDistance = this.renderDistance; // Расстояние зоны видимости

    // Функция проверки, находится ли чанк в зоне видимости
    const isInRenderRange = (chunkQ: number, chunkR: number): boolean => {
      const distance = Math.max(
        Math.abs(chunkQ - playerChunkQ),
        Math.abs(chunkR - playerChunkR)
      );
      return distance <= keepDistance;
    };

    // Функция проверки, есть ли соседи чанка в зоне видимости
    const hasNeighborsInRange = (chunkQ: number, chunkR: number): boolean => {
      // Проверяем 6 соседних чанков (гексагональная сетка)
      const neighbors = [
        { q: chunkQ + 1, r: chunkR },
        { q: chunkQ - 1, r: chunkR },
        { q: chunkQ, r: chunkR + 1 },
        { q: chunkQ, r: chunkR - 1 },
        { q: chunkQ + 1, r: chunkR - 1 },
        { q: chunkQ - 1, r: chunkR + 1 }
      ];

      for (const neighbor of neighbors) {
        const neighborKey = getChunkKey(neighbor.q, neighbor.r);
        if (this.chunks.has(neighborKey)) {
          // Если сосед в зоне видимости, этот чанк нужно сохранить
          if (isInRenderRange(neighbor.q, neighbor.r)) {
            return true;
          }
        }
      }
      return false;
    };

    // Сначала удаляем явно дальние чанки, но только если:
    // 1. Они не в зоне видимости
    // 2. У них нет соседей в зоне видимости
    const entries = Array.from(this.chunks.entries()).map(([key, chunk]) => {
      const distance = Math.max(
        Math.abs(chunk.position.q - playerChunkQ),
        Math.abs(chunk.position.r - playerChunkR)
      );
      const inRange = isInRenderRange(chunk.position.q, chunk.position.r);
      const hasNeighbors = hasNeighborsInRange(chunk.position.q, chunk.position.r);
      return { key, chunk, distance, inRange, hasNeighbors };
    });

    entries
      .filter(e => e.distance > unloadDistance && !e.inRange && !e.hasNeighbors)
      .forEach(e => {
        this.removeChunkMeshes(e.key);
        this.chunks.delete(e.key);
      });

    // Если после этого всё ещё превышаем лимит по количеству, удаляем самые дальние,
    // но только те, которые не в зоне видимости и у которых нет соседей в зоне видимости
    if (this.chunks.size > this.maxLoadedChunks) {
      const remaining = Array.from(this.chunks.entries())
        .map(([key, chunk]) => {
          const distance = Math.max(
            Math.abs(chunk.position.q - playerChunkQ),
            Math.abs(chunk.position.r - playerChunkR)
          );
          const inRange = isInRenderRange(chunk.position.q, chunk.position.r);
          const hasNeighbors = hasNeighborsInRange(chunk.position.q, chunk.position.r);
          return { key, distance, inRange, hasNeighbors };
        })
        .filter(e => !e.inRange && !e.hasNeighbors) // Удаляем только те, которые не в зоне и без соседей в зоне
        .sort((a, b) => b.distance - a.distance)
        .slice(0, Math.max(0, this.chunks.size - this.maxLoadedChunks));

      remaining.forEach(e => {
        this.removeChunkMeshes(e.key);
        this.chunks.delete(e.key);
      });
    }
  }

  private forceLoadAround(centerQ: number, centerR: number): void {
    for (let q = centerQ - 1; q <= centerQ + 1; q++) {
      for (let r = centerR - 1; r <= centerR + 1; r++) {
        this.loadChunk(q, r);
      }
    }
  }

  private createFogBarrier(): void {
    const barrierSize = 9 * this.chunkSize * 1.732;
    const geometry = new THREE.BoxGeometry(barrierSize, 100, barrierSize);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.1,
      side: THREE.BackSide,
      depthWrite: false
    });
    this.fogBarrier = new THREE.Mesh(geometry, material);
    this.fogBarrier.position.y = 50;
    this.scene.add(this.fogBarrier);
  }

  private injectFallbackChunk(centerQ: number, centerR: number): void {
    const key = getChunkKey(centerQ, centerR);
    if (this.chunks.has(key)) return;

    const block: Block = {
      type: 'grass',
      position: { q: centerQ * this.chunkSize, r: centerR * this.chunkSize, s: -(centerQ * this.chunkSize + centerR * this.chunkSize), y: 0 }
    };

    const chunk: Chunk = {
      position: { q: centerQ, r: centerR },
      blocks: [block],
      blockMap: new Map<string, Block>([[`${block.position.q},${block.position.r},${block.position.y}`, block]]),
      biome: 'fallback'
    };

    this.chunks.set(key, chunk);
    this.loadAttempts += 1;
    this.fallbackInjected = true;
    this.createChunkMeshes(chunk);

    console.error('[World] Fallback чанк добавлен, так как генерация не дала ни одного чанка');
  }

  private updateFogBarrier(playerX: number, playerZ: number): void {
    if (this.fogBarrier) {
      this.fogBarrier.position.x = playerX;
      this.fogBarrier.position.z = playerZ;
      this.fogBarrier.visible = this.showFogBarrier;
    }
  }

  toggleFogBarrier(): void {
    this.showFogBarrier = !this.showFogBarrier;
    if (this.fogBarrier) {
      this.fogBarrier.visible = this.showFogBarrier;
    }
  }

  getFogBarrierState(): boolean {
    return this.showFogBarrier;
  }

  private updateFogDensity(): void {
    const baseNear = 50 / this.fogDensity;
    const baseFar = 150 / this.fogDensity;
    this.scene.fog = new THREE.Fog(0x87ceeb, baseNear, baseFar);
  }

  getDebugInfo(): {
    seed: number;
    loadedChunks: number;
    meshBatches: number;
    renderDistance: number;
    chunkSize: number;
    maxLoadedChunks: number;
    loadAttempts: number;
    initialized: boolean;
    emergencyAttempts: number;
    maxEmergencyAttempts: number;
  } {
    let meshBatches = 0;
    this.chunkMeshes.forEach(map => {
      meshBatches += map.size;
    });

    return {
      seed: this.generatorSeed,
      loadedChunks: this.chunks.size,
      meshBatches,
      renderDistance: this.renderDistance,
      chunkSize: this.chunkSize,
      maxLoadedChunks: this.maxLoadedChunks,
      loadAttempts: this.loadAttempts,
      initialized: this.initialized,
      emergencyAttempts: this.emergencyAttempts,
      maxEmergencyAttempts: this.maxEmergencyAttempts
    };
  }
}
