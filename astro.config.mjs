import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://samozanyatye.vercel.app',
  output: 'static',
  devToolbar: { enabled: false },
  trailingSlash: 'never',
  integrations: [
    react(),
  ],
  vite: {
    cacheDir: `./node_modules/.vite/astro-${process.env.NODE_ENV || 'development'}`,
    plugins: [tailwindcss()],
  },
});
