import * as THREE from 'three';
import { World } from './World';
import { PlayerController } from './PlayerController';
import { RaycastManager } from './RaycastManager';
import { DayNightCycle } from './DayNightCycle';
import { GameSettings } from '../types/settings';
import { InventorySlot, DroppedItem, ITEMS } from '../types/game';
import { hexToWorld } from '../utils/hexUtils';

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
  droppedItems: DroppedItem[];
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
  private droppedItems: DroppedItem[] = [];
  private nextItemId: number = 0;
  private droppedItemMeshes: Map<string, THREE.Mesh> = new Map();

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
    this.playerInventory[0] = { item: { id: 'stone', name: 'Stone Block', type: 'block', stackSize: 72, maxStackSize: 72, rarity: 'common', color: '#7a7a7a' }, count: 72 };
    this.playerInventory[1] = { item: { id: 'wood', name: 'Wood Block', type: 'block', stackSize: 40, maxStackSize: 72, rarity: 'common', color: '#6b4423' }, count: 40 };
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
        // Разрушение блока - создаем dropped item
        const removedBlock = this.raycastManager.removeBlock(this.camera);
        if (removedBlock) {
          this.createDroppedItem(removedBlock);
        }
      } else if (e.button === 2) {
        // Размещение блока - уменьшаем количество в инвентаре
        const selectedSlot = this.player.getSelectedSlot();
        const selectedItem = this.playerHotbar[selectedSlot]?.item;
        if (selectedItem && selectedItem.type === 'block') {
          // Проверяем есть ли предмет в инвентаре
          if (this.playerHotbar[selectedSlot].count > 0) {
            // Размещаем блок
            const placed = this.raycastManager.placeBlock(this.camera, selectedItem.id);
            if (placed) {
              // Уменьшаем количество
              this.playerHotbar[selectedSlot].count--;
              // Если количество стало 0 - удаляем предмет
              if (this.playerHotbar[selectedSlot].count === 0) {
                this.playerHotbar[selectedSlot].item = null;
              }
            }
          }
        }
      }
    });

    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    document.addEventListener('keydown', (e) => {
      if (document.pointerLockElement !== document.body) return;

      if (e.key.toLowerCase() === 'e') {
        // Подбор предметов
        this.pickupNearbyItems();
      }
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
        },
        droppedItems: this.droppedItems
      });
    }

    // Обновляем dropped items (физика, гравитация)
    this.updateDroppedItems(Math.min(deltaTime, 0.1));

    this.renderer.render(this.scene, this.camera);
  }

  updateInventory(inventory: InventorySlot[]) {
    this.playerInventory = inventory;
  }

  updateHotbar(hotbar: InventorySlot[]) {
    this.playerHotbar = hotbar;
  }

  private createDroppedItem(block: Block): void {
    // Находим позицию центра блока
    const blockPos = hexToWorld(block.position.q, block.position.r, block.position.y);
    const centerY = blockPos.y + HEX_HEIGHT / 2; // Центр блока по высоте

    // Создаем dropped item
    const item = ITEMS.find(item => item.id === block.type);
    if (!item) return;

    const droppedItem: DroppedItem = {
      id: `item_${this.nextItemId++}`,
      item: item,
      position: {
        x: blockPos.x,
        y: centerY,
        z: blockPos.z
      },
      count: 1,
      velocity: {
        x: (Math.random() - 0.5) * 2, // Случайное направление
        y: Math.random() * 2 + 1, // Вверх
        z: (Math.random() - 0.5) * 2
      },
      pickupRadius: 2.0
    };

    this.droppedItems.push(droppedItem);

    // Создаем визуализацию
    this.createDroppedItemMesh(droppedItem);
  }

  private createDroppedItemMesh(item: DroppedItem): void {
    const geometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    const material = new THREE.MeshLambertMaterial({
      color: item.item.color || 0x666666,
      transparent: true,
      opacity: 0.8
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(item.position.x, item.position.y + 0.15, item.position.z);
    mesh.userData = { itemId: item.id };

    this.scene.add(mesh);
    this.droppedItemMeshes.set(item.id, mesh);
  }

  private removeDroppedItemMesh(itemId: string): void {
    const mesh = this.droppedItemMeshes.get(itemId);
    if (mesh) {
      this.scene.remove(mesh);
      this.droppedItemMeshes.delete(itemId);
    }
  }

  private pickupNearbyItems(): void {
    const playerPos = this.player.position;

    // Собираем предметы в радиусе подбора
    for (let i = this.droppedItems.length - 1; i >= 0; i--) {
      const item = this.droppedItems[i];
      const distance = Math.sqrt(
        Math.pow(item.position.x - playerPos.x, 2) +
        Math.pow(item.position.y - playerPos.y, 2) +
        Math.pow(item.position.z - playerPos.z, 2)
      );

      if (distance <= item.pickupRadius) {
        // Пытаемся добавить предмет в инвентарь
        if (this.addItemToInventory(item.item, item.count)) {
          // Удаляем визуализацию и предмет из мира
          this.removeDroppedItemMesh(item.id);
          this.droppedItems.splice(i, 1);
        }
      }
    }
  }

  private addItemToInventory(item: Item, count: number): boolean {
    // Сначала проверяем инвентарь
    for (let i = 0; i < this.playerInventory.length; i++) {
      const slot = this.playerInventory[i];
      if (slot.item && slot.item.id === item.id && slot.count < slot.item.maxStackSize) {
        const space = slot.item.maxStackSize - slot.count;
        const toAdd = Math.min(count, space);
        slot.count += toAdd;
        count -= toAdd;
        if (count === 0) return true;
      }
    }

    // Ищем пустой слот в инвентаре
    for (let i = 0; i < this.playerInventory.length; i++) {
      if (!this.playerInventory[i].item) {
        this.playerInventory[i] = { item: item, count: Math.min(count, item.maxStackSize) };
        count -= Math.min(count, item.maxStackSize);
        if (count === 0) return true;
      }
    }

    // Проверяем хотбар (только не infinite предметы)
    if (!item.infinite) {
      for (let i = 0; i < this.playerHotbar.length; i++) {
        const slot = this.playerHotbar[i];
        if (slot.item && slot.item.id === item.id && slot.count < slot.item.maxStackSize && !slot.item.infinite) {
          const space = slot.item.maxStackSize - slot.count;
          const toAdd = Math.min(count, space);
          slot.count += toAdd;
          count -= toAdd;
          if (count === 0) return true;
        }
      }

      // Ищем пустой слот в хотбаре
      for (let i = 0; i < this.playerHotbar.length; i++) {
        if (!this.playerHotbar[i].item) {
          this.playerHotbar[i] = { item: item, count: Math.min(count, item.maxStackSize) };
          count -= Math.min(count, item.maxStackSize);
          if (count === 0) return true;
        }
      }
    }

    return count === 0;
  }

  private updateDroppedItems(deltaTime: number): void {
    const GRAVITY = -9.81;
    const FRICTION = 0.95;

    for (let i = this.droppedItems.length - 1; i >= 0; i--) {
      const item = this.droppedItems[i];

      // Применяем гравитацию
      item.velocity.y += GRAVITY * deltaTime;

      // Обновляем позицию
      item.position.x += item.velocity.x * deltaTime;
      item.position.y += item.velocity.y * deltaTime;
      item.position.z += item.velocity.z * deltaTime;

      // Проверяем столкновение с землей
      if (item.position.y <= 0) {
        item.position.y = 0;
        item.velocity.y = 0;
        item.velocity.x *= FRICTION;
        item.velocity.z *= FRICTION;

        // Если скорость очень маленькая - останавливаем
        if (Math.abs(item.velocity.x) < 0.01 && Math.abs(item.velocity.z) < 0.01) {
          item.velocity.x = 0;
          item.velocity.z = 0;
        }
      }

      // Обновляем позицию меша
      const mesh = this.droppedItemMeshes.get(item.id);
      if (mesh) {
        mesh.position.set(item.position.x, item.position.y + 0.15, item.position.z);
        mesh.rotation.y += deltaTime * 2; // Вращение предмета
      }
    }
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
