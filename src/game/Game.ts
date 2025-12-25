import * as THREE from 'three';
import { World } from './World';
import { PlayerController } from './PlayerController';
import { RaycastManager } from './RaycastManager';
import { DayNightCycle } from './DayNightCycle';
import { GameSettings } from '../types/settings';
import { InventorySlot } from '../types/game';

export interface GameState {
  playerPosition: { x: number; y: number; z: number };
  isFlying: boolean;
  targetBlock: string | null;
  showFogBarrier: boolean;
  currentTime: string;
  health: number;
  stamina: number;
  hunger: number;
  generationCode: string;
  generationStatus: string;
  playerState: {
    name: string;
    inventory: InventorySlot[];
    hotbar: InventorySlot[];
  };
}

export class Game {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private world: World;
  private player: PlayerController;
  private raycastManager: RaycastManager;
  private dayNightCycle: DayNightCycle;
  private lastTime: number = 0;
  private onStateChange?: (state: GameState) => void;
  private ambientLight: THREE.AmbientLight;
  private directionalLight: THREE.DirectionalLight;
  private health: number = 100;
  private stamina: number = 100;
  private hunger: number = 100;
  private staminaDrainAccumulator: number = 0;
  private staminaRegenAccumulator: number = 0;
  private cachedLighting?: {
    ambientIntensity: number;
    directionalIntensity: number;
    directionalX: number;
    directionalY: number;
    directionalZ: number;
  };
  private playerInventory: InventorySlot[] = [];
  private playerHotbar: InventorySlot[] = [];
  private playerName: string = 'Player';

  private initializeInventory() {
    const INVENTORY_SIZE = 27;
    const HOTBAR_SIZE = 9;

    // Инициализация пустого инвентаря
    this.playerInventory = Array(INVENTORY_SIZE).fill(null).map(() => ({ item: null, count: 0 }));

    // Инициализация хотбара с бесконечными предметами
    const infiniteItems = [
      { id: 'grass', name: 'Grass Block', type: 'block', stackSize: 1, maxStackSize: 1, rarity: 'common', color: '#4a7c3a', infinite: true },
      { id: 'dirt', name: 'Dirt Block', type: 'block', stackSize: 1, maxStackSize: 1, rarity: 'common', color: '#8b5a3c', infinite: true },
      { id: 'stone', name: 'Stone Block', type: 'block', stackSize: 1, maxStackSize: 1, rarity: 'common', color: '#7a7a7a', infinite: true },
      { id: 'sand', name: 'Sand Block', type: 'block', stackSize: 1, maxStackSize: 1, rarity: 'common', color: '#ddc689', infinite: true },
      { id: 'wood', name: 'Wood Block', type: 'block', stackSize: 1, maxStackSize: 1, rarity: 'common', color: '#6b4423', infinite: true },
      { id: 'leaves', name: 'Leaves Block', type: 'block', stackSize: 1, maxStackSize: 1, rarity: 'common', color: '#2d5016', infinite: true },
      { id: 'snow', name: 'Snow Block', type: 'block', stackSize: 1, maxStackSize: 1, rarity: 'common', color: '#e8f2f7', infinite: true },
      { id: 'ice', name: 'Ice Block', type: 'block', stackSize: 1, maxStackSize: 1, rarity: 'common', color: '#b8d8e8', infinite: true },
      { id: 'lava', name: 'Lava Block', type: 'block', stackSize: 1, maxStackSize: 1, rarity: 'common', color: '#ff4500', infinite: true },
    ];

    this.playerHotbar = Array(HOTBAR_SIZE).fill(null).map(() => ({ item: null, count: 0 }));
    infiniteItems.forEach((item, index) => {
      if (index < HOTBAR_SIZE) {
        this.playerHotbar[index] = { item, count: item.maxStackSize };
      }
    });

    // Добавим несколько тестовых предметов в инвентарь
    this.playerInventory[0] = { item: { id: 'stone', name: 'Stone Block', type: 'block', stackSize: 64, maxStackSize: 64, rarity: 'common', color: '#7a7a7a' }, count: 64 };
    this.playerInventory[1] = { item: { id: 'wood', name: 'Wood Block', type: 'block', stackSize: 32, maxStackSize: 64, rarity: 'common', color: '#6b4423' }, count: 32 };
    this.playerInventory[2] = { item: { id: 'bronze', name: 'Bronze Ore', type: 'material', stackSize: 16, maxStackSize: 64, rarity: 'uncommon', color: '#cd7f32' }, count: 16 };
  }

  constructor(canvas: HTMLCanvasElement, onStateChange?: (state: GameState) => void, settings?: GameSettings) {
    this.onStateChange = onStateChange;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.Fog(0x87ceeb, 50, 150);

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.directionalLight.position.set(50, 100, 50);
    this.scene.add(this.directionalLight);

    this.dayNightCycle = new DayNightCycle(this.scene, this.directionalLight, this.ambientLight);

    this.world = new World(this.scene, settings);
    // Инициализируем мир (без генерации чанков - они будут генерироваться асинхронно в update())
    this.world.initialize();

    this.player = new PlayerController(this.camera);

    // Инициализация инвентаря
    this.initializeInventory();

    this.raycastManager = new RaycastManager(this.scene, this.world);

    this.setupEventListeners();
    this.animate(0);
  }

  setPlayerPosition(x: number, y: number, z: number): void {
    this.player.position.set(x, y, z);
    this.camera.position.copy(this.player.position);
  }

