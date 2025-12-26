import * as THREE from 'three';
import { Chunk, Block, BLOCK_TYPES } from '../types/game';
import { ChunkGenerator } from './ChunkGenerator';
import { hexToWorld, getChunkKey, worldToChunk, createHexGeometryWithUV, worldToHex, HEX_HEIGHT, HEX_RADIUS } from '../utils/hexUtils';
import { GameSettings, DEFAULT_SETTINGS } from '../types/settings';
import { TextureManager } from './TextureManager';
import { InstancedMeshPool, globalMatrixPool } from '../utils/ObjectPool';

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
  private useTextures: boolean = true;
  private textureManager: TextureManager | null = null;
  private animationTime: number = 0;
  private instancedMeshPool: InstancedMeshPool | null = null;
  
  // Система очереди генерации чанков
  private chunkGenerationQueue: Array<{ q: number; r: number; priority: number }> = [];
  private isGenerating: boolean = false;

  constructor(scene: THREE.Scene, settings?: GameSettings) {
    this.scene = scene;
    const finalSettings = settings || DEFAULT_SETTINGS;
    this.chunkSize = finalSettings.chunkSize;
    this.maxLoadedChunks = finalSettings.maxLoadedChunks;
    this.renderDistance = finalSettings.renderDistance;
    this.fogDensity = finalSettings.fogDensity;
    // По умолчанию текстуры включены (автоматически при старте)
    this.useTextures = true;

    // Чтобы избежать постоянного удаления/добавления чанков, гарантируем,
    // что лимит загруженных чанков покрывает радиус видимости.
    const requiredChunks = 1 + 3 * this.renderDistance * (this.renderDistance + 1); // формула количества гексов в радиусе
    if (this.maxLoadedChunks < requiredChunks) {
      console.warn(
        `[World] maxLoadedChunks повышен ${this.maxLoadedChunks} -> ${requiredChunks} для renderDistance=${this.renderDistance}`
      );
      this.maxLoadedChunks = requiredChunks;
    }

    // Используем seed из настроек, если он указан
    const worldSeed = finalSettings.seed !== undefined ? finalSettings.seed : Math.floor(Math.random() * 1_000_000_000);
    this.generator = new ChunkGenerator(this.chunkSize, worldSeed);
    this.generatorSeed = this.generator.getSeed();

    // Используем ту же геометрию, что и выделение - стандартный CylinderGeometry
    // Это обеспечивает правильное соприкосновение гранями
    // Выделение работает корректно, поэтому используем точно такую же геометрию
    // В новых версиях Three.js CylinderGeometry уже является BufferGeometry
    this.blockGeometry = new THREE.CylinderGeometry(HEX_RADIUS, HEX_RADIUS, HEX_HEIGHT, 6);

    // Загружаем texture manager для работы с текстурами
    this.textureManager = new TextureManager({
      atlasSize: 320,
      tileSize: 32,
      rows: 4,
      cols: 10
    });

    const texturePath = new URL('./texutres.png', import.meta.url).href;
    this.textureManager.loadAtlas(texturePath).then(() => {
      console.log('[World] Textures loaded successfully');
      // Текстуры загружены, инициализируем материалы
      this.initializeMaterials();
    }).catch(err => {
      console.warn('[World] Failed to load textures:', err);
      // Отключаем текстуры если не загрузились, используем цвета
      this.useTextures = false;
      this.initializeMaterials();
    });

    // Initialize object pool for InstancedMesh objects
    this.instancedMeshPool = new InstancedMeshPool(
      this.blockGeometry,
      new THREE.MeshLambertMaterial({ color: 0xffffff }),
      1000, // max instances per mesh
      50    // max pool size
    );

    this.createFogBarrier();
    this.updateFogDensity();
  }

  toggleUseTextures(): void {
    const shouldUseTextures = !this.useTextures;

    console.log(`[World] Switching texture mode: ${shouldUseTextures ? 'textures ON' : 'colors ON'}`);

    // Если текстуры не загружены и пытаемся включить их, ничего не делаем
    if (shouldUseTextures && !this.textureManager?.atlasTexture) {
      console.warn('[World] Cannot enable textures - textures not loaded');
      return;
    }

    this.useTextures = shouldUseTextures;

    // Переинициализируем материалы для нового режима
    this.initializeMaterials();

    // Пересоздаем все видимые меши
    for (const [key, chunk] of this.chunks) {
      this.removeChunkMeshes(key);
      this.createChunkMeshes(chunk);
    }
  }

  private initializeMaterials(): void {
    BLOCK_TYPES.forEach(blockType => {
      // Если текстуры включены и доступны, используем их
      if (this.useTextures && this.textureManager) {
        const material = this.textureManager.createMaterial(blockType.id, this.animationTime, blockType.color);
        if (material) {
          this.materials.set(blockType.id, material);
          return; // Успешно использовали текстуру
        }
      }

      // Fallback на цвета (prototype режим)
      const isLeaves = blockType.id === 'leaves';
      const isWater = blockType.id === 'water';
      const isIce = blockType.id === 'ice';

      // Вода и лед должны быть прозрачными
      const isTransparent = isLeaves || isWater || isIce;
      let opacity = 1;
      if (isLeaves) opacity = 0.75;
      else if (isWater) opacity = 0.7;
      else if (isIce) opacity = 0.9;

      this.materials.set(
        blockType.id,
        new THREE.MeshLambertMaterial({
          color: blockType.color,
          transparent: isTransparent,
          opacity: opacity,
          side: THREE.DoubleSide // Всегда DoubleSide для консистентности
        })
      );
    });
  }

  initialize(): void {
    console.info(
      `[World] init seed=${this.generatorSeed} chunkSize=${this.chunkSize} renderDistance=${this.renderDistance} maxLoaded=${this.maxLoadedChunks}`
    );
    this.initialized = true;
    // НЕ генерируем чанки здесь - это будет сделано через initializeAsync
  }

  async initializeAsync(): Promise<void> {
    // Метод оставлен для совместимости, но больше не генерирует специальный чанк (0,0)
    // Чанки будут генерироваться естественным образом через update() и requestChunk()
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  }

  // КРИТИЧНО: update() может только запрашивать чанки, но не генерировать их
  update(playerX: number, playerZ: number): void {
    const playerChunk = worldToChunk(playerX, playerZ, this.chunkSize);

    if (this.chunks.size === 0) {
      console.warn('[World] Нет загруженных чанков');
      if (this.emergencyAttempts < this.maxEmergencyAttempts) {
        // Запрашиваем чанки вокруг игрока с высоким приоритетом
        for (let q = playerChunk.q - 1; q <= playerChunk.q + 1; q++) {
          for (let r = playerChunk.r - 1; r <= playerChunk.r + 1; r++) {
            this.requestChunk(q, r, 100); // Высокий приоритет для аварийной загрузки
          }
        }
        this.emergencyAttempts += 1;
      } else if (!this.stopEmergencyLogs) {
        console.error('[World] Достигнут лимит попыток загрузки чанков');
        this.stopEmergencyLogs = true;
        if (!this.fallbackInjected) {
          this.injectFallbackChunk(playerChunk.q, playerChunk.r);
        }
      }

      if (this.emergencyAttempts >= this.maxEmergencyAttempts) {
        this.updateFogBarrier(playerX, playerZ);
        return;
      }
    } else {
      this.emergencyAttempts = 0;
      this.stopEmergencyLogs = false;
    }

    // Запрашиваем чанки вокруг игрока (но не генерируем их здесь)
    // Генерация происходит в отдельном процессе через очередь
    for (let q = playerChunk.q - this.renderDistance; q <= playerChunk.q + this.renderDistance; q++) {
      for (let r = playerChunk.r - this.renderDistance; r <= playerChunk.r + this.renderDistance; r++) {
        // Приоритет зависит от расстояния до игрока (ближе = выше приоритет)
        const distance = Math.max(Math.abs(q - playerChunk.q), Math.abs(r - playerChunk.r));
        const priority = this.renderDistance - distance;
        this.requestChunk(q, r, priority);
      }
    }

    this.unloadDistantChunks(playerChunk.q, playerChunk.r);
    this.updateFogBarrier(playerX, playerZ);

    // Обновление анимации текстур (если текстуры включены)
    if (this.useTextures && this.textureManager) {
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

  // КРИТИЧНО: update() может только запрашивать чанки, но не генерировать их
  requestChunk(chunkQ: number, chunkR: number, priority: number = 0): void {
    const key = getChunkKey(chunkQ, chunkR);
    if (this.chunks.has(key)) return;
    
    // Проверяем, не запрошен ли уже этот чанк
    const alreadyQueued = this.chunkGenerationQueue.some(item => item.q === chunkQ && item.r === chunkR);
    if (alreadyQueued) return;
    
    // Добавляем в очередь генерации
    this.chunkGenerationQueue.push({ q: chunkQ, r: chunkR, priority });
    this.chunkGenerationQueue.sort((a, b) => b.priority - a.priority); // Сортируем по приоритету
    
    // Запускаем процесс генерации если он еще не запущен
    if (!this.isGenerating) {
      this.startGenerationLoop();
    }
  }

  private startGenerationLoop(): void {
    if (this.isGenerating) return;
    this.isGenerating = true;
    this.processGenerationQueue();
  }

  private async processGenerationQueue(): Promise<void> {
    while (this.chunkGenerationQueue.length > 0) {
      // Берем чанк с наивысшим приоритетом
      const request = this.chunkGenerationQueue.shift();
      if (!request) break;
      
      const { q, r } = request;
      const key = getChunkKey(q, r);
      
      // Проверяем, не загружен ли уже чанк
      if (this.chunks.has(key)) continue;
      
      // Yield к браузеру перед генерацией каждого чанка
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      
      // Генерируем чанк полностью синхронно
      const chunk = this.generator.generateChunk(q, r);
      
      // Добавляем чанк в мир только после полной генерации
      this.chunks.set(key, chunk);
      this.loadAttempts += 1;
      this.createChunkMeshes(chunk);
      
      if (chunk.blocks.length === 0) {
        console.warn(`[World] Пустой чанк ${key} biome=${chunk.biome}`);
      } else {
        console.debug(`[World] Чанк ${key} biome=${chunk.biome} blocks=${chunk.blocks.length}`);
      }
    }
    
    this.isGenerating = false;
  }

  private createChunkMeshes(chunk: Chunk): void {
    const key = getChunkKey(chunk.position.q, chunk.position.r);

    // Group blocks by type
    // Оптимизация: для очень больших чанков пропускаем создание мешей
    // Они будут созданы в следующем кадре через асинхронную загрузку
    const maxBlocksForMeshCreation = 10000; // Максимум блоков для создания мешей за кадр
    
    if (chunk.blocks.length > maxBlocksForMeshCreation) {
      // Пропускаем создание мешей если слишком много блоков
      // Это предотвратит блокировку UI
      console.warn(`[World] Пропуск создания мешей для чанка ${key}: слишком много блоков (${chunk.blocks.length})`);
      return;
    }
    
    // Оптимизация: фильтруем полностью скрытые блоки
    // Блоки, которые полностью закрыты со всех сторон, не отображаются
    // Исключение: жидкости и листва всегда отображаются
    // Используем предвычисленную видимость из чанка, если доступна
    let visibleBlocks: Block[];
    if (chunk.visibleBlocks) {
      // Используем предвычисленную видимость (быстрее)
      visibleBlocks = chunk.blocks.filter(block => {
        const blockKey = `${block.position.q},${block.position.r},${block.position.y}`;
        return chunk.visibleBlocks!.has(blockKey);
      });
      
      // Дополнительная проверка для граничных блоков (могут иметь соседей в других чанках)
      visibleBlocks = visibleBlocks.filter(block => {
        return this.isBlockVisibleOptimized(block, chunk, key);
      });
    } else {
      // Fallback на старый метод (для обратной совместимости)
      visibleBlocks = chunk.blocks.filter(block => {
        return this.isBlockVisible(block, chunk, key);
      });
    }
    
    const blocksByType = new Map<string, Block[]>();
    visibleBlocks.forEach(block => {
      if (!blocksByType.has(block.type)) {
        blocksByType.set(block.type, []);
      }
      blocksByType.get(block.type)!.push(block);
    });

    const chunkMeshMap = new Map<string, ChunkMeshData>();

    // Обрабатываем типы блоков по одному для предотвращения блокировки
    // Ограничиваем количество типов блоков за кадр
    const maxTypesPerFrame = 15; // Максимум типов блоков за кадр
    let processedTypes = 0;
    
    for (const [type, blocks] of blocksByType.entries()) {
      if (processedTypes >= maxTypesPerFrame) {
        // Пропускаем остальные типы если слишком много
        // Они будут обработаны в следующем кадре
        break;
      }
      
      const material = this.materials.get(type);
      if (!material) continue;

      // Материалы уже настроены в initializeMaterials() в зависимости от useTextures

      // Use pooled InstancedMesh for better performance
      const mesh = this.instancedMeshPool!.get();
      mesh.geometry = this.blockGeometry;
      mesh.material = material;
      mesh.count = blocks.length;
      // Инстансы расположены далеко от (0,0,0), без этого boundingSphere отсечет их.
      mesh.frustumCulled = false;

      const matrix = globalMatrixPool.get();

      // Обрабатываем все блоки этого типа, но проверяем время выполнения
      for (let index = 0; index < blocks.length; index++) {
        const block = blocks[index];
        const worldPos = hexToWorld(block.position.q, block.position.r, block.position.y);
        // Убеждаемся, что матрица сброшена (без поворотов)
        matrix.identity();
        matrix.setPosition(worldPos);
        mesh.setMatrixAt(index, matrix);
      }

      mesh.instanceMatrix.needsUpdate = true;

      // Return matrix to pool
      globalMatrixPool.release(matrix);

      mesh.userData = {
        chunkKey: key,
        blockType: type,
        blocks: blocks
      };

      this.scene.add(mesh);
      chunkMeshMap.set(type, { mesh, blocks });
      processedTypes++;
    }

    this.chunkMeshes.set(key, chunkMeshMap);
  }

  // Оптимизированная проверка видимости: проверяет только граничные блоки (соседи в других чанках)
  private isBlockVisibleOptimized(block: Block, chunk: Chunk, chunkKey: string): boolean {
    // Если блок уже помечен как видимый в чанке, проверяем только граничные случаи
    const blockKey = `${block.position.q},${block.position.r},${block.position.y}`;
    if (!chunk.visibleBlocks?.has(blockKey)) {
      return false; // Блок уже помечен как невидимый
    }
    
    // Проверяем только граничные блоки (могут иметь соседей в других чанках)
    const localQ = block.position.q - Math.floor(block.position.q / this.chunkSize) * this.chunkSize;
    const localR = block.position.r - Math.floor(block.position.r / this.chunkSize) * this.chunkSize;
    
    // Если блок не на границе чанка, он уже проверен
    const isOnBorder = localQ === 0 || localQ === this.chunkSize - 1 || 
                      localR === 0 || localR === this.chunkSize - 1 ||
                      block.position.y === 0 || block.position.y === 31;
    
    if (!isOnBorder) {
      return true; // Блок внутри чанка, уже проверен
    }
    
    // Для граничных блоков проверяем соседние чанки
    return this.isBlockVisible(block, chunk, chunkKey);
  }

  // Проверка видимости блока: блок видим если хотя бы одна грань не закрыта
  private isBlockVisible(block: Block, chunk: Chunk, chunkKey: string): boolean {
    // Жидкости и листва всегда видимы
    const alwaysVisibleTypes = new Set(['water', 'lava', 'ice', 'leaves']);
    if (alwaysVisibleTypes.has(block.type)) {
      return true;
    }

    // Получаем все соседние позиции в гексагональной сетке
    // В гексагональной сетке у каждого блока 6 соседей в плоскости + вверх/вниз = 8 соседей
    const neighbors = [
      // Вверх
      { q: block.position.q, r: block.position.r, y: block.position.y + 1 },
      // Вниз
      { q: block.position.q, r: block.position.r, y: block.position.y - 1 },
      // 6 соседей в плоскости (гексагональная сетка)
      { q: block.position.q + 1, r: block.position.r, y: block.position.y },
      { q: block.position.q - 1, r: block.position.r, y: block.position.y },
      { q: block.position.q, r: block.position.r + 1, y: block.position.y },
      { q: block.position.q, r: block.position.r - 1, y: block.position.y },
      { q: block.position.q + 1, r: block.position.r - 1, y: block.position.y },
      { q: block.position.q - 1, r: block.position.r + 1, y: block.position.y }
    ];

    // Проверяем наличие соседей
    let visibleFaces = 0;
    for (const neighbor of neighbors) {
      const neighborKey = `${neighbor.q},${neighbor.r},${neighbor.y}`;
      
      // Проверяем в текущем чанке
      let hasNeighbor = chunk.blockMap.has(neighborKey);
      
      // Если сосед не найден в текущем чанке, проверяем соседние чанки
      if (!hasNeighbor) {
        // Определяем в каком чанке находится сосед напрямую из hex координат
        const neighborChunkQ = Math.floor(neighbor.q / this.chunkSize);
        const neighborChunkR = Math.floor(neighbor.r / this.chunkSize);
        const neighborChunkKey = getChunkKey(neighborChunkQ, neighborChunkR);
        
        // Если это другой чанк, проверяем его
        if (neighborChunkKey !== chunkKey) {
          const neighborChunk = this.chunks.get(neighborChunkKey);
          if (neighborChunk) {
            hasNeighbor = neighborChunk.blockMap.has(neighborKey);
          }
          // Если соседний чанк не загружен, считаем что сосед отсутствует (грань видима)
          // Это безопасно, так как когда чанк загрузится, меши будут пересозданы
        }
      }
      
      // Если сосед не найден, эта грань видима
      if (!hasNeighbor) {
        visibleFaces++;
      }
    }

    // Блок видим если хотя бы одна грань не закрыта
    // Если все 8 соседей присутствуют, блок полностью скрыт и не должен рендериться
    return visibleFaces > 0;
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
        // ОПТИМИЗАЦИЯ: Используем карту высот из чанка, если доступна
        const posKey = `${q},${r}`;
        if (chunk.heightMap && chunk.heightMap.has(posKey)) {
          const heightY = chunk.heightMap.get(posKey)!;
          const blockPos = hexToWorld(q, r, heightY);
          const dist = Math.sqrt(Math.pow(blockPos.x - x, 2) + Math.pow(blockPos.z - z, 2));
          
          if (dist < 2) {
            maxHeight = Math.max(maxHeight, blockPos.y + 0.5);
            continue;
          }
        }
        
        // Fallback на старый метод (для обратной совместимости)
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

  getBiomeAt(x: number, z: number): string | null {
    const chunkPos = worldToChunk(x, z, this.chunkSize);
    const key = getChunkKey(chunkPos.q, chunkPos.r);
    const chunk = this.chunks.get(key);
    return chunk ? chunk.biome : null;
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

  removeBlock(q: number, r: number, y: number): Block | null {
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

        // Обновляем состояние видимости для соседних блоков
        this.updateBlockVisibilityAfterRemoval(chunk, q, r, y);

        // Recreate meshes
        this.removeChunkMeshes(key);
        this.createChunkMeshes(chunk);

        return block;
      }
    }
    return null;
  }

  private updateBlockVisibilityAfterRemoval(chunk: Chunk, removedQ: number, removedR: number, removedY: number): void {
    // Получаем всех соседей удаленного блока (6 в плоскости + 2 по вертикали)
    const neighbors = [
      // В плоскости (гексагональные соседи)
      { q: removedQ + 1, r: removedR, y: removedY },
      { q: removedQ - 1, r: removedR, y: removedY },
      { q: removedQ, r: removedR + 1, y: removedY },
      { q: removedQ, r: removedR - 1, y: removedY },
      { q: removedQ + 1, r: removedR - 1, y: removedY },
      { q: removedQ - 1, r: removedR + 1, y: removedY },
      // По вертикали
      { q: removedQ, r: removedR, y: removedY + 1 },
      { q: removedQ, r: removedR, y: removedY - 1 }
    ];

    // Проверяем каждый соседний блок и обновляем его видимость
    for (const neighbor of neighbors) {
      const neighborBlock = this.getBlockAt(neighbor.q, neighbor.r, neighbor.y);
      if (neighborBlock) {
        const blockKey = `${neighbor.q},${neighbor.r},${neighbor.y}`;
        const isVisible = this.isBlockVisible(neighborBlock, chunk, getChunkKey(chunk.position.q, chunk.position.r));

        // Обновляем состояние видимости
        if (isVisible) {
          chunk.visibleBlocks?.add(blockKey);
        } else {
          chunk.visibleBlocks?.delete(blockKey);
        }
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
        // Return mesh to pool instead of disposing
        this.instancedMeshPool!.release(mesh);
      });
      this.chunkMeshes.delete(key);
    }
  }

  private unloadDistantChunks(playerChunkQ: number, playerChunkR: number): void {
    // Оптимизация: ограничиваем количество обрабатываемых чанков за кадр
    // Пропускаем работу если слишком много чанков для обработки
    const maxChunksToProcess = 20; // Максимум чанков для проверки за кадр
    
    if (this.chunks.size > maxChunksToProcess * 2) {
      // Слишком много чанков - пропускаем выгрузку в этом кадре
      // Она будет выполнена в следующем кадре
      return;
    }
    
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
    // Ограничиваем количество обрабатываемых записей
    const entries = Array.from(this.chunks.entries())
      .slice(0, maxChunksToProcess)
      .map(([key, chunk]) => {
        const distance = Math.max(
          Math.abs(chunk.position.q - playerChunkQ),
          Math.abs(chunk.position.r - playerChunkR)
        );
        const inRange = isInRenderRange(chunk.position.q, chunk.position.r);
        const hasNeighbors = hasNeighborsInRange(chunk.position.q, chunk.position.r);
        return { key, chunk, distance, inRange, hasNeighbors };
      });

    // Ограничиваем количество удаляемых чанков за кадр
    const chunksToUnload = entries
      .filter(e => e.distance > unloadDistance && !e.inRange && !e.hasNeighbors)
      .slice(0, 5); // Максимум 5 чанков за кадр
      
    chunksToUnload.forEach(e => {
      this.removeChunkMeshes(e.key);
      this.chunks.delete(e.key);
    });

    // Если после этого всё ещё превышаем лимит по количеству, удаляем самые дальние,
    // но только те, которые не в зоне видимости и у которых нет соседей в зоне видимости
    if (this.chunks.size > this.maxLoadedChunks) {
      const remaining = Array.from(this.chunks.entries())
        .slice(0, maxChunksToProcess)
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
        .slice(0, Math.min(5, Math.max(0, this.chunks.size - this.maxLoadedChunks))); // Максимум 5 за кадр

      remaining.forEach(e => {
        this.removeChunkMeshes(e.key);
        this.chunks.delete(e.key);
      });
    }
  }

  private forceLoadAround(centerQ: number, centerR: number): void {
    // Запрашиваем чанки вокруг центра с высоким приоритетом
    for (let q = centerQ - 1; q <= centerQ + 1; q++) {
      for (let r = centerR - 1; r <= centerR + 1; r++) {
        this.requestChunk(q, r, 100); // Высокий приоритет для аварийной загрузки
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

  getFogDensity(): number {
    return this.fogDensity;
  }

  setFogDensity(density: number): void {
    this.fogDensity = density;
    this.updateFogDensity();
  }

  private updateFogDensity(): void {
    const baseNear = 50 / this.fogDensity;
    const baseFar = 150 / this.fogDensity;
    this.scene.fog = new THREE.Fog(0x87ceeb, baseNear, baseFar);
  }

  getHighestBlockAt(q: number, r: number): number | null {
    // ОПТИМИЗАЦИЯ: Используем карту высот из чанка, если доступна
    const chunkQ = Math.floor(q / this.chunkSize);
    const chunkR = Math.floor(r / this.chunkSize);
    const key = getChunkKey(chunkQ, chunkR);
    const chunk = this.chunks.get(key);
    
    if (!chunk) {
      return null;
    }
    
    // Используем предвычисленную карту высот
    if (chunk.heightMap) {
      const posKey = `${q},${r}`;
      const heightY = chunk.heightMap.get(posKey);
      if (heightY !== undefined) {
        const blockPos = hexToWorld(q, r, heightY);
        return blockPos.y;
      }
    }
    
    // Fallback на старый метод (для обратной совместимости)

    // Ищем самый высокий блок в этой позиции (не считая проходимые блоки)
    let highestY = -1;
    for (let y = 32; y >= 0; y--) {
      const blockKey = `${q},${r},${y}`;
      const block = chunk.blockMap.get(blockKey);
      
      if (block && !this.isPassable(block.type)) {
        highestY = y;
        break;
      }
    }

    if (highestY === -1) {
      return null;
    }

    // Конвертируем в мировые координаты
    const worldPosWithHeight = hexToWorld(q, r, highestY);
    return worldPosWithHeight.y + HEX_HEIGHT; // Возвращаем верхнюю точку блока
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
