import { sentryVitePlugin } from "@sentry/vite-plugin";
/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import tsconfigPaths from 'vite-tsconfig-paths'

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
  ,  nodePolyfills(),
    tsconfigPaths({root: '../../'}),
    sentryVitePlugin({
      org: "charli-6t",
      project: "javascript-react"
    })
  ],

  // Uncomment this if you are using workers.
  // worker: {
  //  plugins: [ nxViteTsPaths(),  ],
  // },

  build: {
    outDir: '../../dist/apps/frontend',
    reportCompressedSize: true,

    // sourcemap: 'inline'
    commonjsOptions: {
      transformMixedEsModules: true,
    },

    sourcemap: true
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
  logLevel: 'info',
define: {
  'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
  '__dirname': JSON.stringify('/')
},
});