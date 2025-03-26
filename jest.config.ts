import type { Config } from 'jest';

const config: Config = {
  testTimeout: 30000,  
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  setupFiles: ['<rootDir>/tests/jest.setup.ts'],
  testPathIgnorePatterns: ['/tests/integration/seige\\.test\\.ts$']
};

export default config;