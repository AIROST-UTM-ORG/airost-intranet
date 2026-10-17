/** @type {import('jest').Config} */
module.exports = {
  // Run all tests inside the tests/ directory
  testMatch: ['**/tests/**/*.test.js'],

  // Test environment — Node (not jsdom)
  testEnvironment: 'node',

  // Load test-specific environment variables before any test file runs.
  // This prevents dotenv from loading the real .env and exposing production
  // credentials. The envPath below contains only safe, empty-or-fake values.
  globalSetup: './tests/setup/globalSetup.js',

  // Give mongodb-memory-server time to download / start the binary
  testTimeout: 60000,

  // Show individual test names
  verbose: true,

  // Collect coverage from source files (not tests or node_modules)
  collectCoverageFrom: [
    'controller/**/*.js',
    'utils/**/*.js',
    'models/**/*.js',
    '!node_modules/**',
  ],
};
