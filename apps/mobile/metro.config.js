const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// apps/api has no RN code; watching it just adds rebuild noise.
config.resolver.blockList = [/\/apps\/api\/.*/];

module.exports = withNativeWind(config, { input: './global.css' });
