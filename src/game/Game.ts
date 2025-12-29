import * as THREE from 'three';
import { World } from './World';
import { PlayerController } from './PlayerController';
import { RaycastManager } from './RaycastManager';
import { DayNightCycle } from './DayNightCycle';
import { GameSettings } from '../types/settings';
import { InventorySlot, DroppedItem, ITEMS, EquipmentSlot, PlayerState } from '../types/game';
import { hexToWorld, HEX_HEIGHT } from '../utils/hexUtils';

export interface GameState {
  playerPosition: { x: number; y: number; z: number };
  isFlying: boolean;
  targetBlock: string | null;
  targetBlockCoords: { q: number; r: number; y: number } | null;
  targetBiome: string | null;
  showFogBarrier: boolean;
  currentTime: string;
  health: number;
  stamina: number;
  hunger: number;
  generationCode: string;
  generationStatus: string;
  playerState: PlayerState;
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
  private playerEquipment: EquipmentSlot[] = [];
  private playerName: string = 'Player';
  private selectedSlot: number = 0;
  private droppedItems: DroppedItem[] = [];
  private nextItemId: number = 0;
  private droppedItemMeshes: Map<string, THREE.Mesh> = new Map();
  private savedFogDensity: number = 1;
  private fogEffectsDisabled: boolean = false;

