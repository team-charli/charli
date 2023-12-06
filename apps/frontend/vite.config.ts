/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill";
import inject from "@rollup/plugin-inject";
import nodePolyfills from "rollup-plugin-polyfill-node";

export default defineConfig(({ command, mode }) => {
  let litGoogleAuthRedirUri;

  return {
    base: "./",
    define: {
      global: "globalThis", // Node.js global to browser globalThis
    },
    plugins: [
      react(),
      nxViteTsPaths(),
      // Additional plugins from second config
      inject({
        util: "util/",
      }),
      // Note: If you have additional plugins, they should also be included here
    ],
    build: {
      rollupOptions: {
        plugins: [
          nodePolyfills(), // Includes polyfills for Node.js core modules
          // Add other plugins if needed
        ],
      },
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },
    optimizeDeps: {
      esbuildOptions: {
        define: {
          global: "globalThis", // Ensures global object compatibility
        },
        plugins: [
          NodeGlobalsPolyfillPlugin({
            buffer: true, // Polyfills Node.js Buffer module
          }),
        ],
      },
    },
    server: {
      port: 4200,
      host: 'localhost',
      onListening(server) {
        const address = server.httpServer.address();
        const port = typeof address === 'string' ? address : address?.port;

        litGoogleAuthRedirUri = `localhost:${port}`;
        console.log(litGoogleAuthRedirUri);
        process.env.vite_lit_google_auth_redir_uri = litGoogleAuthRedirUri;

        console.log({port: `${port}`});
        process.env.VITE_PORT = `${port}`;
        process.env.VITE_REDIRECT_URI = "http://localhost:5173";
      },
    },
    preview: {
      port: 4300,
      host: 'localhost',
    },
    test: {
      globals: true,
      cache: {
        dir: '../../node_modules/.vitest',
      },
      environment: 'jsdom',
      include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    },
    // ... other configurations
    // Uncomment this if you are using workers.
    // worker: {
    //   plugins: [ nxViteTsPaths() ],
    // },
  };
});
