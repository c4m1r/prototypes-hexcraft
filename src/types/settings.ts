import { Language } from '../utils/i18n';

export type RenderingMode = 'prototype' | 'modern'; // Используется только для переключения текстур (F2)
export type GameMode = 'Solo' | 'Co-op' | 'Online';

export interface GameSettings {
  renderDistance: number;
  fogDensity: number;
  biomeSize: number;
  chunkSize: number;
  maxLoadedChunks: number;
  seed: number;
  language: Language;
}

export interface WorldSetup {
  playerName: string;
  gameMode: GameMode;
  seed: number;
}

export const DEFAULT_SETTINGS: GameSettings = {
  renderDistance: 3,
  fogDensity: 1,
  biomeSize: 1,
  chunkSize: 14,
  maxLoadedChunks: 15,
  seed: Math.floor(Math.random() * 1_000_000_000),
  language: 'ru'
};

export const SETTINGS_CONSTRAINTS = {
  renderDistance: { min: 1, max: 7, step: 1 },
  fogDensity: { min: 0.1, max: 2, step: 0.1 },
  biomeSize: { min: 0.5, max: 2, step: 0.1 },
  chunkSize: { min: 8, max: 20, step: 1 },
  maxLoadedChunks: { min: 5, max: 30, step: 1 }
};