  private initializeInventory() {
    const INVENTORY_SIZE = 27;
    const HOTBAR_SIZE = 9;

    // Инициализация пустого инвентаря
    this.playerInventory = Array(INVENTORY_SIZE).fill(null).map(() => ({ item: null, count: 0 }));

    // Инициализация экипировки (15 слотов)
    this.playerEquipment = [
      { type: 'helmet', item: null, name: 'Helmet' },
      { type: 'chestplate', item: null, name: 'Chestplate' },
      { type: 'leggings', item: null, name: 'Leggings' },
      { type: 'boots', item: null, name: 'Boots' },
      { type: 'cape', item: null, name: 'Cape' },
      { type: 'head', item: null, name: 'Head' },
      { type: 'chest', item: null, name: 'Chest' },
      { type: 'legs', item: null, name: 'Legs' },
      { type: 'feet', item: null, name: 'Feet' },
      { type: 'cape_vanity', item: null, name: 'Cape (Vanity)' },
      { type: 'amulet', item: null, name: 'Amulet' },
      { type: 'ring1', item: null, name: 'Ring 1' },
      { type: 'ring2', item: null, name: 'Ring 2' },
      { type: 'artifact1', item: null, name: 'Artifact 1' },
      { type: 'artifact2', item: null, name: 'Artifact 2' },
    ];

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
    const height = this.world.getHighestBlockAt(q, r);
    console.log(`getSpawnHeight(${q}, ${r}) = ${height}`);
    return height;
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
          console.log('Block removed:', removedBlock);
          this.createDroppedItem(removedBlock);
          console.log('Dropped items count:', this.droppedItems.length);
        } else {
          console.log('No block removed');
        }
      } else if (e.button === 2) {
        // Размещение блока - уменьшаем количество в инвентаре
        const selectedItem = this.playerHotbar[this.selectedSlot]?.item;
        if (selectedItem && selectedItem.type === 'block') {
          // Проверяем есть ли предмет в инвентаре (для бесконечных предметов всегда true)
          const hasItem = selectedItem.infinite || (this.playerHotbar[this.selectedSlot].count > 0);
          if (hasItem) {
            // Размещаем блок
            const placed = this.raycastManager.placeBlock(this.camera, selectedItem.id);
            if (placed) {
              // Уменьшаем количество только для не бесконечных предметов
              if (!selectedItem.infinite) {
                // Создаем новый массив для обновления состояния
                const newHotbar = [...this.playerHotbar];
                newHotbar[this.selectedSlot] = {
                  ...newHotbar[this.selectedSlot],
                  count: newHotbar[this.selectedSlot].count - 1
                };
                // Если количество стало 0 - удаляем предмет
                if (newHotbar[this.selectedSlot].count === 0) {
                  newHotbar[this.selectedSlot] = { item: null, count: 0 };
                }
                this.playerHotbar = newHotbar;
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
      if (document.pointerLockElement !== document.body) {
        // Обработка клавиш для выбора слотов работает даже без pointer lock
        if (e.code >= 'Digit1' && e.code <= 'Digit9') {
          const digit = parseInt(e.code.replace('Digit', '')) - 1;
          if (digit >= 0 && digit < this.playerHotbar.length) {
            this.selectedSlot = digit;
            console.log('Selected slot:', this.selectedSlot);
          }
        }
        return;
      }

      if (e.key.toLowerCase() === 'e') {
        // Подбор предметов
        this.pickupNearbyItems();
      }

      // Обработка клавиш для выбора слотов (1-9)
      if (e.code >= 'Digit1' && e.code <= 'Digit9') {
        const digit = parseInt(e.code.replace('Digit', '')) - 1;
        if (digit >= 0 && digit < this.playerHotbar.length) {
          this.selectedSlot = digit;
          console.log('Selected slot:', this.selectedSlot);
        }
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.code === 'KeyF') {
        this.toggleFogEffects();
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
    if (targetedBlock) {
      console.debug('Game: targeted block found:', targetedBlock.name, targetedBlock.block.position);
    }
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
        targetBlockCoords: targetedBlock ? {
          q: targetedBlock.block.position.q,
          r: targetedBlock.block.position.r,
          y: targetedBlock.block.position.y
        } : null,
        targetBiome: targetedBlock ? this.world.getBiomeAt(this.player.position.x, this.player.position.z) : null,
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
          hotbar: this.playerHotbar,
          equipment: this.playerEquipment,
          selectedSlot: this.selectedSlot
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

  updateEquipment(equipment: EquipmentSlot[]) {
    this.playerEquipment = equipment;
  }

  toggleUseTextures() {
    this.world.toggleUseTextures();
  }

  toggleFogEffects() {
    this.fogEffectsDisabled = !this.fogEffectsDisabled;

    // Переключаем барьер тумана
    if (this.fogEffectsDisabled) {
      // Выключаем все эффекты затемнения
      this.world.toggleFogBarrier(); // Выключаем если был включен
      if (this.world.getFogBarrierState()) {
        this.world.toggleFogBarrier(); // Гарантируем выключение
      }
      
      // Сохраняем текущую плотность тумана и выключаем
      const currentFogDensity = this.world.getFogDensity();
      if (currentFogDensity > 0) {
        this.savedFogDensity = currentFogDensity;
        this.world.setFogDensity(0);
      }
      
      // Отключаем туман в DayNightCycle
      this.dayNightCycle.setFogDisabled(true);
      
      // Убираем туман из сцены полностью
      this.scene.fog = null;
    } else {
      // Включаем все эффекты затемнения обратно
      if (!this.world.getFogBarrierState()) {
        this.world.toggleFogBarrier(); // Включаем если был выключен
      }
      
      // Восстанавливаем сохраненную плотность тумана
      this.world.setFogDensity(this.savedFogDensity || 1);
      
      // Включаем туман в DayNightCycle (он сам установит правильный туман при следующем update)
      this.dayNightCycle.setFogDisabled(false);
    }
  }

  toggleFogBarrier() {
    this.world.toggleFogBarrier();
  }

  getFogBarrierState(): boolean {
    return this.world.getFogBarrierState();
  }

  private createDroppedItem(block: Block): void {
    console.log('Creating dropped item for block:', block);
    // Находим позицию центра блока
    const blockPos = hexToWorld(block.position.q, block.position.r, block.position.y);
    const centerY = blockPos.y + HEX_HEIGHT / 2; // Центр блока по высоте
    console.log('Block position:', blockPos, 'center Y:', centerY, 'HEX_HEIGHT:', HEX_HEIGHT);

    // Создаем dropped item
    const item = ITEMS.find(item => item.id === block.type);
    if (!item) {
      console.log('Item not found for block type:', block.type);
      return;
    }
    console.log('Found item:', item.name);

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
        x: (Math.random() - 0.5) * 0.5, // Случайное направление (уменьшено)
        y: Math.random() * 1 + 0.5, // Вверх (уменьшено)
        z: (Math.random() - 0.5) * 0.5
      },
      pickupRadius: 2.0
    };

    this.droppedItems.push(droppedItem);
    console.log('Dropped item created:', droppedItem);

    // Создаем визуализацию
    this.createDroppedItemMesh(droppedItem);
  }

  private createDroppedItemMesh(item: DroppedItem): void {
    console.log('Creating mesh for item:', item.item.name, 'at position:', item.position);
    // Размер в 3 раза меньше оригинального блока (HEX_HEIGHT / 3)
    const blockSize = HEX_HEIGHT / 3;
    const geometry = new THREE.BoxGeometry(blockSize, blockSize, blockSize);
    const material = new THREE.MeshLambertMaterial({
      color: item.item.color || 0x666666,
      transparent: true,
      opacity: 0.8
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(item.position.x, item.position.y + blockSize/2, item.position.z);
    mesh.userData = { itemId: item.id };

    this.scene.add(mesh);
    this.droppedItemMeshes.set(item.id, mesh);
    console.log('Mesh created and added to scene, size:', blockSize);
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
    console.log('Pickup attempt - player pos:', playerPos, 'dropped items:', this.droppedItems.length);

    // Собираем предметы в радиусе подбора
    for (let i = this.droppedItems.length - 1; i >= 0; i--) {
      const item = this.droppedItems[i];
      const distance = Math.sqrt(
        Math.pow(item.position.x - playerPos.x, 2) +
        Math.pow(item.position.y - playerPos.y, 2) +
        Math.pow(item.position.z - playerPos.z, 2)
      );

      if (distance <= item.pickupRadius) {
        console.log('Item in range:', item.item.name, 'distance:', distance, 'radius:', item.pickupRadius);
        // Пытаемся добавить предмет в инвентарь
        if (this.addItemToInventory(item.item, item.count)) {
          console.log('Item picked up:', item.item.name);
          // Удаляем визуализацию и предмет из мира
          this.removeDroppedItemMesh(item.id);
          this.droppedItems.splice(i, 1);
        } else {
          console.log('Failed to add item to inventory:', item.item.name);
        }
      }
    }
  }

  private addItemToInventory(item: Item, count: number): boolean {
    console.log('Adding item to inventory:', item.name, 'count:', count);
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
    const GRAVITY = -4.0; // Уменьшенная гравитация
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
