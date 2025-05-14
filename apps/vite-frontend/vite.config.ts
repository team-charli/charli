// vite.config.ts
import { Worker as NodeWorker } from "node:worker_threads";
(globalThis as any).Worker ??= NodeWorker;          // ok for build

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import nodePolyfills from "rollup-plugin-node-polyfills";
import { sentryVitePlugin } from "@sentry/vite-plugin";

export default defineConfig(async ({ command }) => {
  // base config used by both dev & build
  const base = {
    define: { global: "window" },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
        buffer: "rollup-plugin-node-polyfills/polyfills/buffer-es6",
      },
    },
    build: { sourcemap: true },
  };

  // always-present plugins
  const plugins: any[] = [react() /*, sentryVitePlugin({ … })*/];

  // 👉 only pull in the Cloudflare plugin when `vite build` runs
  if (command === "build") {
    const { cloudflare } = await import("@cloudflare/vite-plugin");
    plugins.push(cloudflare());
  }

  return { ...base, plugins };
});