  getSpawnHeight(q: number, r: number): number | null {
    return this.world.getHighestBlockAt(q, r);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    document.addEventListener('mousedown', (e) => {
      if (document.pointerLockElement !== document.body) return;

      if (e.button === 0) {
        this.raycastManager.removeBlock(this.camera);
      } else if (e.button === 2) {
        const selectedSlot = this.player.getSelectedSlot();
        const selectedItem = this.playerHotbar[selectedSlot]?.item;
        if (selectedItem && selectedItem.type === 'block') {
          this.raycastManager.placeBlock(this.camera, selectedItem.id);
        }
      }
    });

    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    document.addEventListener('keydown', (e) => {
      if (e.code === 'KeyF') {
        this.world.toggleFogBarrier();
      }
    });
  }

  private animate(currentTime: number): void {
    requestAnimationFrame((time) => this.animate(time));

    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    let didJump = false;
    this.player.update(
      Math.min(deltaTime, 0.1),
      (x, z) => this.world.getHeightAt(x, z),
      () => {
        didJump = true;
      },
      (x, y, z) => this.world.getBlockTypeAt(x, y, z),
      (blockType) => this.world.getPassableSlowdown(blockType)
    );

    this.updateStamina(Math.min(deltaTime, 0.1), didJump);

    this.world.update(this.player.position.x, this.player.position.z);

    this.dayNightCycle.update(Math.min(deltaTime, 0.1));

    // ОПТИМИЗАЦИЯ: Обновляем освещение только если оно изменилось
    // Кешируем предыдущие значения для сравнения
    if (!this.cachedLighting) {
      this.cachedLighting = {
        ambientIntensity: -1,
        directionalIntensity: -1,
        directionalX: 0,
        directionalY: 0,
        directionalZ: 0
      };
    }
    
    const ambientIntensity = this.ambientLight.intensity;
    const directionalIntensity = this.directionalLight.intensity;
    const directionalPos = this.directionalLight.position;
    
    // Проверяем, изменилось ли освещение
    const lightingChanged = 
      this.cachedLighting.ambientIntensity !== ambientIntensity ||
      this.cachedLighting.directionalIntensity !== directionalIntensity ||
      Math.abs(this.cachedLighting.directionalX - directionalPos.x) > 0.01 ||
      Math.abs(this.cachedLighting.directionalY - directionalPos.y) > 0.01 ||
      Math.abs(this.cachedLighting.directionalZ - directionalPos.z) > 0.01;
    
    if (lightingChanged) {
      const ambientColor = new THREE.Color(0xffffff).multiplyScalar(ambientIntensity);
      const directionalColor = new THREE.Color(0xffffff).multiplyScalar(directionalIntensity);
      const directionalDirection = directionalPos.clone().normalize();
      this.world.setLighting(ambientColor, directionalColor, directionalDirection);
      
      // Обновляем кеш
      this.cachedLighting = {
        ambientIntensity,
        directionalIntensity,
        directionalX: directionalPos.x,
        directionalY: directionalPos.y,
        directionalZ: directionalPos.z
      };
    }

    const targetedBlock = this.raycastManager.getTargetedBlock(this.camera);
    const worldDebug = this.world.getDebugInfo();

    if (this.onStateChange) {
      this.onStateChange({
        playerPosition: {
          x: this.player.position.x,
          y: this.player.position.y,
          z: this.player.position.z
        },
        isFlying: this.player.isFlying,
        targetBlock: targetedBlock?.name || null,
        showFogBarrier: this.world.getFogBarrierState(),
        currentTime: this.dayNightCycle.getCurrentTime(),
        health: this.health,
        stamina: this.stamina,
        hunger: this.hunger,
        generationCode: `seed-${worldDebug.seed}`,
        generationStatus: `chunks:${worldDebug.loadedChunks} meshes:${worldDebug.meshBatches} rd:${worldDebug.renderDistance} cs:${worldDebug.chunkSize}/${worldDebug.maxLoadedChunks} loads:${worldDebug.loadAttempts} init:${worldDebug.initialized ? '1' : '0'} emergency:${worldDebug.emergencyAttempts}/${worldDebug.maxEmergencyAttempts}`,
        playerState: {
          name: this.playerName,
          inventory: this.playerInventory,
          hotbar: this.playerHotbar
        }
      });
    }

    this.renderer.render(this.scene, this.camera);
  }

  updateInventory(inventory: InventorySlot[]) {
    this.playerInventory = inventory;
  }

  updateHotbar(hotbar: InventorySlot[]) {
    this.playerHotbar = hotbar;
  }

  private updateStamina(deltaTime: number, didJump: boolean): void {
    if (didJump && this.stamina > 0) {
      this.stamina = Math.max(0, this.stamina - 5);
    }

    if (this.player.isSprinting && this.stamina > 0) {
      this.staminaDrainAccumulator += deltaTime;
      while (this.staminaDrainAccumulator >= 0.5 && this.stamina > 0) {
        this.stamina = Math.max(0, this.stamina - 1);
        this.staminaDrainAccumulator -= 0.5;
      }
      this.staminaRegenAccumulator = 0;
    } else {
      this.staminaDrainAccumulator = 0;

      if (this.stamina < 100) {
        this.staminaRegenAccumulator += deltaTime;
        while (this.staminaRegenAccumulator >= 1 && this.stamina < 100) {
          this.stamina = Math.min(100, this.stamina + 1);
          this.staminaRegenAccumulator -= 1;
        }
      } else {
        this.staminaRegenAccumulator = 0;
      }
    }

    this.player.setSprintAllowed(this.stamina > 0);
  }
}
