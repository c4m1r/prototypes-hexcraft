import * as THREE from 'three';

// Extend THREE.Material to include custom animation properties
declare module 'three' {
  interface Material {
    topTexture?: THREE.Texture;
    sideTexture?: THREE.Texture;
    animationOffset?: number;
  }
}

export interface TextureAtlasConfig {
  atlasSize: number; // 320
  tileSize: number; // 32
  rows: number; // 4
  cols: number; // 12
}

export interface BlockTextureConfig {
  top: { row: number; col: number };
  side: { row: number; col: number };
  animated?: boolean;
  animationFrames?: number;
  transparent?: boolean;
  opacity?: number;
}

export class TextureManager {
  private textureLoader: THREE.TextureLoader;
  private atlasTexture: THREE.Texture | null = null;
  private config: TextureAtlasConfig;
  private blockConfigs: Map<string, BlockTextureConfig> = new Map();
  private animatedTextures: Map<string, THREE.DataTexture[]> = new Map();
  private animationTime: number = 0;

  constructor(config: TextureAtlasConfig) {
    this.textureLoader = new THREE.TextureLoader();
    this.config = config;
    this.setupBlockConfigs();
  }

  async loadAtlas(path: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.textureLoader.load(
        path,
        texture => {
          texture.magFilter = THREE.NearestFilter;
          texture.minFilter = THREE.NearestFilter;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        this.atlasTexture = texture;
          this.prepareAnimatedTextures();
          resolve();
        },
        undefined,
        reject
      );
    });
  }

  private setupBlockConfigs(): void {
    // Ряд 1: grass-top, grass, dirt, stone, sand, snow, ice, bronze, silver, gold
    this.blockConfigs.set('grass', {
      top: { row: 0, col: 0 }, // grass-top
      side: { row: 0, col: 1 }, // grass
      transparent: false // Grass не прозрачный
    });
    this.blockConfigs.set('dirt', {
      top: { row: 0, col: 2 }, // dirt
      side: { row: 0, col: 2 } // dirt
    });
    this.blockConfigs.set('stone', {
      top: { row: 0, col: 3 }, // stone
      side: { row: 0, col: 3 } // stone
    });
    this.blockConfigs.set('sand', {
      top: { row: 0, col: 4 }, // sand
      side: { row: 0, col: 4 } // sand
    });
    this.blockConfigs.set('snow', {
      top: { row: 0, col: 5 }, // snow
      side: { row: 0, col: 5 } // snow
    });
    this.blockConfigs.set('ice', {
      top: { row: 0, col: 6 }, // ice
      side: { row: 0, col: 6 }, // ice
      transparent: true,
      opacity: 0.5
    });

    // Ряд 2: анимированные блоки
    this.blockConfigs.set('lava', {
      top: { row: 1, col: 0 }, // lava1
      side: { row: 1, col: 0 }, // lava1
      animated: true,
      animationFrames: 3
    });
    this.blockConfigs.set('water', {
      top: { row: 1, col: 3 }, // water1
      side: { row: 1, col: 3 }, // water1
      animated: true,
      animationFrames: 3,
      transparent: true,
      opacity: 0.7
    });

    // Ряд 3: ресурсы (начинается с x=32, col=1)
    this.blockConfigs.set('wood', {
      top: { row: 2, col: 1 }, // wood - ряд 2, x=32 (col=1)
      side: { row: 2, col: 1 } // wood
    });
    this.blockConfigs.set('leaves', {
      top: { row: 2, col: 2 }, // leaves - ряд 2, x=64 (col=2)
      side: { row: 2, col: 2 }, // leaves
      transparent: true,
      opacity: 0.75
    });

    // Ряд 4: новые блоки (начинается с x=64, col=2)
    this.blockConfigs.set('red_mushroom', {
      top: { row: 3, col: 2 }, // red mushroom - ряд 3, x=64 (col=2)
      side: { row: 3, col: 2 } // red mushroom
    });
    this.blockConfigs.set('mushroom', {
      top: { row: 3, col: 3 }, // mushroom - ряд 3, x=96 (col=3)
      side: { row: 3, col: 3 } // mushroom
    });

    this.blockConfigs.set('spruce', {
      top: { row: 3, col: 4 }, // spruce - ряд 3, x=128 (col=4)
      side: { row: 3, col: 4 }
    });

    this.blockConfigs.set('pine', {
      top: { row: 3, col: 5 }, // pine - ряд 3, x=160 (col=5)
      side: { row: 3, col: 5 },
      transparent: true,
      opacity: 0.85
    });

    this.blockConfigs.set('aethergrass', {
      top: { row: 3, col: 6 }, // aethergrass-top - ряд 3, x=192 (col=6)
      side: { row: 3, col: 7 }, // aethergrass-side - ряд 3, x=224 (col=7)
      transparent: false // Aethergrass не прозрачный
    });

    this.blockConfigs.set('aether', {
      top: { row: 3, col: 8 }, // aether - ряд 3, x=256 (col=8)
      side: { row: 3, col: 8 }
    });

    this.blockConfigs.set('crystal', {
      top: { row: 3, col: 9 }, // crystal - ряд 3, x=288 (col=9)
      side: { row: 3, col: 9 }
    });

    this.blockConfigs.set('aetherwood', {
      top: { row: 3, col: 10 }, // aetherwood - ряд 3, x=320 (col=10)
      side: { row: 3, col: 10 }
    });

    this.blockConfigs.set('aetherstone', {
      top: { row: 3, col: 11 }, // aetherstone - ряд 3, x=352 (col=11)
      side: { row: 3, col: 11 }
    });

    this.blockConfigs.set('foo', {
      top: { row: 3, col: 0 }, // foo - ряд 3, x=0 (col=0) - перед началом ряда 3
      side: { row: 3, col: 0 }
    });

    this.blockConfigs.set('aetherleaf', {
      top: { row: 3, col: 1 }, // aetherleaf - ряд 3, x=32 (col=1) - после foo
      side: { row: 3, col: 1 },
      transparent: true,
      opacity: 0.4
    });

    // Ряд 1: дополнительные блоки
    this.blockConfigs.set('bronze', {
      top: { row: 0, col: 7 }, // bronze
      side: { row: 0, col: 7 } // bronze
    });
    this.blockConfigs.set('silver', {
      top: { row: 0, col: 8 }, // silver
      side: { row: 0, col: 8 } // silver
    });
    this.blockConfigs.set('gold', {
      top: { row: 0, col: 9 }, // gold
      side: { row: 0, col: 9 } // gold
    });

  }

  private prepareAnimatedTextures(): void {
    if (!this.atlasTexture) return;

    // Подготовка анимированных текстур для лавы (ряд 1, колонки 0-2)
    const lavaFrames: THREE.DataTexture[] = [];
    for (let i = 0; i < 3; i++) {
      const texture = this.extractTextureFromAtlas(1, i);
      lavaFrames.push(texture);
    }
    this.animatedTextures.set('lava', lavaFrames);

    // Подготовка анимированных текстур для воды (ряд 1, колонки 3-5)
    const waterFrames: THREE.DataTexture[] = [];
    for (let i = 0; i < 3; i++) {
      const texture = this.extractTextureFromAtlas(1, 3 + i);
      waterFrames.push(texture);
    }
    this.animatedTextures.set('water', waterFrames);
  }

  getUVCoordinates(row: number, col: number): { u: number; v: number; uSize: number; vSize: number } {
    const u = col / this.config.cols;
    const v = row / this.config.rows;
    const uSize = 1 / this.config.cols;
    const vSize = 1 / this.config.rows;
    return { u, v, uSize, vSize };
  }

  private extractTextureFromAtlas(row: number, col: number): THREE.DataTexture {
    if (!this.atlasTexture) {
      throw new Error('Atlas texture not loaded');
    }

    const image = this.atlasTexture.image as HTMLImageElement;

    const canvas = document.createElement('canvas');
    canvas.width = this.config.tileSize;
    canvas.height = this.config.tileSize;
    const ctx = canvas.getContext('2d')!;

    // Вырезаем нужный квадрат из атласа
    const sourceX = col * this.config.tileSize;
    const sourceY = row * this.config.tileSize;

    ctx.drawImage(
      image,
      sourceX, sourceY, this.config.tileSize, this.config.tileSize, // источник
      0, 0, this.config.tileSize, this.config.tileSize // назначение
    );

    const imageData = ctx.getImageData(0, 0, this.config.tileSize, this.config.tileSize);
    
    // Убеждаемся, что альфа-канал правильный для непрозрачных текстур
    // Исправляем пиксели с низким альфа-каналом (артефакты сжатия)
    // НО только для непрозрачных текстур - для прозрачных блоков сохраняем оригинальный альфа
    const data = imageData.data;
    // Проверяем, является ли текстура в основном непрозрачной (для автоматического определения)
    let transparentPixels = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 128) {
        transparentPixels++;
      }
    }
    const isMostlyTransparent = transparentPixels > (data.length / 4) * 0.3; // Если больше 30% прозрачных пикселей
    
    // Исправляем альфа только для непрозрачных текстур
    if (!isMostlyTransparent) {
      for (let i = 3; i < data.length; i += 4) {
        // Если альфа-канал очень маленький (прозрачный пиксель), устанавливаем его в 255 (непрозрачный)
        // Это предотвращает случайную прозрачность из-за артефактов сжатия или неправильной обработки
        // Используем порог 200 вместо 128 для более надежной обработки
        if (data[i] < 200) {
          data[i] = 255;
        }
      }
    }

    const texture = new THREE.DataTexture(
      data,
      this.config.tileSize,
      this.config.tileSize,
      THREE.RGBAFormat
    );
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;

    return texture;
  }

  createMaterial(blockId: string, time: number = 0, fallbackColor?: string): THREE.MeshLambertMaterial | THREE.ShaderMaterial | null {
    const config = this.blockConfigs.get(blockId);
    // Если нет конфигурации или атласа, возвращаем fallback фиолетовый материал (error debug)
    if (!config || !this.atlasTexture) {
      return new THREE.MeshLambertMaterial({
        color: 0xff00ff, // Фиолетовый цвет для блоков без текстуры
        side: THREE.DoubleSide
      });
    }

    let topTexture: THREE.Texture;
    let sideTexture: THREE.Texture;

    if (config.animated && config.animationFrames) {
      const frames = this.animatedTextures.get(blockId);
      if (!frames) return null;

      const frameIndex = Math.floor((time * 2) % config.animationFrames);
      topTexture = frames[frameIndex];
      sideTexture = frames[frameIndex];
    } else {
      // Используем side для top, если top не задан или совпадает с side
      const useTopTexture = config.top.row !== undefined && config.top.col !== undefined &&
                            (config.top.row !== config.side.row || config.top.col !== config.side.col);
      
      if (useTopTexture) {
        topTexture = this.getTextureFromAtlas(config.top.row, config.top.col);
      } else {
        // Если top не задан, используем side
        topTexture = this.getTextureFromAtlas(config.side.row, config.side.col);
      }
      sideTexture = this.getTextureFromAtlas(config.side.row, config.side.col);
    }

    // Проверяем, нужно ли использовать разные текстуры для top и side
    const hasTopTexture = config.top.row !== undefined && config.top.col !== undefined;
    const texturesDifferent = hasTopTexture && (config.top.row !== config.side.row || config.top.col !== config.side.col);
    
    // Включаем прозрачность только если она явно задана в конфиге
    // Для leaves, water, ice, lava, pine, aetherleaf всегда включаем прозрачность
    // Для остальных блоков прозрачность определяется только конфигом
    const shouldBeTransparent = (config.transparent === true) || 
                                blockId === 'leaves' || 
                                blockId === 'water' || 
                                blockId === 'ice' || 
                                blockId === 'lava' ||
                                blockId === 'pine' ||
                                blockId === 'aetherleaf';
    
    // Для всех блоков с разными текстурами используем кастомный шейдер
    if (texturesDifferent) {
      return this.createDualTextureMaterial(topTexture, sideTexture, config, shouldBeTransparent);
    } else {
      // Если текстуры одинаковые или top не задан, используем side для всех граней
      // Проверяем, что текстура загружена
      if (!sideTexture) {
        console.warn(`[TextureManager] Failed to load texture for block: ${blockId}`);
        return new THREE.MeshLambertMaterial({
          color: 0xff00ff, // Фиолетовый цвет для блоков без текстуры
          side: THREE.DoubleSide
        });
      }

      const material = new THREE.MeshLambertMaterial({
        map: sideTexture,
        transparent: shouldBeTransparent,
        opacity: config.opacity !== undefined ? config.opacity : 1,
        side: THREE.DoubleSide, // Всегда DoubleSide для правильного отображения с обеих сторон
        alphaTest: shouldBeTransparent ? 0.1 : 0.0, // Для непрозрачных блоков не используем alphaTest
        color: 0xffffff // Явно задаем белый цвет как базу для текстуры
      });

      material.topTexture = sideTexture; // Используем side как fallback
      material.sideTexture = sideTexture;

      return material;
    }
  }

  private createDualTextureMaterial(
    topTexture: THREE.Texture,
    sideTexture: THREE.Texture,
    config: BlockTextureConfig,
    transparent: boolean = false
  ): THREE.ShaderMaterial {
    const vertexShader = `
      varying vec3 vWorldNormal;
      varying vec2 vUv;

      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform sampler2D topTexture;
      uniform sampler2D sideTexture;
      uniform float opacity;
      uniform bool isTransparent;
      uniform vec3 ambientLightColor;
      uniform vec3 directionalLightColor;
      uniform vec3 directionalLightDirection;
      
      varying vec3 vWorldNormal;
      varying vec2 vUv;

      void main() {
        // Сначала загружаем обе текстуры
        vec4 topColor = texture2D(topTexture, vUv);
        vec4 sideColor = texture2D(sideTexture, vUv);
        
        // Определяем, является ли грань верхней (нормаль близка к (0, 1, 0))
        // Используем более строгий порог для четкого разделения верх/бок
        float topFactor = dot(vWorldNormal, vec3(0.0, 1.0, 0.0));
        bool isTopFace = topFactor > 0.9; // Только для почти вертикальных верхних граней
        
        // Начинаем с боковой текстуры для всех граней
        vec4 color = sideColor;
        
        // Заменяем только верхнюю грань верхней текстурой
        if (isTopFace) {
          color = topColor;
        }
        
        // Для непрозрачных блоков ВСЕГДА устанавливаем альфа = 1.0 ДО освещения
        // Это критично для правильного отображения
        float finalAlpha;
        if (!isTransparent) {
          finalAlpha = 1.0;
          // Игнорируем альфа-канал из текстуры для непрозрачных блоков
          color.a = 1.0;
        } else {
          // Для прозрачных блоков используем альфа из текстуры с учетом opacity
          finalAlpha = color.a * opacity;
        }
        
        // Lambert освещение применяется после установки альфы
        vec3 lightDir = normalize(directionalLightDirection);
        float NdotL = max(dot(vWorldNormal, lightDir), 0.0);
        vec3 lighting = ambientLightColor + directionalLightColor * NdotL;
        color.rgb *= lighting;
        
        // Для непрозрачных блоков отбрасываем пиксели с очень низкой альфой (артефакты сжатия)
        // Но это не должно происходить, так как мы уже установили альфа = 1.0
        if (!isTransparent && finalAlpha < 0.5) {
          discard;
        }
        
        gl_FragColor = vec4(color.rgb, finalAlpha);
      }
    `;

    const material = new THREE.ShaderMaterial({
      uniforms: {
        topTexture: { value: topTexture },
        sideTexture: { value: sideTexture },
        opacity: { value: config.opacity !== undefined ? config.opacity : 1.0 },
        isTransparent: { value: transparent },
        ambientLightColor: { value: new THREE.Color(0xffffff).multiplyScalar(0.6) },
        directionalLightColor: { value: new THREE.Color(0xffffff).multiplyScalar(0.8) },
        directionalLightDirection: { value: new THREE.Vector3(0.5, 1, 0.5).normalize() }
      },
      vertexShader,
      fragmentShader,
      transparent: transparent,
      side: THREE.DoubleSide, // Всегда DoubleSide для правильного отображения с обеих сторон
      alphaTest: transparent ? 0.1 : 0.0 // Для непрозрачных блоков не используем alphaTest (обрабатывается в шейдере через discard)
    });

    return material;
  }

  // Кэш для созданных текстур
  private textureCache: Map<string, THREE.DataTexture> = new Map();

  private getTextureFromAtlas(row: number, col: number): THREE.DataTexture {
    const cacheKey = `${row}-${col}`;
    if (this.textureCache.has(cacheKey)) {
      return this.textureCache.get(cacheKey)!;
    }

    const texture = this.extractTextureFromAtlas(row, col);
    this.textureCache.set(cacheKey, texture);
    return texture;
  }

  updateAnimation(deltaTime: number): void {
    this.animationTime += deltaTime;
  }

  getAnimationTime(): number {
    return this.animationTime;
  }

  // Публичный метод для проверки загрузки атласа
  isAtlasLoaded(): boolean {
    return this.atlasTexture !== null;
  }
}

