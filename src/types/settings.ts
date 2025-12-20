export type RenderingMode = 'prototype' | 'modern';

export interface GameSettings {
  renderDistance: number;
  fogDensity: number;
  biomeSize: number;
  chunkSize: number;
  maxLoadedChunks: number;
  renderingMode: RenderingMode;
}

export const DEFAULT_SETTINGS: GameSettings = {
  renderDistance: 3,
  fogDensity: 1,
  biomeSize: 1,
  chunkSize: 14,
  maxLoadedChunks: 15,
  renderingMode: 'prototype'
};

export const SETTINGS_CONSTRAINTS = {
  renderDistance: { min: 1, max: 7, step: 1 },
  fogDensity: { min: 0.1, max: 2, step: 0.1 },
  biomeSize: { min: 0.5, max: 2, step: 0.1 },
  chunkSize: { min: 8, max: 20, step: 1 },
  maxLoadedChunks: { min: 5, max: 30, step: 1 }
};
