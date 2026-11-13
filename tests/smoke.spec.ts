import { expect, test } from '@playwright/test';
import type { Page, TestInfo } from '@playwright/test';

/** 타이머를 빨리 끝내기 위한 짧은 설정: 준비 2초, 운동 10초 × 2세트, 휴식 없음 */
const FAST_SETTINGS = { work: 10, rest: 0, ready: 2, sets: 2, speed: 1, sound: false };

/** 페이지에서 난 에러를 모은다. 테스트 끝에 비어 있어야 한다. */
function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('console: ' + m.text());
  });
  return errors;
}

async function shot(page: Page, info: TestInfo, name: string): Promise<void> {
  await page.screenshot({
    path: 'test-results/screenshots/' + info.project.name + '/' + name + '.png',
    fullPage: true,
  });
}

/** 오른발 SVG의 transform. 애니메이션이 움직이는지 볼 때 쓴다. */
function footTransform(page: Page): Promise<string | null> {
  return page.locator('svg [data-foot="R"]').first().getAttribute('transform');
}

test('홈: 10개 동작 카드와 범례가 보인다', async ({ page }, info) => {
  const errors = collectErrors(page);
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('볼마스터리');
  await expect(page.locator('ul a')).toHaveCount(10);
  await expect(page.locator('ul a').first()).toContainText('탭 스텝');
  await expect(page.locator('ul a').first()).toContainText('Tap Step');
  await expect(page.locator('ul a').nth(2)).toContainText('L/R');
  await expect(page.getByText('파란 발 = 오른발')).toBeVisible();
  await expect(page.getByRole('button', { name: '▶ 전체 루틴 시작' })).toBeEnabled();
  // 가로로 넘치지 않는다
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  // 장갑을 끼고도 누를 수 있게 모든 버튼·링크가 48px 이상
  const small = await page.evaluate(
    () =>
      Array.from(document.querySelectorAll('button, a'))
        .map((el) => el.getBoundingClientRect())
        .filter((r) => r.width > 0 && (r.width < 48 || r.height < 48)).length,
  );
  expect(small).toBe(0);
  await shot(page, info, 'home');
  expect(errors).toEqual([]);
});

