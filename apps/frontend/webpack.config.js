const { composePlugins, withNx } = require('@nx/webpack');
const { withReact } = require('@nx/react');
const webpack = require('webpack');

module.exports = composePlugins(
  withNx(),
  withReact(),
  (config) => {
    // Update fallbacks
    config.resolve = {
      ...config.resolve,
      fallback: {
        ...config.resolve.fallback, // Keep existing fallbacks
        path: require.resolve('path-browserify'),
        os: require.resolve('os-browserify/browser'),
        crypto: require.resolve('crypto-browserify'),
        http: require.resolve('stream-http'),
        https: require.resolve('https-browserify'),
        zlib: require.resolve('browserify-zlib'),
        stream: require.resolve('stream-browserify'), // Added stream-browserify
        process: require.resolve('process/browser')
      }
    };

    // DefinePlugin configuration
    const envKeys = Object.keys(process.env).reduce((prev, next) => {
      prev[`process.env.${next}`] = JSON.stringify(process.env[next]);
      return prev;
    }, {});

    // Ensure ProvidePlugin and DefinePlugin are added to the plugins array
    config.plugins = [
      ...(config.plugins || []),
      new webpack.ProvidePlugin({
        process: 'process/browser'
      }),
      new webpack.DefinePlugin(envKeys)
    ];

    // Add any other custom configurations or plugins as needed
    // e.g., config.plugins.push(new MyPlugin())

    return config;
  }
);
