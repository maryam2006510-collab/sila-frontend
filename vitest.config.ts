// Vitest: unit tests for business rules + component tests (jsdom)
import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      // Tests control the transport explicitly; never pick up local .env mock switches
      env: { VITE_USE_MOCK: 'false', VITE_API_URL: 'http://api.test' },
    },
  })
);
