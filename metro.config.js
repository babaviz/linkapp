const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Prevent Metro from watching generated/noisy outputs that can trigger phantom reloads.
// These files can change during runtime (tests, builds, tooling) and cause full reloads.
config.resolver.blockList = new RegExp(
  ['[\\\\/]coverage[\\\\/].*', '[\\\\/]\\.eas_logs[\\\\/].*', '\\.log$'].join('|')
);

// Remove flow extensions from sourceExts to prevent resolution issues
config.resolver.sourceExts = config.resolver.sourceExts.filter(
  ext => ext !== 'flow'
);

// Ensure TypeScript support if not already present
if (!config.resolver.sourceExts.includes('ts')) {
  config.resolver.sourceExts.push('ts');
}
if (!config.resolver.sourceExts.includes('tsx')) {
  config.resolver.sourceExts.push('tsx');
}

// Add resolver configuration
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Fix polyfill resolution issues - MINIMAL polyfills to prevent 80% bundling hang
// Only alias what's absolutely necessary, avoid heavy polyfills
// Crypto and Buffer are now handled via polyfills.ts to prevent bundling issues

config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: false, // Changed to false - inline requires can cause bundling hang
    },
  }),
  unstable_allowRequireContext: true,
  minifierConfig: {
    keep_fnames: true,
    mangle: {
      keep_fnames: true,
    },
    compress: {
      drop_console: process.env.NODE_ENV === 'production',
      drop_debugger: true,
      passes: 1, // Reduced from 3 to 1 for faster bundling
    },
    output: {
      ascii_only: true,
      comments: false,
      webkit: true,
    },
  },
};

// Optimize bundler performance
config.maxWorkers = 2; // Limit workers to prevent memory issues
config.resetCache = false;

// Additional Hermes-specific fixes
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Add serializer configuration to prevent bundling issues
config.serializer = {
  ...config.serializer,
  getRunModuleStatement: (moduleId) => `__r(${JSON.stringify(moduleId)});`,
};

// Configure sourcemaps for production builds
// Disable sourcemaps for production to avoid build issues
config.serializer.createModuleIdFactory = function() {
  return function(path) {
    let name = path.replace(/^.*node_modules[\\/]/, '');
    return name;
  };
};

module.exports = config;
