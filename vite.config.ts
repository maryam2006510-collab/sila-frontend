import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// A production build must know its backend: without VITE_API_URL the app would silently
// call http://localhost:8010 from the visitor's browser. Mock builds need no backend.
const requireApiUrl = (): Plugin => ({
  name: 'sila:require-api-url',
  apply: 'build',
  configResolved({ mode, env }) {
    if (mode === 'production' && env.VITE_USE_MOCK !== 'true' && !env.VITE_API_URL) {
      throw new Error('VITE_API_URL is required for a production build (or set VITE_USE_MOCK=true).');
    }
  },
});

export default defineConfig({
  plugins: [tailwindcss(), react(), requireApiUrl()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});
