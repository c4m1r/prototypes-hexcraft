import { Chunk, Block } from '../types/game';

interface BiomeConfig {
  surfaceBlock: string;
  subsurfaceLayers: { depth: number; block: string }[];
  structures: string[];
  minHeight: number;
  maxHeight: number;
  heightVariation: number;
}

export interface GenerationConfig {
  // Общие параметры
  enableOreGeneration: boolean;
  enableCaves: boolean;
  enableLiquids: boolean;
  enableStructures: boolean;

  // Параметры руды
  oreGeneration: {
    enabled: boolean;
    bronzeChance: number;
    silverChance: number;
    goldChance: number;
    minDepthFactor: number;
  };

  // Параметры пещер
  caves: {
    enabled: boolean;
    threshold: number;
    depthFactor: number;
    expansionRadius: number;
  };

  // Параметры жидкостей
  liquids: {
    enabled: boolean;
    waterChance: number;
    lavaChance: number;
  };

  // Параметры структур
  structures: {
    enabled: boolean;
    trees: {
      enabled: boolean;
      chance: number;
      minHeight: number;
      maxHeight: number;
      canopyRadius: number;
    };
    mushrooms: {
      enabled: boolean;
      chance: number;
    };
  };

  // Параметры оптимизации
  optimization: {
    maxBlocksPerChunk: number;
    skipFloatingBlockValidation: boolean;
  };
}

const DEFAULT_GENERATION_CONFIG: GenerationConfig = {
  enableOreGeneration: true,
  enableCaves: false,
  enableLiquids: true,
  enableStructures: true,

  oreGeneration: {
    enabled: true,
    bronzeChance: 0.40,
    silverChance: 0.20,
    goldChance: 0.15,
    minDepthFactor: 0.1
  },

  caves: {
    enabled: false,
    threshold: 0.4,
    depthFactor: 0.2,
    expansionRadius: 1
  },

  liquids: {
    enabled: true,
    waterChance: 0.3,
    lavaChance: 0.05
  },

  structures: {
    enabled: true,
    trees: {
      enabled: true,
      chance: 0.12,
      minHeight: 4,
      maxHeight: 7,
      canopyRadius: 2
    },
    mushrooms: {
      enabled: true,
      chance: 0.07
    }
  },

  optimization: {
    maxBlocksPerChunk: 50000,
    skipFloatingBlockValidation: false
  }
};

export class ChunkGenerator {
  private chunkSize: number;
  private seed: number;
  private biomeConfigs: Map<string, BiomeConfig> = new Map();
  private readonly BIOME_SIZE = 72;
  private config: GenerationConfig;

  constructor(
    chunkSize: number = 14,
    seed: number = Math.floor(Math.random() * 1_000_000_000),
    config?: Partial<GenerationConfig>
  ) {
    this.chunkSize = chunkSize;
    this.seed = seed;
    this.config = { ...DEFAULT_GENERATION_CONFIG, ...config };
    this.setupBiomeConfigs();
  }

  private setupBiomeConfigs(): void {
    this.biomeConfigs.set('grassland', {
      surfaceBlock: 'grass',
      subsurfaceLayers: [
        { depth: 1, block: 'grass' },
        { depth: 3, block: 'dirt' },
        { depth: Infinity, block: 'stone' }
      ],
      structures: ['tree', 'mushroom'],
      minHeight: 8,
      maxHeight: 16,
      heightVariation: 6
    });

    this.biomeConfigs.set('desert', {
      surfaceBlock: 'sand',
      subsurfaceLayers: [
        { depth: 4, block: 'sand' },
        { depth: Infinity, block: 'stone' }
      ],
      structures: [],
      minHeight: 6,
      maxHeight: 12,
      heightVariation: 4
    });

    this.biomeConfigs.set('snow', {
      surfaceBlock: 'snow',
      subsurfaceLayers: [
        { depth: 3, block: 'snow' },
        { depth: Infinity, block: 'stone' }
      ],
      structures: [],
      minHeight: 7,
      maxHeight: 14,
      heightVariation: 5
    });

    this.biomeConfigs.set('frozen', {
      surfaceBlock: 'ice',
      subsurfaceLayers: [
        { depth: 3, block: 'ice' },
        { depth: Infinity, block: 'stone' }
      ],
      structures: [],
      minHeight: 6,
      maxHeight: 12,
      heightVariation: 4
    });

    this.biomeConfigs.set('stone', {
      surfaceBlock: 'stone',
      subsurfaceLayers: [
        { depth: Infinity, block: 'stone' }
      ],
      structures: [],
      minHeight: 12,
      maxHeight: 24,
      heightVariation: 8
    });
  }

