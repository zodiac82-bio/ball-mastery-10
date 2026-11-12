import { describe, expect, it } from 'vitest';
import { installHintKind } from './install';

const base = { maxTouchPoints: 0, iosStandalone: false, displayStandalone: false };

const OLD_IPAD =
  'Mozilla/5.0 (iPad; CPU OS 12_5_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1.2 Mobile/15E148 Safari/604.1';
const NEW_IPAD =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15';
const DESKTOP_CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

describe('installHintKind', () => {
  it('구형 iPad Safari는 iOS 안내', () => {
    expect(installHintKind({ ...base, userAgent: OLD_IPAD, maxTouchPoints: 5 })).toBe('ios');
  });

  it('Mac인 척하는 최신 iPad도 터치가 있으면 iOS 안내', () => {
    expect(installHintKind({ ...base, userAgent: NEW_IPAD, maxTouchPoints: 5 })).toBe('ios');
  });

  it('진짜 Mac과 다른 브라우저는 일반 안내', () => {
    expect(installHintKind({ ...base, userAgent: NEW_IPAD })).toBe('other');
    expect(installHintKind({ ...base, userAgent: DESKTOP_CHROME })).toBe('other');
  });

  it('홈 화면 앱으로 열렸으면 안내하지 않는다', () => {
    expect(installHintKind({ ...base, userAgent: OLD_IPAD, iosStandalone: true })).toBe(
      'installed',
    );
    expect(installHintKind({ ...base, userAgent: DESKTOP_CHROME, displayStandalone: true })).toBe(
      'installed',
    );
  });
});
