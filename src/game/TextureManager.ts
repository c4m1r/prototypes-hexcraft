import * as THREE from 'three';

export interface TextureAtlasConfig {
  atlasSize: number; // 320
  tileSize: number; // 32
  rows: number; // 4
  cols: number; // 10
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
      side: { row: 0, col: 1 } // grass
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
      opacity: 0.9
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

    // Ряд 3: ресурсы
    this.blockConfigs.set('wood', {
      top: { row: 2, col: 0 }, // wood
      side: { row: 2, col: 0 } // wood
    });
    this.blockConfigs.set('leaves', {
      top: { row: 2, col: 1 }, // leaves
      side: { row: 2, col: 1 }, // leaves
      transparent: true,
      opacity: 0.75
    });
  }

  private prepareAnimatedTextures(): void {
    if (!this.atlasTexture) return;

    const image = this.atlasTexture.image as HTMLImageElement;
    const canvas = document.createElement('canvas');
    canvas.width = this.config.tileSize;
    canvas.height = this.config.tileSize;
    const ctx = canvas.getContext('2d')!;

    // Подготовка анимированных текстур для лавы
    const lavaFrames: THREE.DataTexture[] = [];
    for (let i = 0; i < 3; i++) {
      ctx.clearRect(0, 0, this.config.tileSize, this.config.tileSize);
      ctx.drawImage(
        image,
        i * this.config.tileSize,
        1 * this.config.tileSize,
        this.config.tileSize,
        this.config.tileSize,
        0,
        0,
        this.config.tileSize,
        this.config.tileSize
      );
      const imageData = ctx.getImageData(0, 0, this.config.tileSize, this.config.tileSize);
      const texture = new THREE.DataTexture(
        imageData.data,
        this.config.tileSize,
        this.config.tileSize,
        THREE.RGBAFormat
      );
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.NearestFilter;
      texture.needsUpdate = true;
      lavaFrames.push(texture);
    }
    this.animatedTextures.set('lava', lavaFrames);

    // Подготовка анимированных текстур для воды
    const waterFrames: THREE.DataTexture[] = [];
    for (let i = 0; i < 3; i++) {
      ctx.clearRect(0, 0, this.config.tileSize, this.config.tileSize);
      ctx.drawImage(
        image,
        (3 + i) * this.config.tileSize,
        1 * this.config.tileSize,
        this.config.tileSize,
        this.config.tileSize,
        0,
        0,
        this.config.tileSize,
        this.config.tileSize
      );
      const imageData = ctx.getImageData(0, 0, this.config.tileSize, this.config.tileSize);
      const texture = new THREE.DataTexture(
        imageData.data,
        this.config.tileSize,
        this.config.tileSize,
        THREE.RGBAFormat
      );
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.NearestFilter;
      texture.needsUpdate = true;
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

  createMaterial(blockId: string, time: number = 0, fallbackColor?: string): THREE.MeshLambertMaterial | THREE.ShaderMaterial | null {
    const config = this.blockConfigs.get(blockId);
    // Если нет конфигурации или атласа, возвращаем fallback цветной материал
    if (!config || !this.atlasTexture) {
      if (fallbackColor) {
        const isLeaves = blockId === 'leaves';
        return new THREE.MeshLambertMaterial({
          color: fallbackColor,
          transparent: isLeaves || blockId === 'water' || blockId === 'lava',
          opacity: isLeaves ? 0.75 : (blockId === 'water' ? 0.7 : (blockId === 'lava' ? 1 : 1)),
          side: (isLeaves || blockId === 'water' || blockId === 'lava') ? THREE.DoubleSide : THREE.FrontSide
        });
      }
      return null;
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
      const topUV = this.getUVCoordinates(config.top.row, config.top.col);
      const sideUV = this.getUVCoordinates(config.side.row, config.side.col);

      topTexture = this.createTextureFromAtlas(topUV);
      sideTexture = this.createTextureFromAtlas(sideUV);
    }

    // Если top текстура не задана или текстуры одинаковые, используем side для обеих
    const hasTopTexture = config.top.row !== undefined && config.top.col !== undefined;
    const texturesDifferent = config.top.row !== config.side.row || config.top.col !== config.side.col;
    const useCustomShader = hasTopTexture && texturesDifferent;

    // Включаем прозрачность только если она задана в конфиге или если текстура имеет альфа-канал
    // Для leaves, water, lava всегда включаем прозрачность
    const shouldBeTransparent = config.transparent || blockId === 'leaves' || blockId === 'water' || blockId === 'lava';
    
    if (useCustomShader) {
      return this.createDualTextureMaterial(topTexture, sideTexture, config, shouldBeTransparent);
    } else {
      // Если текстуры одинаковые или top не задан, используем side для всех граней
      const material = new THREE.MeshLambertMaterial({
        map: sideTexture,
        transparent: shouldBeTransparent,
        opacity: config.opacity !== undefined ? config.opacity : 1,
        side: shouldBeTransparent ? THREE.DoubleSide : THREE.FrontSide,
        alphaTest: shouldBeTransparent ? 0.1 : 0 // Используем альфа-канал из текстуры
      });

      (material as any).topTexture = sideTexture; // Используем side как fallback
      (material as any).sideTexture = sideTexture;

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
      uniform vec3 ambientLightColor;
      uniform vec3 directionalLightColor;
      uniform vec3 directionalLightDirection;
      
      varying vec3 vWorldNormal;
      varying vec2 vUv;

      void main() {
        // Определяем, является ли грань верхней (нормаль близка к (0, 1, 0))
        float topFactor = max(0.0, dot(vWorldNormal, vec3(0.0, 1.0, 0.0)));
        // Используем верхнюю текстуру для верхней грани, боковую для остальных
        vec4 topColor = texture2D(topTexture, vUv);
        vec4 sideColor = texture2D(sideTexture, vUv);
        
        // Смешиваем текстуры в зависимости от нормали
        vec4 color = mix(sideColor, topColor, smoothstep(0.7, 1.0, topFactor));
        
        // Lambert освещение
        vec3 lightDir = normalize(directionalLightDirection);
        float NdotL = max(dot(vWorldNormal, lightDir), 0.0);
        vec3 lighting = ambientLightColor + directionalLightColor * NdotL;
        color.rgb *= lighting;
        
        // Используем альфа-канал из текстуры, умножаем на opacity только если нужно
        float finalAlpha = color.a;
        if (opacity < 1.0) {
          finalAlpha = color.a * opacity;
        }
        
        gl_FragColor = vec4(color.rgb, finalAlpha);
      }
    `;

    const material = new THREE.ShaderMaterial({
      uniforms: {
        topTexture: { value: topTexture },
        sideTexture: { value: sideTexture },
        opacity: { value: config.opacity !== undefined ? config.opacity : 1.0 },
        ambientLightColor: { value: new THREE.Color(0xffffff).multiplyScalar(0.6) },
        directionalLightColor: { value: new THREE.Color(0xffffff).multiplyScalar(0.8) },
        directionalLightDirection: { value: new THREE.Vector3(0.5, 1, 0.5).normalize() }
      },
      vertexShader,
      fragmentShader,
      transparent: transparent,
      side: transparent ? THREE.DoubleSide : THREE.FrontSide,
      alphaTest: transparent ? 0.1 : 0 // Используем альфа-канал из текстуры
    });

    return material;
  }

  private createTextureFromAtlas(uv: { u: number; v: number; uSize: number; vSize: number }): THREE.Texture {
    if (!this.atlasTexture) {
      throw new Error('Atlas texture not loaded');
    }

    const texture = this.atlasTexture.clone();
    texture.offset.set(uv.u, 1 - uv.v - uv.vSize);
    texture.repeat.set(uv.uSize, uv.vSize);
    // Включаем использование альфа-канала из текстуры
    texture.format = THREE.RGBAFormat;
    return texture;
  }

  updateAnimation(deltaTime: number): void {
    this.animationTime += deltaTime;
  }

  getAnimationTime(): number {
    return this.animationTime;
  }
}

