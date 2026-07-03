/**
 * Jest configuration for integration tests.
 *
 * Integration tests require a live Solid CSS endpoint and are run via:
 *   npm run test:integration
 *
 * or in Docker via:
 *   npm run test:integration:docker
 *
 * The tests are skipped automatically when the INTEGRATION_TEST_BASE_URL
 * environment variable is not set, so this config is safe to run locally.
 */

/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/integration/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
  },
  // Allow Jest to transform ESM packages that integration tests need directly.
  transformIgnorePatterns: [
    '/node_modules/(?!(@inrupt|jose|n3|@rdfjs)/)',
  ],
  testTimeout: 30000,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
