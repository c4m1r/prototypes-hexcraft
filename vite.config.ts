import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  // GitHub Pages размещает проект в подпапке /prototypes-hexcraft/,
  // поэтому задаем base, чтобы ссылки на бандл в dist указывали на правильный путь.
  base: '/prototypes-hexcraft/',
  plugins: [react()],
  build: {
    // Оптимизации для продакшена
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'vendor-react': ['react', 'react-dom'],
          'vendor-three': ['three'],

          // Game logic chunk
          'game-core': [
            './src/game/Game.ts',
            './src/game/World.ts',
            './src/game/PlayerController.ts',
            './src/game/ChunkGenerator.ts',
            './src/game/DayNightCycle.ts',
            './src/game/RaycastManager.ts',
            './src/game/TextureManager.ts',
          ],

          // UI components chunk
          'ui-components': [
            './src/components/Inventory.tsx',
            './src/components/GameUI.tsx',
            './src/components/WorldSetupMenu.tsx',
            './src/components/LoadingScreen.tsx',
            './src/components/AboutPage.tsx',
            './src/components/MainMenu.tsx',
            './src/components/OptionsPage.tsx',
            './src/components/ErrorBoundary.tsx',
          ],

          // Utils chunk
          'utils': [
            './src/utils/i18n.ts',
            './src/utils/hexUtils.ts',
            './src/utils/ObjectPool.ts',
          ],
        },
      },
    },
    // Разумный лимит размера чанка
    chunkSizeWarningLimit: 500,
  },
});
