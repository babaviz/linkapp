import type { JestConfigWithTsJest } from 'ts-jest';

const jestConfig: JestConfigWithTsJest = {
  preset: 'jest-expo',
  
  // Test environment - React Native
  testEnvironment: 'node',
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.ts',
    'react-native-gesture-handler/jestSetup',
  ],
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  // Transform configuration with ts-jest options
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react-native',
          module: 'commonjs',
          target: 'esnext',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          skipLibCheck: true,
          strict: false,
          resolveJsonModule: true,
          isolatedModules: true,
          moduleResolution: 'node',
          types: ['jest', 'node'],
        },
        babelConfig: '<rootDir>/babel.config.jest.js',
        diagnostics: {
          pretty: true,
          warnOnly: true,
        },
      },
    ],
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  
  // Test match patterns (only test/spec files)
  testMatch: [
    '**/?(*.)+(test|spec).[tj]s?(x)'
  ],

  // Ignore mocks directories explicitly
  testPathIgnorePatterns: ['/node_modules/', '/__mocks__/'],
  
  // Module name mapper for path aliases and asset mocking
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^~/(.*)$': '<rootDir>/$1',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/mocks/fileMock.js',
  },
  
  // Transform ignore patterns - allow transforming ESM modules from node_modules
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-.*|@react-native-.*|expo|@expo|expo-.*|@react-navigation|@stream-io|react-native-url-polyfill)/)',
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    '**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/__tests__/**',
    '!**/coverage/**',
    '!**/android/**',
    '!**/ios/**',
    '!**/.expo/**',
    '!**/build/**',
    '!**/dist/**',
    '!**/mocks/**',
    '!**/scripts/**',
  ],
  
  // Coverage thresholds (optional, can be configured later)
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Test timeout
  testTimeout: 10000,
  
  // Verbose output
  verbose: true,
};

export default jestConfig;

