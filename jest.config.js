/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: [
    '**/unit/**/*.test.ts',
    '**/roundtrip/**/*.test.ts',
    '**/schemas/**/*.test.ts',
    '**/types/**/*.test.ts',
    '**/utils/**/*.test.ts',
    // tests/dom/** load public/app.js into a real DOM and drive it. They opt
    // into jsdom per-file with an @jest-environment docblock, so the suite
    // default stays 'node' for everything else.
    '**/dom/**/*.test.ts',
  ],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
