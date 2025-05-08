import { sentryVitePlugin } from "@sentry/vite-plugin";
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { cloudflare } from '@cloudflare/vite-plugin'

import nodePolyfills from 'rollup-plugin-node-polyfills';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), cloudflare(),/*sentryVitePlugin({
    org: "charlichat",
    project: "javascript-react"
  })*/ ],

  define: {
    global: "window",
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      buffer: 'rollup-plugin-node-polyfills/polyfills/buffer-es6',
    },
  },

  build: {
    sourcemap: true
  }
})
