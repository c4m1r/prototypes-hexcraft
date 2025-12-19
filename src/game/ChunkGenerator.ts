import { Chunk, Block, BIOMES } from '../types/game';

export class ChunkGenerator {
  private chunkSize: number;
  private seed: number;

  constructor(chunkSize: number = 14, seed: number = Math.floor(Math.random() * 1_000_000_000)) {
    this.chunkSize = chunkSize;
    this.seed = seed;
  }

  generateChunk(chunkQ: number, chunkR: number): Chunk {
    const biome = this.selectBiome(chunkQ, chunkR);
    const blocks: Block[] = [];

    const offsetQ = chunkQ * this.chunkSize;
    const offsetR = chunkR * this.chunkSize;

    for (let q = 0; q < this.chunkSize; q++) {
      for (let r = 0; r < this.chunkSize; r++) {
        const worldQ = offsetQ + q;
        const worldR = offsetR + r;
        const s = -worldQ - worldR;

        const height = this.getHeight(worldQ, worldR, biome);

        for (let y = 0; y < height; y++) {
          const blockType = this.getBlockType(y, height, biome);
          blocks.push({
            type: blockType,
            position: { q: worldQ, r: worldR, s, y }
          });
        }

        if ((biome === 'forest' || biome === 'plains') && height > 0) {
          this.addTree(blocks, worldQ, worldR, s, height, biome);
        }
      }
    }

    const blockMap = new Map<string, Block>();
    blocks.forEach(block => {
      blockMap.set(`${block.position.q},${block.position.r},${block.position.y}`, block);
    });

    return {
      position: { q: chunkQ, r: chunkR },
      blocks,
      blockMap,
      biome
    };
  }

  private selectBiome(chunkQ: number, chunkR: number): string {
    const hash = Math.abs(Math.sin(chunkQ * 12.9898 + chunkR * 78.233 + this.seed) * 43758.5453);
    const index = Math.floor((hash % 1) * BIOMES.length);
    return BIOMES[index];
  }

  private getHeight(q: number, r: number, biome: string): number {
    const noise = this.simpleNoise(q * 0.1, r * 0.1);

    switch (biome) {
      case 'plains':
        return Math.floor(2 + noise * 2);
      case 'forest':
        return Math.floor(3 + noise * 3);
      case 'desert':
        return Math.floor(1 + noise * 2);
      case 'tundra':
        return Math.floor(2 + noise * 1);
      case 'volcano':
        return Math.floor(4 + noise * 5);
      default:
        return 3;
    }
  }

  private getBlockType(y: number, height: number, biome: string): string {
    if (y === height - 1) {
      switch (biome) {
        case 'plains':
          return 'grass';
        case 'forest':
          return 'grass';
        case 'desert':
          return 'sand';
        case 'tundra':
          return 'snow';
        case 'volcano':
          return y > 5 ? 'lava' : 'stone';
        default:
          return 'grass';
      }
    } else if (y >= height - 3) {
      return biome === 'desert' ? 'sand' : 'dirt';
    } else {
      return 'stone';
    }
  }

  private simpleNoise(x: number, y: number): number {
    const sin = Math.sin(x * 12.9898 + y * 78.233 + this.seed) * 43758.5453;
    return (sin - Math.floor(sin));
  }

  getSeed(): number {
    return this.seed;
  }

  private addTree(blocks: Block[], q: number, r: number, s: number, height: number, biome: string): void {
    if (biome === 'forest') {
      const treeChance = this.simpleNoise(q * 0.3, r * 0.3);
      if (treeChance > 0.7) {
        const trunkHeight = 3 + Math.floor(this.simpleNoise(q * 0.7, r * 0.7) * 2);
        const baseY = height;

        for (let i = 0; i < trunkHeight; i++) {
          blocks.push({
            type: 'wood',
            position: { q, r, s, y: baseY + i }
          });
        }

        const foliageRadius = 2;
        const foliageHeight = trunkHeight + 1;
        for (let dq = -foliageRadius; dq <= foliageRadius; dq++) {
          for (let dr = -foliageRadius; dr <= foliageRadius; dr++) {
            const distance = Math.sqrt(dq * dq + dr * dr);
            if (distance <= foliageRadius && !(dq === 0 && dr === 0)) {
              blocks.push({
                type: 'leaves',
                position: { q: q + dq, r: r + dr, s: s - dq - dr, y: baseY + foliageHeight }
              });
            }
          }
        }
      }
    }
  }
}
