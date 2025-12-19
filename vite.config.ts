import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  // GitHub Pages размещает проект в подпапке /prototypes-hexcraft/,
  // поэтому задаем base, чтобы ссылки на бандл в dist указывали на правильный путь.
  base: '/prototypes-hexcraft/',
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
