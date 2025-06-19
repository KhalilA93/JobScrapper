// Jest Configuration for JobScrapper Chrome Extension Testing Framework
module.exports = {
  // Test environment
  testEnvironment: 'jsdom',
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup/jest.setup.js'
  ],
  
  // Module name mapping for clean imports
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/extension/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    '^@backend/(.*)$': '<rootDir>/backend/$1'
  },
  
  // Test file patterns
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.spec.js'
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'extension/src/**/*.{js,jsx}',
    'backend/**/*.js',
    '!extension/src/**/*.config.js',
    '!backend/config/**',
    '!**/node_modules/**',
    '!**/vendor/**',
    '!**/dist/**',
    '!**/build/**'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    },
    // Specific thresholds for critical modules
    './extension/src/utils/jobDataExtractor.js': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './extension/src/utils/dataSanitizer.js': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  
  // Coverage reporters
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json'
  ],
  
  // Test timeout (increased for E2E tests)
  testTimeout: 30000,
  
  // Verbose output
  verbose: true,
  
  // Transform configuration
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  
  // Module file extensions
  moduleFileExtensions: [
    'js',
    'jsx',
    'json'
  ],
  
  // Test environment options
  testEnvironmentOptions: {
    url: 'https://localhost',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/91.0.4472.124'
  },
  
  // Global variables
  globals: {
    'process.env.NODE_ENV': 'test',
    '__DEV__': true
  },
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Test runner options
  maxWorkers: '50%', // Use half of available CPU cores
  
  // Watch mode configuration
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/build/',
    '<rootDir>/coverage/'
  ],
  
  // Puppeteer configuration for E2E tests
  preset: 'jest-puppeteer',
  
  // Test projects for different environments
  projects: [
    // Unit tests
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/tests/unit/**/*.test.js'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.js']
    },
    
    // Integration tests
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/tests/integration/**/*.test.js'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.js']
    },
    
    // E2E tests
    {
      displayName: 'e2e',
      testMatch: ['<rootDir>/tests/e2e/**/*.test.js'],
      preset: 'jest-puppeteer',
      testTimeout: 60000
    }
  ],
  
  // Reporters for different output formats
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './coverage/html-report',
        filename: 'test-results.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'JobScrapper Test Results'
      }
    ]
  ],
  
  // Snapshot serializers
  snapshotSerializers: [
    'jest-serializer-html'
  ],
  
  // Mock patterns
  modulePathIgnorePatterns: [
    '<rootDir>/dist/',
    '<rootDir>/build/'
  ],
  
  // Test result processor
  testResultsProcessor: './tests/utils/testResultsProcessor.js'
};

// Puppeteer configuration for E2E tests
module.exports.puppeteer = {
  launch: {
    headless: process.env.CI === 'true',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-extensions-except=./extension',
      '--load-extension=./extension'
    ]
  }
};