test('상세: 애니메이션이 움직이고 컨트롤이 동작한다', async ({ page }, info) => {
  const errors = collectErrors(page);
  await page.goto('./');
  await page.locator('ul a', { hasText: '드래그 토 스텝' }).click();
  await expect(page).toHaveURL(/#\/drill\/drag-toe-step$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('3. 드래그 토 스텝');
  await expect(page.locator('main li', { hasText: '몸 쪽으로 끌고' })).toBeVisible();

  // 재생 중: 발이 움직인다
  const a = await footTransform(page);
  await expect.poll(() => footTransform(page)).not.toBe(a);

  // 멈춤: 발이 멈춘다
  await page.getByRole('button', { name: '⏸ 멈춤' }).click();
  await page.waitForTimeout(300);
  const paused = await footTransform(page);
  await page.waitForTimeout(400);
  expect(await footTransform(page)).toBe(paused);

  // 한 단계씩 넘기기: 캡션이 다음 단계로 바뀐다
  const caption = page.locator('p[aria-live]');
  const before = await caption.textContent();
  await page.getByRole('button', { name: '다음 단계' }).click();
  await expect(caption).not.toHaveText(before || '');

  // 왼발 반전: 캡션의 "오른"이 "왼"으로
  await page.getByRole('button', { name: '▶ 재생' }).click();
  await page.getByRole('button', { name: '왼발', exact: true }).click();
  await expect(caption).toContainText(/왼발|발바닥|발을|발끝/);
  await expect
    .poll(async () => (await caption.textContent()) || '', { timeout: 5000 })
    .toContain('왼발');

  await shot(page, info, 'detail');

  // 다음 동작으로
  await page.getByRole('link', { name: /다음 동작/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('4. 프레스 롤');
  expect(errors).toEqual([]);
});

test('타이머: 세트가 끝까지 진행되고 기록이 새로고침 뒤에도 남는다', async ({ page }, info) => {
  const errors = collectErrors(page);
  await page.addInitScript((settings) => {
    if (!localStorage.getItem('bm10.settings.v1')) {
      localStorage.setItem('bm10.settings.v1', JSON.stringify(settings));
    }
  }, FAST_SETTINGS);
  await page.goto('./#/drill/drag-toe-step');

  await page.getByRole('button', { name: '▶ 10초 × 2세트 시작' }).click();
  const phase = page.locator('[data-timer-phase]');
  await expect(phase).toHaveText('준비 · 오른발');
  await expect(page.locator('[data-timer-set]')).toHaveText('1/2세트');

  await expect(phase).toHaveText('운동! · 오른발', { timeout: 5000 });
  await shot(page, info, 'timer');

  // 일시정지하면 숫자가 멈춘다
  await page.getByRole('button', { name: '⏸ 일시정지' }).click();
  await expect(phase).toHaveText('일시정지');
  const left = await page.locator('[data-timer-left]').textContent();
  await page.waitForTimeout(1600);
  await expect(page.locator('[data-timer-left]')).toHaveText(left || '');
  await page.getByRole('button', { name: '▶ 계속' }).click();

  // 2세트는 왼발로 자동 전환 (L/R 동작)
  await expect(phase).toHaveText('운동! · 왼발', { timeout: 15000 });
  await expect(page.locator('[data-timer-set]')).toHaveText('2/2세트');
  await expect(page.getByRole('button', { name: '왼발', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await expect(phase).toHaveText('완료!', { timeout: 15000 });
  await shot(page, info, 'timer-done');

  // 홈 카드에 오늘 완료 배지
  await page.getByRole('link', { name: '← 목록' }).click();
  const card = page.locator('ul a', { hasText: '드래그 토 스텝' });
  await expect(card).toContainText('✓ 2세트');

  // 새로고침해도 남아 있다
  await page.reload();
  await expect(page.locator('ul a', { hasText: '드래그 토 스텝' })).toContainText('✓ 2세트');

  // 기록 화면에도 반영
  await page.getByRole('link', { name: '기록' }).click();
  await expect(page.locator('[data-stat="today"]')).toContainText('2');
  await expect(page.locator('[data-stat="streak"]')).toContainText('1');
  await shot(page, info, 'records');
  expect(errors).toEqual([]);
});

test('전체 루틴: 시작하면 1번 동작부터 "1/10"으로 진행한다', async ({ page }) => {
  const errors = collectErrors(page);
  await page.addInitScript((settings) => {
    localStorage.setItem('bm10.settings.v1', JSON.stringify(settings));
  }, FAST_SETTINGS);
  await page.goto('./');
  await page.getByRole('button', { name: '▶ 전체 루틴 시작' }).click();
  await expect(page).toHaveURL(/#\/drill\/tap-step$/);
  await expect(page.locator('[data-timer-set]')).toHaveText('1/10 탭 스텝 · 1/2세트');
  // 1번 동작 2세트(2 + 10 + 10초)가 끝나면 2번 동작으로 넘어간다
  await expect(page.locator('[data-timer-set]')).toHaveText('2/10 인사이드 스텝 · 1/2세트', {
    timeout: 30000,
  });
  await expect(page).toHaveURL(/#\/drill\/inside-step$/);
  // 목록으로 나가면 타이머가 끝난다
  await page.getByRole('link', { name: '← 목록' }).click();
  await expect(page.locator('[data-timer-phase]')).toHaveCount(0);
  await expect(page.locator('ul a', { hasText: '탭 스텝' }).first()).toContainText('✓ 2세트');
  expect(errors).toEqual([]);
});

test('설정: 값을 바꾸면 저장되고 화면에 반영된다', async ({ page }, info) => {
  const errors = collectErrors(page);
  await page.goto('./#/settings');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('설정');
  await shot(page, info, 'settings');
  await page.getByRole('button', { name: '운동 시간 늘리기' }).click();
  await page.getByRole('button', { name: '세트 수 늘리기' }).click();
  await expect(page.locator('[data-setting="work"] output')).toContainText('35');
  await page.reload();
  await expect(page.locator('[data-setting="work"] output')).toContainText('35');
  await page.getByRole('link', { name: '← 목록' }).click();
  await expect(page.locator('ul a').first()).toContainText('35초 × 4세트');
  expect(errors).toEqual([]);
});

test('기록 초기화는 앱 안의 확인 대화상자를 거친다', async ({ page }) => {
  const errors = collectErrors(page);
  let nativeDialog = false;
  page.on('dialog', (d) => {
    nativeDialog = true;
    void d.dismiss();
  });
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('seeded')) {
      sessionStorage.setItem('seeded', '1');
      const d = new Date();
      const key =
        d.getFullYear() +
        '-' +
        ('0' + (d.getMonth() + 1)).slice(-2) +
        '-' +
        ('0' + d.getDate()).slice(-2);
      localStorage.setItem('bm10.records.v1', JSON.stringify({ [key]: { 'tap-step': 3 } }));
    }
  });
  await page.goto('./#/records');
  await expect(page.locator('[data-stat="today"]')).toContainText('3');
  await page.getByRole('button', { name: '기록 초기화' }).click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toContainText('기록을 모두 지울까요?');
  await dialog.getByRole('button', { name: '취소' }).click();
  await expect(page.locator('[data-stat="today"]')).toContainText('3');
  await page.getByRole('button', { name: '기록 초기화' }).click();
  await dialog.getByRole('button', { name: '모두 지우기' }).click();
  await expect(page.locator('[data-stat="today"]')).toContainText('0');
  expect(nativeDialog).toBe(false);
  expect(errors).toEqual([]);
});

test('localStorage가 막혀 있어도 앱이 죽지 않는다', async ({ page }) => {
  const errors = collectErrors(page);
  await page.addInitScript(() => {
    const blocked = () => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    };
    Storage.prototype.getItem = blocked;
    Storage.prototype.setItem = blocked;
    Storage.prototype.removeItem = blocked;
  });
  await page.goto('./');
  await expect(page.locator('ul a')).toHaveCount(10);
  await page.locator('ul a').first().click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('1. 탭 스텝');
  const a = await footTransform(page);
  await expect.poll(() => footTransform(page)).not.toBe(a);
  // 설정 변경도 세션 동안은 동작한다
  await page.goto('./#/settings');
  await page.getByRole('button', { name: '운동 시간 늘리기' }).click();
  await expect(page.locator('[data-setting="work"] output')).toContainText('35');
  expect(errors).toEqual([]);
});

test('구형 브라우저용(legacy) 번들만으로도 앱이 뜬다', async ({ page }) => {
  // 최신 브라우저용 스크립트를 빼고 열어서, 구형 Safari가 받는 legacy 번들
  // (SystemJS + 폴리필)이 실제로 실행되는지 본다. 구형 엔진 자체의 검증은 아니다.
  const pageErrors: string[] = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  await page.route(/\/(index\.html)?(\?.*)?$/, async (route) => {
    const response = await route.fetch();
    const html = (await response.text())
      .replace(/<script type="module" crossorigin src="[^"]*"><\/script>/g, '')
      .replace('window.__vite_is_modern_browser=true', 'void 0');
    await route.fulfill({ response, body: html });
  });
  const scripts: string[] = [];
  page.on('request', (r) => {
    if (r.resourceType() === 'script') scripts.push(r.url());
  });
  await page.goto('./');
  await expect(page.locator('ul a')).toHaveCount(10);
  expect(scripts.some((u) => /index-legacy-/.test(u))).toBe(true);
  expect(scripts.some((u) => /assets\/index-(?!legacy)/.test(u))).toBe(false);
  await page.locator('ul a', { hasText: '라보나 탭' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('8. 라보나 탭');
  const a = await footTransform(page);
  await expect.poll(() => footTransform(page)).not.toBe(a);
  expect(pageErrors).toEqual([]);
});

test('Android: 브라우저가 설치를 허용하면 "앱 설치" 버튼이 뜨고, 누르면 설치 창을 띄운다', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto('./');
  const hint = page.locator('[data-install-hint]');
  await expect(hint).toBeVisible();
  await expect(hint.getByRole('button', { name: '앱 설치' })).toHaveCount(0);

  // Chrome이 보내는 beforeinstallprompt를 흉내 낸다(실제 설치 창은 자동 테스트로 띄울 수 없다)
  await page.evaluate(() => {
    const w = window as unknown as { __prompted: number };
    w.__prompted = 0;
    const event = new Event('beforeinstallprompt', { cancelable: true });
    Object.assign(event, {
      prompt: () => {
        w.__prompted++;
        return Promise.resolve();
      },
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    });
    window.dispatchEvent(event);
  });

  const button = hint.getByRole('button', { name: '앱 설치' });
  await expect(button).toBeVisible();
  await button.click();
  expect(await page.evaluate(() => (window as unknown as { __prompted: number }).__prompted)).toBe(
    1,
  );
  // 설치를 수락하면 안내가 사라진다
  await expect(hint).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('홈 화면 추가 안내는 닫으면 다시 나오지 않는다', async ({ page }) => {
  await page.goto('./');
  const hint = page.locator('[data-install-hint]');
  await hint.getByRole('button', { name: '닫기' }).click();
  await expect(hint).toHaveCount(0);
  await page.reload();
  await expect(page.locator('ul a')).toHaveCount(10);
  await expect(hint).toHaveCount(0);
});

test.describe('오프라인', () => {
  test.use({ serviceWorkers: 'allow' });

  test('한 번 연 뒤에는 네트워크 없이도 열린다', async ({ page, context }) => {
    await page.goto('./');
    await expect(page.locator('ul a')).toHaveCount(10);
    // 서비스 워커가 파일을 다 저장할 때까지 기다린다
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      for (let i = 0; i < 50; i++) {
        const keys = await caches.keys();
        let count = 0;
        for (const k of keys) count += (await (await caches.open(k)).keys()).length;
        if (count >= 12) return;
        await new Promise((r) => setTimeout(r, 200));
      }
      throw new Error('캐시가 채워지지 않음');
    });

    await context.setOffline(true);
    await page.reload();
    await expect(page.locator('ul a')).toHaveCount(10);
    await page.locator('ul a', { hasText: '롤 백 V' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('10. 롤 백 V');
    const a = await footTransform(page);
    await expect.poll(() => footTransform(page)).not.toBe(a);
    await context.setOffline(false);
  });
});
