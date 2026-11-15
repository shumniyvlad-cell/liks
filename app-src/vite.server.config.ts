import {defineConfig} from 'vite';

// Сервер собирается в один файл server-dist/main.js вместе с общим меню и счётом из src/.
// Пакеты (hono, postgres) остаются внешними: на сервере их ставит npm ci --omit=dev.
export default defineConfig({
  publicDir: false,
  build: {ssr: 'server/main.ts', outDir: 'server-dist', emptyOutDir: true, target: 'node22', minify: false},
});
