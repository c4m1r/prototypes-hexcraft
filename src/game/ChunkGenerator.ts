import { Chunk, Block } from '../types/game';

interface BiomeConfig {
  surfaceBlock: string;
  subsurfaceLayers: { depth: number; block: string }[];
  structures: string[];
  minHeight: number;
  maxHeight: number;
  heightVariation: number;
}

export class ChunkGenerator {
  private chunkSize: number;
  private seed: number;
  private biomeConfigs: Map<string, BiomeConfig> = new Map();

  constructor(chunkSize: number = 14, seed: number = Math.floor(Math.random() * 1_000_000_000)) {
    this.chunkSize = chunkSize;
    this.seed = seed;
    this.setupBiomeConfigs();
  }

  private setupBiomeConfigs(): void {
    // Grassland biome - использует grass-top для поверхности
    this.biomeConfigs.set('grassland', {
      surfaceBlock: 'grass', // grass-top будет использоваться через TextureManager
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

    // Desert biome
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

    // Snow biome - с occasional ice блоками
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

    // Frozen biome
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

    // Stone / Mountain biome - более высокая местность
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

    // Определяем биом на основе шума (регионы, а не случайные тайлы)
    const biome = this.selectBiomeRegion(chunkQ, chunkR);
    const biomeConfig = this.biomeConfigs.get(biome) || this.biomeConfigs.get('grassland')!;

    // Генерируем карту высот для чанка
    const heightMap = new Map<string, number>();
    const maxY = 32; // Максимальная глубина генерации

    for (let q = 0; q < this.chunkSize; q++) {
      for (let r = 0; r < this.chunkSize; r++) {
        const worldQ = offsetQ + q;
        const worldR = offsetR + r;
        const s = -worldQ - worldR;

        // Высота поверхности на основе шума
        const surfaceHeight = this.getSurfaceHeight(worldQ, worldR, biomeConfig);
        heightMap.set(`${q},${r}`, surfaceHeight);

        // Генерируем колонку блоков
        const columnBlocks = this.generateColumn(
          worldQ,
          worldR,
          s,
          surfaceHeight,
          biomeConfig,
          maxY
        );
        blocks.push(...columnBlocks);
      }
    }

    // Генерируем пещеры (3D шум вычитание)
    this.generateCaves(blocks, offsetQ, offsetR, maxY);

    // Генерируем структуры
    this.generateStructures(blocks, offsetQ, offsetR, heightMap, biomeConfig);

    // Генерируем ресурсы под землей
    this.generateResources(blocks, offsetQ, offsetR, maxY, biome);

    // Добавляем ice блоки в snow биоме
    if (biome === 'snow') {
      this.addIceBlocks(blocks, offsetQ, offsetR, heightMap);
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

  private selectBiomeRegion(chunkQ: number, chunkR: number): string {
    // Используем шум для создания регионов биомов
    const biomeNoise = this.fractalNoise(chunkQ * 0.05, chunkR * 0.05, 3);
    const temperatureNoise = this.fractalNoise(chunkQ * 0.03, chunkR * 0.03 + 1000, 2);
    const elevationNoise = this.fractalNoise(chunkQ * 0.04, chunkR * 0.04 + 2000, 2);

    // Определяем биом на основе комбинации шумов
    if (elevationNoise > 0.6) {
      return 'stone'; // Горы
    } else if (temperatureNoise < 0.2) {
      if (biomeNoise > 0.5) {
        return 'frozen'; // Замерзший биом
      } else {
        return 'snow'; // Снежный биом
      }
    } else if (temperatureNoise > 0.7) {
      return 'desert'; // Пустыня
    } else {
      return 'grassland'; // Травяной биом
    }
  }

  private getSurfaceHeight(q: number, r: number, biomeConfig: BiomeConfig): number {
    const baseNoise = this.fractalNoise(q * 0.1, r * 0.1, 4);
    const height = Math.floor(
      biomeConfig.minHeight +
      baseNoise * (biomeConfig.maxHeight - biomeConfig.minHeight)
    );
    return Math.max(biomeConfig.minHeight, height);
  }

  private generateColumn(
    q: number,
    r: number,
    s: number,
    surfaceHeight: number,
    biomeConfig: BiomeConfig,
    maxY: number
  ): Block[] {
    const blocks: Block[] = [];
    let depth = 0;

    // Генерируем слои от поверхности вниз
    // Гарантируем минимум 5 блоков, начиная с поверхности
    const minBlocks = 5;
    const startY = surfaceHeight;
    const endY = Math.max(0, startY - minBlocks + 1);

    for (let y = startY; y >= endY && y >= 0 && y < maxY; y--) {
      let blockType = 'stone'; // По умолчанию камень

      // Определяем тип блока на основе глубины и конфигурации биома
      for (const layer of biomeConfig.subsurfaceLayers) {
        if (depth < layer.depth) {
          blockType = layer.block;
          break;
        }
      }

      // Поверхностный блок
      if (y === surfaceHeight) {
        blockType = biomeConfig.surfaceBlock;
      }

      blocks.push({
        type: blockType,
        position: { q, r, s, y }
      });

      depth++;
    }

    // Гарантируем минимум 5 блоков в колонке, добавляя камень вниз если нужно
    while (blocks.length < minBlocks) {
      const lastBlock = blocks[blocks.length - 1];
      const newY = lastBlock ? lastBlock.position.y - 1 : endY - 1;
      if (newY >= 0 && newY < maxY) {
        blocks.push({
          type: 'stone',
          position: { q, r, s, y: newY }
        });
      } else {
        break;
      }
    }

    return blocks;
  }

  private generateCaves(blocks: Block[], offsetQ: number, offsetR: number, maxY: number): void {
    const caveBlocks = new Set<string>();
    const blocksToRemove: Block[] = [];
    const blockMap = new Map<string, Block>();
    
    // Создаем карту блоков для быстрого доступа
    blocks.forEach(block => {
      const key = `${block.position.q},${block.position.r},${block.position.y}`;
      blockMap.set(key, block);
    });

    // Генерируем большие пещерные камеры используя 3D шум
    // Используем более низкую частоту для создания больших камер
    const caveRadius = 2.5; // Минимальный радиус камеры больше одного блока
    
    for (let q = -Math.ceil(caveRadius); q < this.chunkSize + Math.ceil(caveRadius); q++) {
      for (let r = -Math.ceil(caveRadius); r < this.chunkSize + Math.ceil(caveRadius); r++) {
        for (let y = 3; y < maxY - 3; y++) {
          const worldQ = offsetQ + q;
          const worldR = offsetR + r;

          // Используем более низкую частоту для больших камер
          const caveNoise = this.caveNoise3D(worldQ * 0.05, worldR * 0.05, y * 0.06);
          const caveShape = this.caveNoise3D(worldQ * 0.08, worldR * 0.08, y * 0.1);
          
          // Пещеры появляются глубже и увеличиваются с глубиной
          const depthFactor = Math.max(0, (y - 8) / (maxY - 8));
          const caveThreshold = 0.35 - depthFactor * 0.15; // Больше пещер глубже
          
          // Проверяем расстояние от центра камеры для создания больших камер
          const centerNoise = this.simpleNoise(worldQ * 0.03, worldR * 0.03 + y * 0.05);
          const distanceFromCenter = Math.abs(caveNoise - centerNoise);
          
          // Создаем большие камеры с плавными краями
          if (caveNoise > caveThreshold && caveShape > 0.2 && distanceFromCenter < 0.4) {
            // Расширяем камеру, проверяя соседние блоки
            for (let dq = -1; dq <= 1; dq++) {
              for (let dr = -1; dr <= 1; dr++) {
                for (let dy = -1; dy <= 1; dy++) {
                  const checkQ = worldQ + dq;
                  const checkR = worldR + dr;
                  const checkY = y + dy;
                  const checkKey = `${checkQ},${checkR},${checkY}`;
                  
                  // Проверяем, что блок существует и не на поверхности
                  if (blockMap.has(checkKey) && checkY < maxY - 2 && checkY > 2) {
                    const neighborNoise = this.caveNoise3D(checkQ * 0.05, checkR * 0.05, checkY * 0.06);
                    if (neighborNoise > caveThreshold - 0.1) {
                      caveBlocks.add(checkKey);
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    // Генерируем широкие входы на поверхности
    for (let q = 0; q < this.chunkSize; q++) {
      for (let r = 0; r < this.chunkSize; r++) {
        const worldQ = offsetQ + q;
        const worldR = offsetR + r;
        
        // Проверяем наличие пещеры под поверхностью
        for (let y = 3; y < 10; y++) {
          const caveKey = `${worldQ},${worldR},${y}`;
          if (caveBlocks.has(caveKey)) {
            // Создаем широкий вход на поверхности
            const entranceNoise = this.simpleNoise(worldQ * 0.1, worldR * 0.1);
            if (entranceNoise > 0.6) {
              // Расширяем вход на несколько блоков вокруг
              for (let dq = -2; dq <= 2; dq++) {
                for (let dr = -2; dr <= 2; dr++) {
                  const dist = Math.sqrt(dq * dq + dr * dr);
                  if (dist <= 2.5) {
                    const entranceQ = worldQ + dq;
                    const entranceR = worldR + dr;
                    const entranceS = -entranceQ - entranceR;
                    
                    // Удаляем блоки на поверхности для создания входа
                    for (let entranceY = y + 1; entranceY <= y + 3; entranceY++) {
                      const entranceKey = `${entranceQ},${entranceR},${entranceY}`;
                      if (blockMap.has(entranceKey)) {
                        caveBlocks.add(entranceKey);
                      }
                    }
                  }
                }
              }
            }
            break;
          }
        }
      }
    }

    // Удаляем блоки в пещерах
    blocks.forEach(block => {
      const blockKey = `${block.position.q},${block.position.r},${block.position.y}`;
      if (caveBlocks.has(blockKey)) {
        blocksToRemove.push(block);
      }
    });

    blocksToRemove.forEach(block => {
      const index = blocks.indexOf(block);
      if (index !== -1) {
        blocks.splice(index, 1);
      }
    });

    // Добавляем лаву и воду в глубокие пещеры
    for (let q = 0; q < this.chunkSize; q++) {
      for (let r = 0; r < this.chunkSize; r++) {
        for (let y = maxY - 15; y < maxY - 5; y++) {
          const worldQ = offsetQ + q;
          const worldR = offsetR + r;
          const s = -worldQ - worldR;
          const caveKey = `${worldQ},${worldR},${y}`;

          if (caveBlocks.has(caveKey)) {
            // Проверяем, что под этим местом тоже пещера (дно пещеры)
            const belowKey = `${worldQ},${worldR},${y - 1}`;
            if (caveBlocks.has(belowKey) || !blockMap.has(belowKey)) {
              const liquidNoise = this.simpleNoise(worldQ * 0.08, worldR * 0.08 + y * 0.04);
              const depthFactor = (y - (maxY - 15)) / 10;
              
              // Лава появляется глубже
              if (depthFactor > 0.6 && liquidNoise > 0.75) {
                blocks.push({
                  type: 'lava',
                  position: { q: worldQ, r: worldR, s, y }
                });
              } else if (liquidNoise < 0.35) {
                blocks.push({
                  type: 'water',
                  position: { q: worldQ, r: worldR, s, y }
                });
              }
            }
          }
        }
      }
    }
  }

  private generateStructures(
    blocks: Block[],
    offsetQ: number,
    offsetR: number,
    heightMap: Map<string, number>,
    biomeConfig: BiomeConfig
  ): void {
    // Создаем карту блоков для быстрого доступа
    const blockMap = new Map<string, Block>();
    blocks.forEach(block => {
      const key = `${block.position.q},${block.position.r},${block.position.y}`;
      blockMap.set(key, block);
    });

    for (const structure of biomeConfig.structures) {
      for (let q = 0; q < this.chunkSize; q++) {
        for (let r = 0; r < this.chunkSize; r++) {
          const worldQ = offsetQ + q;
          const worldR = offsetR + r;
          const s = -worldQ - worldR;
          const height = heightMap.get(`${q},${r}`) || 5;

          if (structure === 'tree') {
            // Деревья только в grassland биоме
            this.addTree(blocks, blockMap, worldQ, worldR, s, height);
          } else if (structure === 'mushroom') {
            // Грибы как 2D спрайты на поверхности
            this.addMushroom(blocks, blockMap, worldQ, worldR, s, height);
          }
        }
      }
    }
  }

  private addTree(blocks: Block[], blockMap: Map<string, Block>, q: number, r: number, s: number, baseHeight: number): void {
    const treeNoise = this.simpleNoise(q * 0.15, r * 0.15);
    if (treeNoise > 0.88) {
      // Проверяем, что на поверхности есть grass блок
      const surfaceKey = `${q},${r},${baseHeight}`;
      const surfaceBlock = blockMap.get(surfaceKey);
      
      if (surfaceBlock && surfaceBlock.type === 'grass') {
        const trunkHeight = 5 + Math.floor(this.simpleNoise(q * 0.4, r * 0.4) * 4);

        // Ствол - вертикальная стопка wood блоков
        for (let i = 1; i <= trunkHeight; i++) {
          const trunkY = baseHeight + i;
          const trunkKey = `${q},${r},${trunkY}`;
          
          // Проверяем, что место свободно
          if (!blockMap.has(trunkKey)) {
            blocks.push({
              type: 'wood',
              position: { q, r, s, y: trunkY }
            });
            blockMap.set(trunkKey, { type: 'wood', position: { q, r, s, y: trunkY } });
          }
        }

        // Листва на вершине ствола
        const foliageY = baseHeight + trunkHeight;
        const foliageRadius = 2.5;
        
        for (let dq = -3; dq <= 3; dq++) {
          for (let dr = -3; dr <= 3; dr++) {
            const distance = Math.sqrt(dq * dq + dr * dr);
            if (distance <= foliageRadius && (dq !== 0 || dr !== 0)) {
              const foliageQ = q + dq;
              const foliageR = r + dr;
              const foliageS = -foliageQ - foliageR;
              const foliageKey = `${foliageQ},${foliageR},${foliageY}`;
              
              // Добавляем листву только если место свободно
              if (!blockMap.has(foliageKey)) {
                blocks.push({
                  type: 'leaves',
                  position: { q: foliageQ, r: foliageR, s: foliageS, y: foliageY }
                });
                blockMap.set(foliageKey, { type: 'leaves', position: { q: foliageQ, r: foliageR, s: foliageS, y: foliageY } });
              }
            }
          }
        }
      }
    }
  }

  private addMushroom(blocks: Block[], blockMap: Map<string, Block>, q: number, r: number, s: number, baseHeight: number): void {
    const mushroomNoise = this.simpleNoise(q * 0.12, r * 0.12);
    if (mushroomNoise > 0.93) {
      // Проверяем, что под грибом grass или dirt
      const blockBelowKey = `${q},${r},${baseHeight - 1}`;
      const blockBelow = blockMap.get(blockBelowKey);
      
      if (blockBelow && (blockBelow.type === 'grass' || blockBelow.type === 'dirt')) {
        // Проверяем, что место на поверхности свободно
        const surfaceKey = `${q},${r},${baseHeight}`;
        if (!blockMap.has(surfaceKey)) {
          const mushroomType = this.simpleNoise(q * 0.25, r * 0.25) > 0.5 ? 'red_mushroom' : 'mushroom';
          
          // Гриб как 2D спрайт (один блок на поверхности)
          blocks.push({
            type: mushroomType,
            position: { q, r, s, y: baseHeight }
          });
          blockMap.set(surfaceKey, { type: mushroomType, position: { q, r, s, y: baseHeight } });
        }
      }
    }
  }

  private generateResources(
    blocks: Block[],
    offsetQ: number,
    offsetR: number,
    maxY: number,
    biome: string
  ): void {
    // Создаем карту блоков для быстрого доступа
    const blockMap = new Map<string, Block>();
    blocks.forEach(block => {
      const key = `${block.position.q},${block.position.r},${block.position.y}`;
      blockMap.set(key, block);
    });

    for (let q = 0; q < this.chunkSize; q++) {
      for (let r = 0; r < this.chunkSize; r++) {
        for (let y = 8; y < maxY - 8; y++) {
          const worldQ = offsetQ + q;
          const worldR = offsetR + r;
          const s = -worldQ - worldR;
          const blockKey = `${worldQ},${worldR},${y}`;
          const block = blockMap.get(blockKey);

          // Ресурсы появляются только в каменных блоках
          if (!block || block.type !== 'stone') {
            continue;
          }

          // Ресурсы появляются глубже
          const depthFactor = (y - 8) / (maxY - 16);
          const resourceNoise = this.simpleNoise(worldQ * 0.04, worldR * 0.04 + y * 0.08);

          // Частота зависит от глубины и биома
          let resourceThreshold = 0.94 - depthFactor * 0.12;
          if (biome === 'stone') {
            resourceThreshold -= 0.06; // Больше ресурсов в каменных биомах
          }

          if (resourceNoise > resourceThreshold) {
            // Определяем тип ресурса на основе глубины
            let resourceType = 'bronze';
            
            // Bronze на средней глубине
            if (depthFactor > 0.3 && depthFactor <= 0.6) {
              resourceType = 'bronze';
            }
            // Silver на большей глубине
            else if (depthFactor > 0.6 && depthFactor <= 0.8) {
              resourceType = this.simpleNoise(worldQ * 0.08, worldR * 0.08) > 0.55 ? 'silver' : 'bronze';
            }
            // Gold на самой большой глубине
            else if (depthFactor > 0.8) {
              resourceType = this.simpleNoise(worldQ * 0.12, worldR * 0.12) > 0.65 ? 'gold' : 'silver';
            }

            // Заменяем камень на ресурс
            const blockIndex = blocks.findIndex(
              b => b.position.q === worldQ && b.position.r === worldR && b.position.y === y && b.type === 'stone'
            );
            if (blockIndex !== -1) {
              blocks[blockIndex].type = resourceType;
              blockMap.set(blockKey, { ...blocks[blockIndex], type: resourceType });
            }
          }
        }
      }
    }
  }

  private fractalNoise(x: number, y: number, octaves: number): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      value += this.simpleNoise(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }

    return value / maxValue;
  }

  private caveNoise3D(x: number, y: number, z: number): number {
    // Комбинируем несколько слоев шума для создания больших камер
    const noise1 = this.simpleNoise(x, y + z);
    const noise2 = this.simpleNoise(x * 2, y * 2 + z * 2);
    const noise3 = this.simpleNoise(x * 4, y * 4 + z * 4);
    return (noise1 * 0.5 + noise2 * 0.3 + noise3 * 0.2);
  }

  private addIceBlocks(blocks: Block[], offsetQ: number, offsetR: number, heightMap: Map<string, number>): void {
    const blockMap = new Map<string, Block>();
    blocks.forEach(block => {
      const key = `${block.position.q},${block.position.r},${block.position.y}`;
      blockMap.set(key, block);
    });

    for (let q = 0; q < this.chunkSize; q++) {
      for (let r = 0; r < this.chunkSize; r++) {
        const worldQ = offsetQ + q;
        const worldR = offsetR + r;
        const s = -worldQ - worldR;
        const height = heightMap.get(`${q},${r}`) || 5;

        // Добавляем occasional ice блоки в snow биоме
        const iceNoise = this.simpleNoise(worldQ * 0.2, worldR * 0.2);
        if (iceNoise > 0.85) {
          // Заменяем некоторые snow блоки на ice
          for (let y = height; y >= height - 2; y--) {
            const iceKey = `${worldQ},${worldR},${y}`;
            const block = blockMap.get(iceKey);
            if (block && block.type === 'snow') {
              const blockIndex = blocks.findIndex(
                b => b.position.q === worldQ && b.position.r === worldR && b.position.y === y && b.type === 'snow'
              );
              if (blockIndex !== -1) {
                blocks[blockIndex].type = 'ice';
                blockMap.set(iceKey, { ...blocks[blockIndex], type: 'ice' });
              }
            }
          }
        }
      }
    }
  }

  private simpleNoise(x: number, y: number): number {
    const sin = Math.sin(x * 12.9898 + y * 78.233 + this.seed) * 43758.5453;
    return (sin - Math.floor(sin));
  }

  getSeed(): number {
    return this.seed;
  }
}
