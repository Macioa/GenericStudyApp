import { defineConfig } from 'vitest/config';
import { config } from 'dotenv';

// Load .env file for tests
config();

export default defineConfig({
  test: {
    setupFiles: ['./tests/setup.ts'],
    environment: 'jsdom',
    globals: true,
  },
});