  generateChunk(chunkQ: number, chunkR: number): Chunk {
    const blocks: Block[] = [];
    const offsetQ = chunkQ * this.chunkSize;
    const offsetR = chunkR * this.chunkSize;
    const maxY = 32;
    const baseStoneDepth = 5;

    // Карта высот с сглаживанием
    const heightMap = new Map<string, number>();
    const biomeMap = new Map<string, string>();

    for (let q = 0; q < this.chunkSize; q++) {
      for (let r = 0; r < this.chunkSize; r++) {
        const worldQ = offsetQ + q;
        const worldR = offsetR + r;

        const biome = this.selectBiomeRegion(worldQ, worldR);
        biomeMap.set(`${q},${r}`, biome);

        const biomeConfig = this.biomeConfigs.get(biome)!;
        const surfaceHeight = this.getSurfaceHeight(worldQ, worldR, biomeConfig);
        heightMap.set(`${q},${r}`, surfaceHeight);
      }
    }

    // Сглаживание высот
    const smoothedHeightMap = new Map<string, number>();
    for (let q = 0; q < this.chunkSize; q++) {
      for (let r = 0; r < this.chunkSize; r++) {
        const currentHeight = heightMap.get(`${q},${r}`) || baseStoneDepth + 5;
        const neighborHeights: number[] = [currentHeight];

        const neighbors = [
          { q: q - 1, r: r }, { q: q + 1, r: r },
          { q: q, r: r - 1 }, { q: q, r: r + 1 },
          { q: q + 1, r: r - 1 }, { q: q - 1, r: r + 1 }
        ];

        for (const neighbor of neighbors) {
          if (neighbor.q >= 0 && neighbor.q < this.chunkSize &&
              neighbor.r >= 0 && neighbor.r < this.chunkSize) {
            const neighborHeight = heightMap.get(`${neighbor.q},${neighbor.r}`);
            if (neighborHeight !== undefined) {
              neighborHeights.push(neighborHeight);
            }
          }
        }

        const avgHeight = Math.round(
          neighborHeights.reduce((sum, h) => sum + h, 0) / neighborHeights.length
        );
        smoothedHeightMap.set(`${q},${r}`, avgHeight);
      }
    }

    // Заполнение мира
    for (let q = 0; q < this.chunkSize; q++) {
      for (let r = 0; r < this.chunkSize; r++) {
        const worldQ = offsetQ + q;
        const worldR = offsetR + r;
        const s = -worldQ - worldR;
        const surfaceHeight = smoothedHeightMap.get(`${q},${r}`) || baseStoneDepth + 5;

        for (let y = 0; y <= surfaceHeight && y < maxY; y++) {
          blocks.push({
            type: 'dirt',
            position: { q: worldQ, r: worldR, s, y }
          });
        }
      }
    }

    // Каменный слой
    const blockMap = new Map<string, Block>();
    blocks.forEach(block => {
      const key = `${block.position.q},${block.position.r},${block.position.y}`;
      blockMap.set(key, block);
    });

    for (let q = 0; q < this.chunkSize; q++) {
      for (let r = 0; r < this.chunkSize; r++) {
        const worldQ = offsetQ + q;
        const worldR = offsetR + r;

        for (let y = 0; y <= baseStoneDepth && y < maxY; y++) {
          const blockKey = `${worldQ},${worldR},${y}`;
          const block = blockMap.get(blockKey);
          if (block) {
            block.type = 'stone';
          }
        }
      }
    }

    // Генерация руды
    if (this.config.enableOreGeneration && this.config.oreGeneration.enabled) {
      for (let q = 0; q < this.chunkSize; q++) {
        for (let r = 0; r < this.chunkSize; r++) {
          const worldQ = offsetQ + q;
          const worldR = offsetR + r;

          for (let y = 0; y <= baseStoneDepth && y < maxY; y++) {
            const blockKey = `${worldQ},${worldR},${y}`;
            const block = blockMap.get(blockKey);

            if (!block || block.type !== 'stone') continue;

            const maxDepth = baseStoneDepth;
            const depthFactor = (maxDepth - y) / maxDepth;

            const baseBronzeChance = this.config.oreGeneration.bronzeChance;
            const baseSilverChance = this.config.oreGeneration.silverChance;
            const baseGoldChance = this.config.oreGeneration.goldChance;
            const baseOreChance = baseBronzeChance + baseSilverChance + baseGoldChance;
            const minDepthFactor = this.config.oreGeneration.minDepthFactor;

            const oreChance = baseOreChance * (minDepthFactor + (1 - minDepthFactor) * depthFactor);
            const bronzeChance = baseBronzeChance * (minDepthFactor + (1 - minDepthFactor) * depthFactor);
            const silverChance = baseSilverChance * (minDepthFactor + (1 - minDepthFactor) * depthFactor);

            const oreNoise = this.simpleNoise(worldQ * 0.1, worldR * 0.1 + y * 0.2);

            if (oreNoise <= oreChance) {
              const normalizedOreNoise = oreNoise / oreChance;
              const bronzeRatio = bronzeChance / oreChance;
              const silverRatio = silverChance / oreChance;

              if (normalizedOreNoise <= bronzeRatio) {
                block.type = 'bronze';
              } else if (normalizedOreNoise <= bronzeRatio + silverRatio) {
                block.type = 'silver';
              } else {
                block.type = 'gold';
              }
            }
          }
        }
      }
    }

    // Поверхностные слои
    for (let q = 0; q < this.chunkSize; q++) {
      for (let r = 0; r < this.chunkSize; r++) {
        const worldQ = offsetQ + q;
        const worldR = offsetR + r;
        const s = -worldQ - worldR;
        const biome = biomeMap.get(`${q},${r}`)!;
        const biomeConfig = this.biomeConfigs.get(biome)!;
        const surfaceHeight = smoothedHeightMap.get(`${q},${r}`)!;

        for (let y = baseStoneDepth + 1; y <= surfaceHeight && y < maxY; y++) {
          const blockKey = `${worldQ},${worldR},${y}`;
          const block = blockMap.get(blockKey);

          if (!block) continue;

          const depthFromSurface = surfaceHeight - y;
          let blockType = 'dirt';

          if (y === surfaceHeight) {
            blockType = biomeConfig.surfaceBlock;
          } else {
            for (const layer of biomeConfig.subsurfaceLayers) {
              if (depthFromSurface < layer.depth) {
                blockType = layer.block;
                break;
              }
            }
          }

          block.type = blockType;
        }

        // Дополнительный grass блок
        if (biomeConfig.surfaceBlock === 'grass') {
          const surfaceBlockKey = `${worldQ},${worldR},${surfaceHeight}`;
          const surfaceBlock = blockMap.get(surfaceBlockKey);

          if (surfaceBlock && surfaceBlock.type === 'grass') {
            const grassAboveY = surfaceHeight + 1;
            if (grassAboveY < maxY) {
              const grassAboveKey = `${worldQ},${worldR},${grassAboveY}`;
              if (!blockMap.has(grassAboveKey)) {
                const grassAboveBlock: Block = {
                  type: 'grass',
                  position: { q: worldQ, r: worldR, s, y: grassAboveY }
                };
                blocks.push(grassAboveBlock);
                // Важно: добавляем блок в blockMap сразу, чтобы дерево видело его
                blockMap.set(grassAboveKey, grassAboveBlock);
              }
            }
          }
        }
      }
    }

    // Структуры
    if (this.config.enableStructures && this.config.structures.enabled) {
      const structureMap = new Set<string>();

      for (let q = 0; q < this.chunkSize; q++) {
        for (let r = 0; r < this.chunkSize; r++) {
          const worldQ = offsetQ + q;
          const worldR = offsetR + r;
          const biome = biomeMap.get(`${q},${r}`)!;
          const surfaceHeight = smoothedHeightMap.get(`${q},${r}`)!;

          const structureKey = `${worldQ},${worldR}`;
          if (structureMap.has(structureKey)) continue;

          if (biome === 'grassland') {
            const surfaceBlockKey = `${worldQ},${worldR},${surfaceHeight}`;
            const surfaceBlock = blockMap.get(surfaceBlockKey);

            if (surfaceBlock && surfaceBlock.type === 'grass') {
              const treeNoise = this.simpleNoise(worldQ * 0.1, worldR * 0.1);
              const treeProbability = Math.max(0.05, this.config.structures.trees.chance * 0.3);

              if (treeNoise > (1 - treeProbability)) {
                // Генерируем дерево с многослойным навесом
                const heightRange = this.config.structures.trees.maxHeight - this.config.structures.trees.minHeight;
                const trunkHeight = this.config.structures.trees.minHeight + Math.floor(this.simpleNoise(worldQ * 0.2, worldR * 0.2) * heightRange);

                // Ствол начинается с surfaceHeight + 1 (над поверхностью)
                // Но нужно проверить, нет ли там дополнительного grass блока
                const treeStartY = surfaceHeight + 1;
                
                // Если на treeStartY уже есть блок (например, дополнительный grass), начинаем с treeStartY + 1
                const treeStartKey = `${worldQ},${worldR},${treeStartY}`;
                const actualStartY = blockMap.has(treeStartKey) ? treeStartY + 1 : treeStartY;

                // Ствол
                for (let i = 0; i < trunkHeight && actualStartY + i < maxY; i++) {
                  const trunkY = actualStartY + i;
                  const trunkKey = `${worldQ},${worldR},${trunkY}`;

                  if (!blockMap.has(trunkKey)) {
                    blocks.push({
                      type: 'wood',
                      position: { q: worldQ, r: worldR, s: -worldQ - worldR, y: trunkY }
                    });
                    blockMap.set(trunkKey, { type: 'wood', position: { q: worldQ, r: worldR, s: -worldQ - worldR, y: trunkY } });
                  }
                }

                // Многослойный навес листьев (используем actualStartY вместо surfaceHeight)
                const canopyLayers = [
                  { y: actualStartY + trunkHeight, radius: 2 },
                  { y: actualStartY + trunkHeight + 1, radius: 1 },
                  { y: actualStartY + trunkHeight - 1, radius: 2 }
                ];

                for (const layer of canopyLayers) {
                  if (layer.y >= maxY || layer.y < 0) continue;

                  for (let dq = -layer.radius; dq <= layer.radius; dq++) {
                    for (let dr = -layer.radius; dr <= layer.radius; dr++) {
                      const dist = Math.sqrt(dq * dq + dr * dr);
                      const shouldPlaceLeaf = dist <= layer.radius &&
                                             !(Math.abs(dq) === layer.radius && Math.abs(dr) === layer.radius && Math.random() > 0.7);

                      if (shouldPlaceLeaf) {
                        const leafQ = worldQ + dq;
                        const leafR = worldR + dr;
                        const leafKey = `${leafQ},${leafR},${layer.y}`;

                        if (!blockMap.has(leafKey)) {
                          blocks.push({
                            type: 'leaves',
                            position: { q: leafQ, r: leafR, s: -leafQ - leafR, y: layer.y }
                          });
                          blockMap.set(leafKey, { type: 'leaves', position: { q: leafQ, r: leafR, s: -leafQ - leafR, y: layer.y } });
                          structureMap.add(`${leafQ},${leafR}`);
                        }
                      }
                    }
                  }
                }

                structureMap.add(structureKey);
              }
            }
          }
        }
      }
    }

    // Финализация
    const validatedBlockMap = new Map<string, Block>();
    blocks.forEach(block => {
      validatedBlockMap.set(`${block.position.q},${block.position.r},${block.position.y}`, block);
    });

    // Карта высот для чанка
    const chunkHeightMap = new Map<string, number>();
    const passableTypes = new Set(['water', 'lava', 'leaves']);

    for (const block of blocks) {
      const posKey = `${block.position.q},${block.position.r}`;
      if (!passableTypes.has(block.type)) {
        const currentHeight = chunkHeightMap.get(posKey) || -1;
        if (block.position.y > currentHeight) {
          chunkHeightMap.set(posKey, block.position.y);
        }
      }
    }

    // Предвычисление видимости
    const visibleBlocksSet = new Set<string>();
    const alwaysVisibleTypes = new Set(['water', 'lava', 'ice', 'leaves']);
    const hexNeighbors = [
      { q: 1, r: 0 }, { q: -1, r: 0 },
      { q: 0, r: 1 }, { q: 0, r: -1 },
      { q: 1, r: -1 }, { q: -1, r: 1 }
    ];

    for (const block of blocks) {
      const blockKey = `${block.position.q},${block.position.r},${block.position.y}`;

      if (alwaysVisibleTypes.has(block.type)) {
        visibleBlocksSet.add(blockKey);
        continue;
      }

      let hasVisibleFace = false;

      // Проверяем соседей
      const topKey = `${block.position.q},${block.position.r},${block.position.y + 1}`;
      const bottomKey = `${block.position.q},${block.position.r},${block.position.y - 1}`;
      if (!validatedBlockMap.has(topKey) || !validatedBlockMap.has(bottomKey)) {
        hasVisibleFace = true;
      }

      if (!hasVisibleFace) {
        for (const neighbor of hexNeighbors) {
          const neighborQ = block.position.q + neighbor.q;
          const neighborR = block.position.r + neighbor.r;
          const neighborKey = `${neighborQ},${neighborR},${block.position.y}`;
          if (!validatedBlockMap.has(neighborKey)) {
            hasVisibleFace = true;
            break;
          }
        }
      }

      if (hasVisibleFace) {
        visibleBlocksSet.add(blockKey);
      }
    }

    // Валидация плавающих блоков
    if (!this.config.optimization.skipFloatingBlockValidation) {
      const blocksToRemove: Block[] = [];
      const passableBlocks = new Set(['water', 'lava', 'leaves']);

      for (const block of blocks) {
        const y = block.position.y;

        if (y <= 0) continue;
        if (passableBlocks.has(block.type)) continue;

        const blockBelowKey = `${block.position.q},${block.position.r},${y - 1}`;
        const blockBelow = validatedBlockMap.get(blockBelowKey);

        if (!blockBelow) {
          blocksToRemove.push(block);
        }
      }

      blocksToRemove.forEach(block => {
        const index = blocks.indexOf(block);
        if (index !== -1) {
          blocks.splice(index, 1);
          validatedBlockMap.delete(`${block.position.q},${block.position.r},${block.position.y}`);
        }
      });
    }

    const centerBiome = biomeMap.get(`${Math.floor(this.chunkSize / 2)},${Math.floor(this.chunkSize / 2)}`) || 'grassland';

    return {
      position: { q: chunkQ, r: chunkR },
      blocks,
      blockMap: validatedBlockMap,
      biome: centerBiome,
      heightMap: chunkHeightMap,
      visibleBlocks: visibleBlocksSet
    };
  }

