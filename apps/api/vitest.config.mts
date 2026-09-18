import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    env: {
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      RUN_MIGRATIONS_ON_START: 'false',
      JWT_SECRET: 'test_only_secret_at_least_32_characters_long',
      JWT_ISSUER: 'https://lightsout-api.test',
      JWT_AUDIENCE: 'lights-out-mobile-test',
    },
  },
});
