import { defineConfig, devices } from '@playwright/test';

// 빌드 결과(dist)를 미리보기 서버로 띄워 놓고 확인하는 스모크 테스트.
// 실행: npm run test:e2e  (빌드 → 테스트)
// 스크린샷은 test-results/screenshots/ 에 남는다.

const PORT = 4173;

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results/artifacts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list']],
  timeout: 60000,
  use: {
    baseURL: 'http://localhost:' + PORT,
    locale: 'ko-KR',
    // 서비스 워커가 캐시한 옛 파일이 섞이지 않게 기본은 막고, 오프라인 테스트에서만 켠다
    serviceWorkers: 'block',
  },
  webServer: {
    command: 'npm run preview -- --port ' + PORT + ' --strictPort',
    url: 'http://localhost:' + PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
  projects: [
    // iPad Safari와 같은 엔진(WebKit), 같은 화면 크기
    { name: 'ipad-landscape', use: { ...devices['iPad (gen 7) landscape'] } },
    { name: 'ipad-portrait', use: { ...devices['iPad (gen 7)'] } },
    // Android Chrome과 같은 엔진(Chromium), 휴대폰·태블릿 화면 크기
    { name: 'android-phone', use: { ...devices['Pixel 7'] } },
    { name: 'android-phone-landscape', use: { ...devices['Pixel 7 landscape'] } },
    { name: 'android-tablet', use: { ...devices['Galaxy Tab S4'] } },
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
