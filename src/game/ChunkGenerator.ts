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
  private readonly BIOME_SIZE = 72; // Размер биома 72x72 зоны

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

    // Генерируем карту высот и биомов для чанка
    const heightMap = new Map<string, number>();
    const biomeMap = new Map<string, string>();
    const maxY = 32; // Максимальная глубина генерации

    // Сначала определяем биомы для всех позиций
    for (let q = 0; q < this.chunkSize; q++) {
      for (let r = 0; r < this.chunkSize; r++) {
        const worldQ = offsetQ + q;
        const worldR = offsetR + r;
        const biome = this.selectBiomeRegion(worldQ, worldR);
        biomeMap.set(`${q},${r}`, biome);
      }
    }

    // ШАГ 1: Генерируем базовый каменный слой до определенной глубины
    const baseStoneDepth = 20; // Базовая глубина каменного слоя
    for (let q = 0; q < this.chunkSize; q++) {
      for (let r = 0; r < this.chunkSize; r++) {
        const worldQ = offsetQ + q;
        const worldR = offsetR + r;
        const s = -worldQ - worldR;
        
        // Генерируем каменный слой от y=0 до y=baseStoneDepth
        for (let y = 0; y <= baseStoneDepth && y < maxY; y++) {
          blocks.push({
            type: 'stone',
            position: { q: worldQ, r: worldR, s, y }
          });
        }
      }
    }

    // ШАГ 2: Генерируем поверхность биома поверх каменного слоя
    for (let q = 0; q < this.chunkSize; q++) {
      for (let r = 0; r < this.chunkSize; r++) {
        const worldQ = offsetQ + q;
        const worldR = offsetR + r;
        const s = -worldQ - worldR;
        const biome = biomeMap.get(`${q},${r}`) || 'grassland';
        const biomeConfig = this.biomeConfigs.get(biome) || this.biomeConfigs.get('grassland')!;

        // Высота поверхности детерминированная для биома
        const surfaceHeight = this.getSurfaceHeight(worldQ, worldR, biomeConfig);
        heightMap.set(`${q},${r}`, surfaceHeight);

        // Генерируем поверхностные слои биома поверх камня
        this.generateSurfaceLayers(blocks, worldQ, worldR, s, surfaceHeight, biomeConfig, baseStoneDepth);
      }
    }

    // ШАГ 3: Генерируем пещеры под землей (удаляем блоки)
    this.generateCaves(blocks, offsetQ, offsetR, maxY, baseStoneDepth, heightMap);

    // ШАГ 4: Генерируем вулканы с лавой
    this.generateVolcanoes(blocks, offsetQ, offsetR, heightMap, biomeMap, maxY, baseStoneDepth);

    // ШАГ 5: Генерируем воду (озера/моря/реки) - после пещер и вулканов
    this.generateLakes(blocks, offsetQ, offsetR, heightMap, biomeMap, maxY);

    // ШАГ 6: Удаляем висящие блоки после всех модификаций
    this.removeFloatingBlocks(blocks, offsetQ, offsetR, maxY);

    // Генерируем структуры (с проверками наложения)
    const structureMap = new Set<string>(); // Карта занятых позиций структур
    this.generateStructures(blocks, offsetQ, offsetR, heightMap, biomeMap, structureMap);

    // Генерируем ресурсы под землей (с проверками наложения)
    const resourceMap = new Set<string>(); // Карта занятых позиций ресурсов
    this.generateResources(blocks, offsetQ, offsetR, maxY, biomeMap, resourceMap);

    // Определяем основной биом чанка (по центру)
    const centerBiome = biomeMap.get(`${Math.floor(this.chunkSize / 2)},${Math.floor(this.chunkSize / 2)}`) || 'grassland';

    const blockMap = new Map<string, Block>();
    blocks.forEach(block => {
      blockMap.set(`${block.position.q},${block.position.r},${block.position.y}`, block);
    });

    return {
      position: { q: chunkQ, r: chunkR },
      blocks,
      blockMap,
      biome: centerBiome
    };
  }

  private selectBiomeRegion(worldQ: number, worldR: number): string {
    // Определяем биом на основе фиксированных зон 72x72
    // Используем детерминированный алгоритм на основе координат и seed
    const biomeZoneQ = Math.floor(worldQ / this.BIOME_SIZE);
    const biomeZoneR = Math.floor(worldR / this.BIOME_SIZE);
    
    // Используем seed для детерминированного распределения биомов
    // Простой хеш для определения биома в зоне
    const zoneHash = (biomeZoneQ * 73856093) ^ (biomeZoneR * 19349663) ^ (this.seed * 83492791);
    const biomeIndex = Math.abs(zoneHash) % 100;
    
    // Распределение биомов: 40% grassland, 20% desert, 15% snow, 10% frozen, 15% stone
    if (biomeIndex < 40) {
      return 'grassland';
    } else if (biomeIndex < 60) {
      return 'desert';
    } else if (biomeIndex < 75) {
      return 'snow';
    } else if (biomeIndex < 85) {
      return 'frozen';
    } else {
      return 'stone';
    }
  }

  private getSurfaceHeight(q: number, r: number, biomeConfig: BiomeConfig): number {
    // Детерминированная высота без шума - используем простую формулу на основе координат
    // для создания плавного рельефа внутри биома
    const localQ = q % this.BIOME_SIZE;
    const localR = r % this.BIOME_SIZE;
    const centerQ = this.BIOME_SIZE / 2;
    const centerR = this.BIOME_SIZE / 2;
    
    // Расстояние от центра биома влияет на высоту
    const distFromCenter = Math.sqrt(
      Math.pow(localQ - centerQ, 2) + Math.pow(localR - centerR, 2)
    );
    const maxDist = Math.sqrt(Math.pow(centerQ, 2) + Math.pow(centerR, 2));
    const normalizedDist = Math.min(1, distFromCenter / maxDist);
    
    // Высота уменьшается к краям биома
    const heightVariation = (1 - normalizedDist * 0.3) * biomeConfig.heightVariation;
    const baseHeight = (biomeConfig.minHeight + biomeConfig.maxHeight) / 2;
    
    return Math.floor(baseHeight + heightVariation * (Math.sin(q * 0.1) + Math.cos(r * 0.1)) * 0.5);
  }

  private generateSurfaceLayers(
    blocks: Block[],
    q: number,
    r: number,
    s: number,
    surfaceHeight: number,
    biomeConfig: BiomeConfig,
    baseStoneDepth: number
  ): void {
    const blockMap = new Map<string, Block>();
    blocks.forEach(block => {
      const key = `${block.position.q},${block.position.r},${block.position.y}`;
      blockMap.set(key, block);
    });

    // Генерируем слои от поверхности вниз до базового каменного слоя
    let depth = 0;
    const startY = Math.max(surfaceHeight, baseStoneDepth + 1);
    const endY = baseStoneDepth + 1;

    for (let y = startY; y >= endY && y >= 0; y--) {
      const blockKey = `${q},${r},${y}`;
      
      // Пропускаем если блок уже существует (из базового каменного слоя)
      if (blockMap.has(blockKey)) {
        // Заменяем камень на поверхностные слои биома
        const existingBlock = blockMap.get(blockKey)!;
        let blockType = 'stone';

        // Определяем тип блока на основе глубины от поверхности
        const depthFromSurface = surfaceHeight - y;
        for (const layer of biomeConfig.subsurfaceLayers) {
          if (depthFromSurface < layer.depth) {
            blockType = layer.block;
            break;
          }
        }

        // Поверхностный блок
        if (y === surfaceHeight) {
          blockType = biomeConfig.surfaceBlock;
        }

        // Обновляем тип блока
        existingBlock.type = blockType;
      } else {
        // Добавляем новый блок поверх базового слоя
        let blockType = 'stone';
        const depthFromSurface = surfaceHeight - y;
        
        for (const layer of biomeConfig.subsurfaceLayers) {
          if (depthFromSurface < layer.depth) {
            blockType = layer.block;
            break;
          }
        }

        if (y === surfaceHeight) {
          blockType = biomeConfig.surfaceBlock;
        }

        blocks.push({
          type: blockType,
          position: { q, r, s, y }
        });
      }

      depth++;
    }
  }

  private generateCaves(blocks: Block[], offsetQ: number, offsetR: number, maxY: number, baseStoneDepth: number, heightMap: Map<string, number>): void {
    const caveBlocks = new Set<string>();
    const blocksToRemove: Block[] = [];
    const blockMap = new Map<string, Block>();
    
    // Создаем карту блоков для быстрого доступа
    blocks.forEach(block => {
      const key = `${block.position.q},${block.position.r},${block.position.y}`;
      blockMap.set(key, block);
    });

    // Генерируем большие пещерные камеры используя 3D шум
    // Пещеры только под землей, начиная с базового каменного слоя
    const caveRadius = 2.5; // Минимальный радиус камеры больше одного блока
    const caveStartY = baseStoneDepth + 1; // Пещеры начинаются под поверхностью
    
    for (let q = -Math.ceil(caveRadius); q < this.chunkSize + Math.ceil(caveRadius); q++) {
      for (let r = -Math.ceil(caveRadius); r < this.chunkSize + Math.ceil(caveRadius); r++) {
        for (let y = caveStartY; y < maxY - 3 && y > baseStoneDepth; y++) {
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
                  if (blockMap.has(checkKey) && checkY < maxY - 2 && checkY > baseStoneDepth) {
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
        const surfaceHeight = heightMap.get(`${q},${r}`) || baseStoneDepth + 5;
        for (let y = caveStartY; y < surfaceHeight && y < maxY - 3; y++) {
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

    // Создаем проходы между пещерами используя шум
    // Проверяем соседние пещеры и создаем проходы между ними
    const connectedCaves = new Set<string>(caveBlocks);
    for (const caveKey of caveBlocks) {
      const [q, r, y] = caveKey.split(',').map(Number);
      
      // Используем шум для определения проходов
      const passageNoise = this.caveNoise3D(q * 0.1, r * 0.1, y * 0.15);
      
      if (passageNoise > 0.4) {
        // Создаем проходы к соседним пещерам
        for (let dq = -2; dq <= 2; dq++) {
          for (let dr = -2; dr <= 2; dr++) {
            for (let dy = -1; dy <= 1; dy++) {
              if (dq === 0 && dr === 0 && dy === 0) continue;
              
              const neighborQ = q + dq;
              const neighborR = r + dr;
              const neighborY = y + dy;
              const neighborKey = `${neighborQ},${neighborR},${neighborY}`;
              
              // Проверяем наличие соседней пещеры
              if (caveBlocks.has(neighborKey)) {
                // Создаем проход между пещерами
                const dist = Math.sqrt(dq * dq + dr * dr + dy * dy);
                if (dist <= 2) {
                  // Заполняем промежуточные позиции
                  const steps = Math.ceil(dist);
                  for (let step = 0; step <= steps; step++) {
                    const passageQ = Math.floor(q + (dq * step / steps));
                    const passageR = Math.floor(r + (dr * step / steps));
                    const passageY = Math.floor(y + (dy * step / steps));
                    const passageKey = `${passageQ},${passageR},${passageY}`;
                    
                    if (blockMap.has(passageKey) && passageY > baseStoneDepth && passageY < maxY - 2) {
                      connectedCaves.add(passageKey);
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    // Удаляем блоки в пещерах и проходах
    blocks.forEach(block => {
      const blockKey = `${block.position.q},${block.position.r},${block.position.y}`;
      if (connectedCaves.has(blockKey)) {
        blocksToRemove.push(block);
      }
    });

    blocksToRemove.forEach(block => {
      const index = blocks.indexOf(block);
      if (index !== -1) {
        blocks.splice(index, 1);
      }
    });
  }

  private removeFloatingBlocks(blocks: Block[], offsetQ: number, offsetR: number, maxY: number): void {
    const blockMap = new Map<string, Block>();
    blocks.forEach(block => {
      const key = `${block.position.q},${block.position.r},${block.position.y}`;
      blockMap.set(key, block);
    });

    const blocksToRemove: Block[] = [];
    const passableBlocks = new Set(['leaves', 'water', 'lava']);

    // Проверяем каждый блок на наличие опоры снизу
    blocks.forEach(block => {
      const y = block.position.y;
      
      // Блоки на уровне 0 всегда имеют опору (земля)
      if (y <= 0) {
        return;
      }

      // Проверяем блоки снизу (y-1, y-2, y-3) для надежности
      let hasSupport = false;
      for (let checkY = y - 1; checkY >= Math.max(0, y - 3); checkY--) {
        const supportKey = `${block.position.q},${block.position.r},${checkY}`;
        const supportBlock = blockMap.get(supportKey);
        
        if (supportBlock && !passableBlocks.has(supportBlock.type)) {
          hasSupport = true;
          break;
        }
      }

      // Если блок не имеет опоры и не является проходимым блоком, удаляем его
      if (!hasSupport && !passableBlocks.has(block.type)) {
        blocksToRemove.push(block);
      }
    });

    // Удаляем висящие блоки
    blocksToRemove.forEach(block => {
      const index = blocks.indexOf(block);
      if (index !== -1) {
        blocks.splice(index, 1);
        blockMap.delete(`${block.position.q},${block.position.r},${block.position.y}`);
      }
    });
  }

  private generateVolcanoes(
    blocks: Block[],
    offsetQ: number,
    offsetR: number,
    heightMap: Map<string, number>,
    biomeMap: Map<string, string>,
    maxY: number,
    baseStoneDepth: number
  ): void {
    const blockMap = new Map<string, Block>();
    blocks.forEach(block => {
      const key = `${block.position.q},${block.position.r},${block.position.y}`;
      blockMap.set(key, block);
    });

    // Генерируем вулканы используя шум
    for (let q = 0; q < this.chunkSize; q++) {
      for (let r = 0; r < this.chunkSize; r++) {
        const worldQ = offsetQ + q;
        const worldR = offsetR + r;
        const biome = biomeMap.get(`${q},${r}`) || 'grassland';
        
        // Вулканы только в stone биомах
        if (biome !== 'stone') {
          continue;
        }

        const volcanoNoise = this.simpleNoise(worldQ * 0.02, worldR * 0.02);
        
        // Вулканы появляются редко
        if (volcanoNoise > 0.92) {
          const surfaceHeight = heightMap.get(`${q},${r}`) || baseStoneDepth + 10;
          const volcanoHeight = surfaceHeight + 5 + Math.floor(this.simpleNoise(worldQ * 0.1, worldR * 0.1) * 8);
          
          // Создаем конус вулкана
          const volcanoRadius = 3 + Math.floor(this.simpleNoise(worldQ * 0.15, worldR * 0.15) * 3);
          
          for (let dq = -volcanoRadius; dq <= volcanoRadius; dq++) {
            for (let dr = -volcanoRadius; dr <= volcanoRadius; dr++) {
              const dist = Math.sqrt(dq * dq + dr * dr);
              if (dist <= volcanoRadius) {
                const volcanoQ = worldQ + dq;
                const volcanoR = worldR + dr;
                const volcanoS = -volcanoQ - volcanoR;
                
                // Высота конуса уменьшается от центра
                const heightFactor = 1 - (dist / volcanoRadius);
                const localVolcanoHeight = Math.floor(surfaceHeight + volcanoHeight * heightFactor);
                
                // Проверяем, что позиция в пределах текущего чанка
                const checkLocalQ = volcanoQ - offsetQ;
                const checkLocalR = volcanoR - offsetR;
                
                if (checkLocalQ >= 0 && checkLocalQ < this.chunkSize &&
                    checkLocalR >= 0 && checkLocalR < this.chunkSize) {
                  
                  // Создаем конус вулкана из камня
                  for (let y = surfaceHeight; y <= localVolcanoHeight && y < maxY; y++) {
                    const volcanoKey = `${volcanoQ},${volcanoR},${y}`;
                    const existingBlock = blockMap.get(volcanoKey);
                    
                    if (!existingBlock) {
                      blocks.push({
                        type: 'stone',
                        position: { q: volcanoQ, r: volcanoR, s: volcanoS, y }
                      });
                      blockMap.set(volcanoKey, { type: 'stone', position: { q: volcanoQ, r: volcanoR, s: volcanoS, y } });
                    } else if (existingBlock.type !== 'lava') {
                      // Заменяем на камень, если не лава
                      existingBlock.type = 'stone';
                    }
                  }
                  
                  // Добавляем лаву на вершине вулкана
                  if (dist < volcanoRadius * 0.3) {
                    const lavaY = localVolcanoHeight;
                    const lavaKey = `${volcanoQ},${volcanoR},${lavaY}`;
                    const lavaBlock = blockMap.get(lavaKey);
                    
                    if (lavaBlock) {
                      lavaBlock.type = 'lava';
                    } else {
                      blocks.push({
                        type: 'lava',
                        position: { q: volcanoQ, r: volcanoR, s: volcanoS, y: lavaY }
                      });
                      blockMap.set(lavaKey, { type: 'lava', position: { q: volcanoQ, r: volcanoR, s: volcanoS, y: lavaY } });
                    }
                  }
                  
                  // Лава течет вниз от вершины до базового каменного слоя
                  if (dist < volcanoRadius * 0.5) {
                    for (let lavaY = localVolcanoHeight - 1; lavaY >= baseStoneDepth && lavaY >= 0; lavaY--) {
                      const lavaKey = `${volcanoQ},${volcanoR},${lavaY}`;
                      const existingLavaBlock = blockMap.get(lavaKey);
                      
                      // Проверяем, есть ли блок снизу (лава не течет в пустоту)
                      const belowKey = `${volcanoQ},${volcanoR},${lavaY - 1}`;
                      const belowBlock = blockMap.get(belowKey);
                      
                      if (belowBlock || lavaY === baseStoneDepth) {
                        if (!existingLavaBlock) {
                          blocks.push({
                            type: 'lava',
                            position: { q: volcanoQ, r: volcanoR, s: volcanoS, y: lavaY }
                          });
                          blockMap.set(lavaKey, { type: 'lava', position: { q: volcanoQ, r: volcanoR, s: volcanoS, y: lavaY } });
                        } else if (existingLavaBlock.type !== 'lava') {
                          existingLavaBlock.type = 'lava';
                        }
                      } else {
                        break; // Прекращаем поток лавы, если нет опоры
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  private generateLakes(
    blocks: Block[],
    offsetQ: number,
    offsetR: number,
    heightMap: Map<string, number>,
    biomeMap: Map<string, string>,
    maxY: number
  ): void {
    const blockMap = new Map<string, Block>();
    blocks.forEach(block => {
      const key = `${block.position.q},${block.position.r},${block.position.y}`;
      blockMap.set(key, block);
    });

    // Генерируем озера/моря используя шум для определения их расположения
    // Озера могут выходить за границы чанка для соединения биомов
    const lakeCheckRadius = 10; // Проверяем область вокруг чанка
    
    for (let q = -lakeCheckRadius; q < this.chunkSize + lakeCheckRadius; q++) {
      for (let r = -lakeCheckRadius; r < this.chunkSize + lakeCheckRadius; r++) {
        const worldQ = offsetQ + q;
        const worldR = offsetR + r;
        
        // Определяем биом для этой позиции (может быть вне чанка)
        const biome = this.selectBiomeRegion(worldQ, worldR);
        
        // Получаем высоту из карты высот или вычисляем приблизительно
        const localQ = q >= 0 && q < this.chunkSize ? q : null;
        const localR = r >= 0 && r < this.chunkSize ? r : null;
        let height = 10;
        
        if (localQ !== null && localR !== null) {
          height = heightMap.get(`${localQ},${localR}`) || 10;
        } else {
          // Приблизительная высота для позиций вне чанка
          const biomeConfig = this.biomeConfigs.get(biome) || this.biomeConfigs.get('grassland')!;
          height = this.getSurfaceHeight(worldQ, worldR, biomeConfig);
        }
        
        // Используем шум для определения озер
        const lakeNoise = this.simpleNoise(worldQ * 0.03, worldR * 0.03);
        const lakeTypeNoise = this.simpleNoise(worldQ * 0.05 + 1000, worldR * 0.05 + 1000);
        
        // Озера появляются в низинах и могут соединять биомы
        if (lakeNoise > 0.75 && height < 12) {
          let lakeType: string | null = null;
          
          // Определяем тип озера на основе биома и шума
          if (biome === 'frozen' || biome === 'snow') {
            lakeType = lakeTypeNoise > 0.5 ? 'ice' : 'water';
          } else if (biome === 'desert' || biome === 'stone') {
            lakeType = lakeTypeNoise > 0.7 ? 'lava' : 'water';
          } else {
            lakeType = 'water';
          }
          
          // Создаем озеро - заполняем блоки на уровне поверхности и ниже
          const lakeRadius = Math.floor((lakeNoise - 0.75) * 40) + 5; // Радиус 5-12 блоков
          
          for (let dq = -lakeRadius; dq <= lakeRadius; dq++) {
            for (let dr = -lakeRadius; dr <= lakeRadius; dr++) {
              const dist = Math.sqrt(dq * dq + dr * dr);
              if (dist <= lakeRadius) {
                const lakeQ = worldQ + dq;
                const lakeR = worldR + dr;
                const lakeS = -lakeQ - lakeR;
                
                // Проверяем, что позиция в пределах текущего чанка (для добавления блоков)
                const checkLocalQ = lakeQ - offsetQ;
                const checkLocalR = lakeR - offsetR;
                
                // Добавляем блоки только если они в пределах текущего чанка
                if (checkLocalQ >= 0 && checkLocalQ < this.chunkSize &&
                    checkLocalR >= 0 && checkLocalR < this.chunkSize) {
                  
                  const checkHeight = heightMap.get(`${checkLocalQ},${checkLocalR}`) || height;
                  
                  // Заполняем озеро на уровне поверхности и немного ниже
                  for (let y = checkHeight; y >= checkHeight - 2 && y >= 0 && y < maxY; y--) {
                    const lakeKey = `${lakeQ},${lakeR},${y}`;
                    const existingBlock = blockMap.get(lakeKey);
                    
                    // Заменяем только определенные блоки на жидкость
                    if (existingBlock && (existingBlock.type === 'grass' || existingBlock.type === 'dirt' || 
                        existingBlock.type === 'sand' || existingBlock.type === 'snow' || existingBlock.type === 'stone')) {
                      const blockIndex = blocks.findIndex(
                        b => b.position.q === lakeQ && b.position.r === lakeR && b.position.y === y
                      );
                      if (blockIndex !== -1) {
                        blocks[blockIndex].type = lakeType!;
                        blockMap.set(lakeKey, { ...blocks[blockIndex], type: lakeType! });
                      }
                    } else if (!existingBlock && y === checkHeight) {
                      // Добавляем жидкость если блока нет
                      blocks.push({
                        type: lakeType!,
                        position: { q: lakeQ, r: lakeR, s: lakeS, y }
                      });
                      blockMap.set(lakeKey, { type: lakeType!, position: { q: lakeQ, r: lakeR, s: lakeS, y } });
                    }
                  }
                }
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
    biomeMap: Map<string, string>,
    structureMap: Set<string>
  ): void {
    // Создаем карту блоков для быстрого доступа
    const blockMap = new Map<string, Block>();
    blocks.forEach(block => {
      const key = `${block.position.q},${block.position.r},${block.position.y}`;
      blockMap.set(key, block);
    });

    // Генерируем структуры используя шум, но с проверками наложения
    for (let q = 0; q < this.chunkSize; q++) {
      for (let r = 0; r < this.chunkSize; r++) {
        const worldQ = offsetQ + q;
        const worldR = offsetR + r;
        const biome = biomeMap.get(`${q},${r}`) || 'grassland';
        const biomeConfig = this.biomeConfigs.get(biome) || this.biomeConfigs.get('grassland')!;
        const height = heightMap.get(`${q},${r}`) || 5;

        // Проверяем, что позиция не занята другой структурой
        const structureKey = `${worldQ},${worldR}`;
        if (structureMap.has(structureKey)) {
          continue;
        }

        // Используем шум для определения структур
        for (const structure of biomeConfig.structures) {
          const structureNoise = this.simpleNoise(worldQ * 0.1, worldR * 0.1 + structure.charCodeAt(0));
          
          if (structure === 'tree' && structureNoise > 0.88) {
            // Деревья только в grassland биоме
            if (this.addTree(blocks, blockMap, worldQ, worldR, -worldQ - worldR, height, structureMap)) {
              structureMap.add(structureKey);
              break; // Одна структура на позицию
            }
          } else if (structure === 'mushroom' && structureNoise > 0.93) {
            // Грибы как 2D спрайты на поверхности
            if (this.addMushroom(blocks, blockMap, worldQ, worldR, -worldQ - worldR, height, structureMap)) {
              structureMap.add(structureKey);
              break; // Одна структура на позицию
            }
          }
        }
      }
    }
  }

  private addTree(blocks: Block[], blockMap: Map<string, Block>, q: number, r: number, s: number, baseHeight: number, structureMap: Set<string>): boolean {
    // Проверяем, что на поверхности есть grass блок
    const surfaceKey = `${q},${r},${baseHeight}`;
    const surfaceBlock = blockMap.get(surfaceKey);
    
    if (!surfaceBlock || surfaceBlock.type !== 'grass') {
      return false;
    }

    // Проверяем, что позиция не занята
    const structureKey = `${q},${r}`;
    if (structureMap.has(structureKey)) {
      return false;
    }

    // Используем шум для определения высоты ствола
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
          
          // Помечаем позиции листвы как занятые
          structureMap.add(`${foliageQ},${foliageR}`);
          
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

    return true;
  }

  private addMushroom(blocks: Block[], blockMap: Map<string, Block>, q: number, r: number, s: number, baseHeight: number, structureMap: Set<string>): boolean {
    // Проверяем, что позиция не занята
    const structureKey = `${q},${r}`;
    if (structureMap.has(structureKey)) {
      return false;
    }

    // Проверяем, что под грибом grass или dirt
    const blockBelowKey = `${q},${r},${baseHeight - 1}`;
    const blockBelow = blockMap.get(blockBelowKey);
    
    if (!blockBelow || (blockBelow.type !== 'grass' && blockBelow.type !== 'dirt')) {
      return false;
    }

    // Проверяем, что место на поверхности свободно
    const surfaceKey = `${q},${r},${baseHeight}`;
    if (blockMap.has(surfaceKey)) {
      return false;
    }

    // Используем шум для определения типа гриба
    const mushroomType = this.simpleNoise(q * 0.25, r * 0.25) > 0.5 ? 'red_mushroom' : 'mushroom';
    
    // Гриб как 2D спрайт (один блок на поверхности)
    blocks.push({
      type: mushroomType,
      position: { q, r, s, y: baseHeight }
    });
    blockMap.set(surfaceKey, { type: mushroomType, position: { q, r, s, y: baseHeight } });
    structureMap.add(structureKey);

    return true;
  }

  private generateResources(
    blocks: Block[],
    offsetQ: number,
    offsetR: number,
    maxY: number,
    biomeMap: Map<string, string>,
    resourceMap: Set<string>
  ): void {
    // Создаем карту блоков для быстрого доступа
    const blockMap = new Map<string, Block>();
    blocks.forEach(block => {
      const key = `${block.position.q},${block.position.r},${block.position.y}`;
      blockMap.set(key, block);
    });

    for (let q = 0; q < this.chunkSize; q++) {
      for (let r = 0; r < this.chunkSize; r++) {
        const worldQ = offsetQ + q;
        const worldR = offsetR + r;
        const biome = biomeMap.get(`${q},${r}`) || 'grassland';

        for (let y = 8; y < maxY - 8; y++) {
          const blockKey = `${worldQ},${worldR},${y}`;
          const resourceKey = `${worldQ},${worldR},${y}`;
          
          // Проверяем, что позиция не занята ресурсом
          if (resourceMap.has(resourceKey)) {
            continue;
          }

          const block = blockMap.get(blockKey);

          // Ресурсы появляются только в каменных блоках
          if (!block || block.type !== 'stone') {
            continue;
          }

          // Ресурсы появляются глубже
          const depthFactor = (y - 8) / (maxY - 16);
          // Используем шум для распределения ресурсов
          const resourceNoise = this.simpleNoise(worldQ * 0.04, worldR * 0.04 + y * 0.08);

          // Частота зависит от глубины и биома
          let resourceThreshold = 0.94 - depthFactor * 0.12;
          if (biome === 'stone') {
            resourceThreshold -= 0.06; // Больше ресурсов в каменных биомах
          }

          if (resourceNoise > resourceThreshold) {
            // Определяем тип ресурса на основе глубины и шума
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
              resourceMap.add(resourceKey);
              
              // Помечаем соседние позиции как занятые (чтобы ресурсы не накладывались)
              for (let dq = -1; dq <= 1; dq++) {
                for (let dr = -1; dr <= 1; dr++) {
                  if (dq === 0 && dr === 0) continue;
                  resourceMap.add(`${worldQ + dq},${worldR + dr},${y}`);
                }
              }
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