  private selectBiomeRegion(worldQ: number, worldR: number): string {
    const biomeZoneQ = Math.floor(worldQ / this.BIOME_SIZE);
    const biomeZoneR = Math.floor(worldR / this.BIOME_SIZE);

    const zoneHash = (biomeZoneQ * 73856093) ^ (biomeZoneR * 19349663) ^ (this.seed * 83492791);
    const biomeIndex = Math.abs(zoneHash) % 100;

    if (biomeIndex < 40) return 'grassland';
    else if (biomeIndex < 60) return 'desert';
    else if (biomeIndex < 75) return 'snow';
    else if (biomeIndex < 85) return 'frozen';
    else return 'stone';
  }

  private getSurfaceHeight(q: number, r: number, biomeConfig: BiomeConfig): number {
    const noise1 = this.simpleNoise(q * 0.05, r * 0.05);
    const noise2 = this.simpleNoise(q * 0.1, r * 0.1);
    const noise3 = this.simpleNoise(q * 0.2, r * 0.2);

    const combinedNoise = noise1 * 0.5 + noise2 * 0.3 + noise3 * 0.2;
    const baseHeight = (biomeConfig.minHeight + biomeConfig.maxHeight) / 2;
    const heightVariation = Math.min(3, biomeConfig.heightVariation);

    const height = baseHeight + (combinedNoise - 0.5) * heightVariation;
    return Math.floor(Math.max(biomeConfig.minHeight, Math.min(biomeConfig.maxHeight, height)));
  }

  private simpleNoise(x: number, y: number): number {
    const sin = Math.sin(x * 12.9898 + y * 78.233 + this.seed) * 43758.5453;
    return (sin - Math.floor(sin));
  }

  private caveNoise3D(x: number, y: number, z: number): number {
    const noise1 = this.simpleNoise(x, y + z);
    const noise2 = this.simpleNoise(x * 2, y * 2 + z * 2);
    const noise3 = this.simpleNoise(x * 4, y * 4 + z * 4);
    return (noise1 * 0.5 + noise2 * 0.3 + noise3 * 0.2);
  }

  getSeed(): number {
    return this.seed;
  }
}