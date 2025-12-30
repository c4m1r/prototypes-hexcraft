export interface BlockType {
  id: string;
  name: string;
  color: string;
  texture?: string;
}

export interface Block {
  type: string;
  position: { q: number; r: number; s: number; y: number };
}

export interface Chunk {
  position: { q: number; r: number };
  blocks: Block[];
  blockMap: Map<string, Block>;
  biome: string;
  // Оптимизация: карта высот для быстрого доступа
  heightMap?: Map<string, number>; // Ключ: "q,r" -> максимальная высота непроходимого блока
  // Оптимизация: предвычисленная видимость блоков
  visibleBlocks?: Set<string>; // Ключи видимых блоков для быстрого доступа
}

export interface PlayerState {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number };
  velocity: { x: number; y: number; z: number };
  isFlying: boolean;
  selectedSlot: number;
  inventory: InventorySlot[];
  hotbar: InventorySlot[];
  equipment: EquipmentSlot[];
  name: string;
}

export interface Item {
  id: string;
  name: string;
  type: 'block' | 'tool' | 'material';
  stackSize: number;
  maxStackSize: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  icon?: string;
  color?: string;
  infinite?: boolean; // для хоткеев
}

export interface DroppedItem {
  id: string;
  item: Item;
  position: { x: number; y: number; z: number };
  count: number;
  velocity: { x: number; y: number; z: number };
  pickupRadius: number;
}

export interface InventorySlot {
  item: Item | null;
  count: number;
}

export interface EquipmentSlot {
  type: 'helmet' | 'chestplate' | 'leggings' | 'boots' | 'cape' | 'head' | 'chest' | 'legs' | 'feet' | 'cape_vanity' | 'amulet' | 'ring1' | 'ring2' | 'artifact1' | 'artifact2';
  item: Item | null;
  name: string;
}

export interface Player {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  isOnline: boolean;
}

export const ITEMS: Item[] = [
  // Блоки
  { id: 'grass', name: 'Grass Block', type: 'block', stackSize: 72, maxStackSize: 72, rarity: 'common', color: '#4a7c3a' },
  { id: 'dirt', name: 'Dirt Block', type: 'block', stackSize: 72, maxStackSize: 72, rarity: 'common', color: '#8b5a3c' },
  { id: 'stone', name: 'Stone Block', type: 'block', stackSize: 72, maxStackSize: 72, rarity: 'common', color: '#7a7a7a' },
  { id: 'sand', name: 'Sand Block', type: 'block', stackSize: 72, maxStackSize: 72, rarity: 'common', color: '#ddc689' },
  { id: 'wood', name: 'Wood Block', type: 'block', stackSize: 72, maxStackSize: 72, rarity: 'common', color: '#6b4423' },
  { id: 'leaves', name: 'Leaves Block', type: 'block', stackSize: 72, maxStackSize: 72, rarity: 'common', color: '#2d5016' },
  { id: 'snow', name: 'Snow Block', type: 'block', stackSize: 72, maxStackSize: 72, rarity: 'common', color: '#e8f2f7' },
  { id: 'ice', name: 'Ice Block', type: 'block', stackSize: 72, maxStackSize: 72, rarity: 'common', color: '#b8d8e8' },
  { id: 'lava', name: 'Lava Block', type: 'block', stackSize: 72, maxStackSize: 72, rarity: 'common', color: '#ff4500' },
  { id: 'foo', name: 'Foo Block', type: 'block', stackSize: 64, maxStackSize: 64, rarity: 'rare', color: '#ff00ff' },

  // Руда
  { id: 'bronze', name: 'Bronze Ore', type: 'material', stackSize: 64, maxStackSize: 64, rarity: 'uncommon', color: '#cd7f32' },
  { id: 'silver', name: 'Silver Ore', type: 'material', stackSize: 64, maxStackSize: 64, rarity: 'rare', color: '#c0c0c0' },
  { id: 'gold', name: 'Gold Ore', type: 'material', stackSize: 64, maxStackSize: 64, rarity: 'epic', color: '#ffd700' },

  // Инструменты
  { id: 'pickaxe', name: 'Pickaxe', type: 'tool', stackSize: 1, maxStackSize: 1, rarity: 'common' },
  { id: 'axe', name: 'Axe', type: 'tool', stackSize: 1, maxStackSize: 1, rarity: 'common' },
  { id: 'shovel', name: 'Shovel', type: 'tool', stackSize: 1, maxStackSize: 1, rarity: 'common' },
];

export const BLOCK_TYPES: BlockType[] = [
  { id: 'grass', name: 'Grass', color: '#4a7c3a' },
  { id: 'dirt', name: 'Dirt', color: '#8b5a3c' },
  { id: 'stone', name: 'Stone', color: '#7a7a7a' },
  { id: 'sand', name: 'Sand', color: '#ddc689' },
  { id: 'water', name: 'Water', color: '#4a90e2' },
  { id: 'wood', name: 'Wood', color: '#6b4423' },
  { id: 'leaves', name: 'Leaves', color: '#2d5016' },
  { id: 'snow', name: 'Snow', color: '#e8f2f7' },
  { id: 'ice', name: 'Ice', color: '#b8d8e8' },
  { id: 'lava', name: 'Lava', color: '#ff4500' },
  { id: 'bronze', name: 'Bronze', color: '#cd7f32' },
  { id: 'silver', name: 'Silver', color: '#c0c0c0' },
  { id: 'gold', name: 'Gold', color: '#ffd700' },
  { id: 'foo', name: 'Foo', color: '#ff00ff' },
  { id: 'red_mushroom', name: 'Red Mushroom', color: '#dc143c' },
  { id: 'mushroom', name: 'Mushroom', color: '#8b4513' },
];

export const BIOMES = ['plains', 'forest', 'desert', 'tundra', 'volcano'];
