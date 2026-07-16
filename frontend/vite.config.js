import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@assets': path.resolve(__dirname, './src/assets'),
      '@components': path.resolve(__dirname, './src/components'),
      '@layouts': path.resolve(__dirname, './src/layouts'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@context': path.resolve(__dirname, './src/context'),
      '@services': path.resolve(__dirname, './src/services'),
      '@routes': path.resolve(__dirname, './src/routes'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@styles': path.resolve(__dirname, './src/styles'),
      // Polyfill 'buffer/' import from plotly.js
      'buffer/': 'buffer',
    },
  },
  server: {
    port: 5173,
    open: true,
    strictPort: true,
  },
  preview: {
    port: 4173,
  },
  optimizeDeps: {
    // Pre-bundle heavy dependencies so they don't inflate app chunks
    include: ['react-plotly.js', 'plotly.js'],
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Raise the warning threshold since charts bundle is legitimately large
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Core React vendor chunk
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/react-router-dom/')
          ) {
            return 'vendor';
          }
          // Plotly / charts (large — kept separate so app shell stays fast)
          if (
            id.includes('node_modules/plotly.js') ||
            id.includes('node_modules/react-plotly.js') ||
            id.includes('node_modules/d3') ||
            id.includes('node_modules/@plotly')
          ) {
            return 'charts';
          }
          // Animation library
          if (id.includes('node_modules/framer-motion')) {
            return 'motion';
          }
          // Icons
          if (id.includes('node_modules/lucide-react')) {
            return 'icons';
          }
        },
      },
    },
  },
});
