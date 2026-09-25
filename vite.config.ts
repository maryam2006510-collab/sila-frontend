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

// The fonts the first screen paints with (hero title 700, body 400, figures in Montserrat) are
// requested with the HTML instead of after the CSS applies, so the text does not re-render when
// they land (D35). Only these three: preloading every weight would compete with the app's JS.
const PRELOAD_FONTS = [
  /ibm-plex-sans-arabic-arabic-400-normal.*.woff2$/,
  /ibm-plex-sans-arabic-arabic-700-normal.*.woff2$/,
  /montserrat-latin-wght-normal.*.woff2$/,
];
const preloadFonts = (): Plugin => ({
  name: 'sila:preload-fonts',
  apply: 'build',
  transformIndexHtml: {
    order: 'post',
    handler(_html, ctx) {
      const files = Object.keys(ctx.bundle ?? {});
      return PRELOAD_FONTS.flatMap((re) => files.filter((file) => re.test(file))).map((file) => ({
        tag: 'link',
        attrs: { rel: 'preload', href: `/${file}`, as: 'font', type: 'font/woff2', crossorigin: '' },
        injectTo: 'head' as const,
      }));
    },
  },
});

export default defineConfig({
  plugins: [tailwindcss(), react(), requireApiUrl(), preloadFonts()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Libraries that rarely change get their own long-cached files (vercel.json: immutable), so
        // a release only re-downloads the app code that changed (D35)
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom|cookie)[\\/]/.test(id))
            return 'vendor-react';
          if (id.includes('@tanstack')) return 'vendor-query';
        },
      },
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});
