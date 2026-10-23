import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Long-lived vendor chunks: they rarely change, so browsers keep them cached across
        // deploys. Everything else from node_modules goes to `vendor`, otherwise Rollup pulls
        // shared helpers (e.g. clsx) into the charts chunk and every page downloads recharts.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (
            /node_modules\/(recharts|recharts-scale|react-smooth|victory-vendor|d3-[^/]+|internmap|decimal\.js-light|lodash|eventemitter3|fast-equals|tiny-invariant)\//.test(
              id,
            )
          )
            return 'charts';
          if (/node_modules\/(framer-motion|motion-dom|motion-utils)\//.test(id)) return 'motion';
          if (
            /node_modules\/(react|react-dom|react-router|react-router-dom|@remix-run|scheduler)\//.test(
              id,
            )
          )
            return 'react';
          if (
            /node_modules\/(@tanstack|axios|socket\.io-client|socket\.io-parser|engine\.io-client|engine\.io-parser|@socket\.io)\//.test(
              id,
            )
          )
            return 'data';
          return 'vendor';
        },
      },
    },
  },
});
