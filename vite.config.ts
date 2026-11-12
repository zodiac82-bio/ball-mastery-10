import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';
import { VitePWA } from 'vite-plugin-pwa';

// 구형 iPad(Safari 12 수준)가 주 기기라서 두 벌로 빌드한다.
//  - modern 번들: import.meta.resolve를 지원하는 브라우저(Safari 16.4+)만 사용
//  - legacy 번들: 그보다 오래된 Safari가 받는다. SystemJS + 폴리필 포함,
//    옵셔널 체이닝 같은 최신 문법이 남지 않음
export default defineConfig({
  // GitHub Pages 하위 경로에서도 동작하도록 상대 경로 사용
  base: './',
  plugins: [
    react(),
    legacy({
      targets: ['ios >= 12', 'safari >= 12'],
      modernPolyfills: true,
    }),
    VitePWA({
      // 새 버전은 받아 두었다가 다음에 앱을 열 때 적용한다.
      // (운동 타이머가 도는 중에 화면이 새로고침되지 않게 한다)
      registerType: 'autoUpdate',
      injectRegister: 'script',
      // manifest와 manifest 아이콘은 플러그인이 알아서 캐시에 넣는다
      includeAssets: ['icons/apple-touch-icon.png', 'icons/favicon-48.png'],
      manifest: {
        name: '볼마스터리 10',
        short_name: '볼마스터리',
        description: '유소년 축구 볼마스터리 10가지 동작을 애니메이션과 타이머로 따라 하는 훈련 앱',
        lang: 'ko',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'any',
        background_color: '#0f1a14',
        theme_color: '#0f1a14',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // modern·legacy 번들, 아이콘까지 전부 미리 받아 둔다 → 비행기 모드에서도 동작
        globPatterns: ['**/*.{js,css,html}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
