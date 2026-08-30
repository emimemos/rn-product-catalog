const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const {resolve} = require('metro-resolver');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const DEV_ONLY_ENTRYPOINTS = new Set([
  './msw.polyfills',
  './src/mocks/server.native',
]);

const config = {
  resolver: {
    resolveRequest: (context, moduleName, platform) => {
      if (!context.dev && DEV_ONLY_ENTRYPOINTS.has(moduleName)) {
        return {type: 'empty'};
      }
      return resolve(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
