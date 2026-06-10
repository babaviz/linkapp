module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['.'],
          extensions: [
            '.ios.ts',
            '.android.ts',
            '.ts',
            '.ios.tsx',
            '.android.tsx',
            '.tsx',
            '.jsx',
            '.js',
            '.json'
          ],
          alias: {
            '@': './',
            '@components': './components',
            '@screens': './screens',
            '@navigation': './navigation',
            '@services': './services',
            '@utils': './utils',
            '@assets': './assets',
            '@types': './types',
            '@redux': './redux'
          }
        }
      ],
      'react-native-reanimated/plugin' // Must be listed last
    ],
  };
};
