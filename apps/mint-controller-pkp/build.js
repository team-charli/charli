import * as esbuild from 'esbuild';

esbuild.build({
  entryPoints: ['./src/index.ts'],
  bundle: true,
  outfile: 'dist/worker.js',
  format: 'esm',
  target: 'es2020',
  external: [
    'node:buffer',
    'node:crypto',
    'node:process',
    'node:stream',
    'node:http',
    'node:https',
    'node:zlib',
    'node:events',
    'node:net',
    'node:tls',
    'node:url',
    'ethers',
    '@lit-protocol/contracts-sdk',
    '@lit-protocol/lit-node-client-nodejs',
    '@lit-protocol/types',
    '@lit-protocol/auth-helpers'
  ],
  define: {
    'process.env.NODE_ENV': '"production"'
  },
  loader: { '.ts': 'ts' },
  plugins: [{
    name: 'node-globals',
    setup(build) {
      build.onResolve({ filter: /^buffer$/ }, args => {
        return { path: 'node:buffer', external: true }
      })
      build.onResolve({ filter: /^crypto$/ }, args => {
        return { path: 'node:crypto', external: true }
      })
    },
  }],
}).catch(() => process.exit(1));
