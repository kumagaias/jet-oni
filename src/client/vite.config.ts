import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [],
  build: {
    outDir: '../../dist/client',
    sourcemap: false, // Disable source maps to reduce bundle size
    chunkSizeWarningLimit: 1500,
  },
});
