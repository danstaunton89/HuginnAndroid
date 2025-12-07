const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration for React Native
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);