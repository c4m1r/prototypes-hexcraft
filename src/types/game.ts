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
}

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
  { id: 'red_mushroom', name: 'Red Mushroom', color: '#dc143c' },
  { id: 'mushroom', name: 'Mushroom', color: '#8b4513' },
];

export const BIOMES = ['plains', 'forest', 'desert', 'tundra', 'volcano'];
