import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    globals: false,
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
  },
});
