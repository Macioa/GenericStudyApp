// Simple test setup file
// This file can be used to configure global test settings

import { beforeAll, afterAll } from 'vitest';

beforeAll(() => {
  console.log('Test setup: Starting test suite');
});

afterAll(() => {
  console.log('Test setup: Test suite completed');
});
