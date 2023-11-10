import { defineConfig } from "vite";
import react from '@vitejs/plugin-react'
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
      inject({
        util: "util/",
      }),
    ],
    build: {
      rollupOptions: {
        plugins: [nodePolyfills()],
      },
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },
    optimizeDeps: {
      esbuildOptions: {
        define: {
          global: "globalThis",
        },
        plugins: [
          NodeGlobalsPolyfillPlugin({
            buffer: true,
          }),
        ],
      },
    },
    server: {
      onListening(server) {
        const address = server.httpServer.address();
        const port = typeof address === 'string' ? address : address?.port;

        litGoogleAuthRedirUri = `localhost:${port}`;
        process.env.VITE_LIT_GOOGLE_AUTH_REDIR_URI = litGoogleAuthRedirUri;
        console.log({port: `${port}`});
        process.env.VITE_PORT = `${port}`
      },
    },
    // ... other configurations
  };
});
