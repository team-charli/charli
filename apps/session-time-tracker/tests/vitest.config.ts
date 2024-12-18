//Users/zm/Projects/charli/apps/session-time-tracker/tests/vitest.config.ts
import { defineWorkersProject } from "@cloudflare/vitest-pool-workers/config";
import path from 'path';

export default defineWorkersProject({
  test: {
    include: ['**/tests/**/*.{test,spec}.ts'],
    poolOptions: {
      workers: {
        isolatedStorage: false,
        singleWorker: true,

        wrangler: { configPath: path.resolve(__dirname, '../wrangler.test.toml') },
      },
    },
  },
});
