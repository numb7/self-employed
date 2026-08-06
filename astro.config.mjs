import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://npd-tools.ru',
  output: 'static',
  adapter: vercel(),
  trailingSlash: 'never',
  integrations: [
    react(),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
