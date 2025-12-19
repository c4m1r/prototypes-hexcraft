import * as THREE from 'three';
import { Chunk, Block, BLOCK_TYPES } from '../types/game';
import { ChunkGenerator } from './ChunkGenerator';
import { hexToWorld, getChunkKey, worldToChunk, createHexGeometry, worldToHex } from '../utils/hexUtils';
import { GameSettings, DEFAULT_SETTINGS } from '../types/settings';

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

  constructor(scene: THREE.Scene, settings?: GameSettings) {
    this.scene = scene;
    const finalSettings = settings || DEFAULT_SETTINGS;
    this.chunkSize = finalSettings.chunkSize;
    this.maxLoadedChunks = finalSettings.maxLoadedChunks;
    this.renderDistance = finalSettings.renderDistance;
    this.fogDensity = finalSettings.fogDensity;

    this.generator = new ChunkGenerator(this.chunkSize);
    this.generatorSeed = this.generator.getSeed();
    this.blockGeometry = createHexGeometry();

    BLOCK_TYPES.forEach(blockType => {
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
    });

    this.createFogBarrier();
    this.updateFogDensity();
  }

  initialize(): void {
    console.info(
      `[World] init seed=${this.generatorSeed} chunkSize=${this.chunkSize} renderDistance=${this.renderDistance} maxLoaded=${this.maxLoadedChunks}`
    );
    for (let q = -1; q <= 1; q++) {
      for (let r = -1; r <= 1; r++) {
        this.loadChunk(q, r);
      }
    }
  }

  update(playerX: number, playerZ: number): void {
    const playerChunk = worldToChunk(playerX, playerZ, this.chunkSize);

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
  }

  private loadChunk(chunkQ: number, chunkR: number): void {
    const key = getChunkKey(chunkQ, chunkR);
    if (this.chunks.has(key)) return;

    const chunk = this.generator.generateChunk(chunkQ, chunkR);
    this.chunks.set(key, chunk);

    this.createChunkMeshes(chunk);

    if (chunk.blocks.length === 0) {
      console.warn(`[World] Пустой чанк ${key} biome=${chunk.biome}`);
    } else {
      console.debug(`[World] Чанк ${key} biome=${chunk.biome} blocks=${chunk.blocks.length}`);
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
      const material = this.materials.get(type);
      if (!material) return;

      const mesh = new THREE.InstancedMesh(this.blockGeometry, material, blocks.length);
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
        // Check height at this q,r
        for (let y = 32; y >= 0; y--) {
          if (chunk.blockMap.has(`${q},${r},${y}`)) {
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
    const chunksToRemove: string[] = [];

    this.chunks.forEach((chunk, key) => {
      const distance = Math.max(
        Math.abs(chunk.position.q - playerChunkQ),
        Math.abs(chunk.position.r - playerChunkR)
      );

      if (distance > 7 || this.chunks.size > this.maxLoadedChunks) {
        chunksToRemove.push(key);
      }
    });

    chunksToRemove.forEach(key => {
      this.removeChunkMeshes(key);
      this.chunks.delete(key);
    });
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
      maxLoadedChunks: this.maxLoadedChunks
    };
  }
}
