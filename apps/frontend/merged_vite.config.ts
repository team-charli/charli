import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill";
import inject from "@rollup/plugin-inject";
import nodePolyfills from "rollup-plugin-polyfill-node";

export default defineConfig({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/frontend',

  server: {
    port: 4200,
    host: 'localhost',
  },

  preview: {
    port: 4300,
    host: 'localhost',
  },

  plugins: [
    react(),
    // Order of plugins might be crucial, adjust as needed
    nxViteTsPaths(),
    inject({
      util: "util/", // as in the sample config
    }),
  ],

  build: {
    outDir: '../../dist/apps/frontend',
    reportCompressedSize: true,
    rollupOptions: {
      plugins: [nodePolyfills()], // Include Node.js polyfills
    },
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },

  test: {
    globals: true,
    cache: {
      dir: '../../node_modules/.vitest',
    },
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],

    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/apps/frontend',
      provider: 'v8',
    },
  },

  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: "globalThis", // Ensures global object compatibility
      },
      plugins: [
        NodeGlobalsPolyfillPlugin({
          buffer: true, // Polyfills for Node.js Buffer module
        }),
      ],
    },
  },
});
