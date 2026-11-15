import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Относительные пути: сайт живёт в /liks/. Сборка в dist, на бой копирует npm run publish.
  base: './',
  build: {outDir: 'dist', emptyOutDir: true},
  plugins: [react()],
  // npm run dev с VITE_BACKEND=server ходит в локальный сервер (npm run dev:api) на :8787.
  server: {proxy: {'/api': {target: 'http://127.0.0.1:8787', changeOrigin: false}}},
  resolve: { dedupe: ['react', 'react-dom'] },
  // Все компоненты Astryx собираем заранее одним пакетом. Иначе Vite находит новый компонент
  // в отложенном экране на лету, пересобирает зависимости, и в странице оказываются две копии React
  // («Invalid hook call»). Добавил новый компонент — допиши его сюда и перезапусти dev.
  optimizeDeps: {
    include: [
      '@astryxdesign/core/AlertDialog',
      '@astryxdesign/core/AspectRatio',
      '@astryxdesign/core/Avatar',
      '@astryxdesign/core/Badge',
      '@astryxdesign/core/Banner',
      '@astryxdesign/core/BottomSheet',
      '@astryxdesign/core/Button',
      '@astryxdesign/core/Card',
      '@astryxdesign/core/Carousel',
      '@astryxdesign/core/Divider',
      '@astryxdesign/core/TextArea',
      '@astryxdesign/core/DateInput',
      '@astryxdesign/core/EmptyState',
      '@astryxdesign/core/Grid',
      '@astryxdesign/core/HStack',
      '@astryxdesign/core/Heading',
      '@astryxdesign/core/Icon',
      '@astryxdesign/core/Layer',
      '@astryxdesign/core/List',
      '@astryxdesign/core/ProgressBar',
      '@astryxdesign/core/SegmentedControl',
      '@astryxdesign/core/Skeleton',
      '@astryxdesign/core/StatusDot',
      '@astryxdesign/core/Switch',
      '@astryxdesign/core/Text',
      '@astryxdesign/core/TextInput',
      '@astryxdesign/core/Thumbnail',
      '@astryxdesign/core/Toast',
      '@astryxdesign/core/Token',
      '@astryxdesign/core/VStack',
      '@astryxdesign/core/i18n',
      '@astryxdesign/core/locales/ru-RU.generated.js',
      '@astryxdesign/core/theme',
      '@heroicons/react/24/outline',
      '@heroicons/react/24/solid',
      'qrcode-generator',
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-runtime',
    ],
  },
})
