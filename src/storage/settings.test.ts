import { afterEach, describe, expect, it, vi } from 'vitest';
import { removeKey } from './safeStorage';
import {
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  getSettings,
  reloadSettings,
  resetSettings,
  sanitizeSettings,
  stepSetting,
  updateSettings,
} from './settings';

afterEach(() => {
  vi.unstubAllGlobals();
  removeKey(SETTINGS_KEY);
  reloadSettings();
});

describe('sanitizeSettings', () => {
  it('기본값은 30/15/3초, 3세트, 보통 속도, 소리 끔', () => {
    expect(DEFAULT_SETTINGS).toEqual({
      work: 30,
      rest: 15,
      ready: 3,
      sets: 3,
      speed: 1,
      sound: false,
    });
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings('x')).toEqual(DEFAULT_SETTINGS);
  });

  it('범위를 벗어난 값은 잘라 낸다', () => {
    expect(
      sanitizeSettings({ work: 9999, rest: -5, ready: 3.6, sets: 0, speed: 7, sound: 'yes' }),
    ).toEqual({ work: 120, rest: 0, ready: 4, sets: 1, speed: 1, sound: false });
  });

  it('올바른 값은 그대로 둔다', () => {
    const s = { work: 45, rest: 20, ready: 5, sets: 4, speed: 0.5, sound: true };
    expect(sanitizeSettings(s)).toEqual(s);
  });
});

describe('stepSetting', () => {
  it('한 칸씩 움직이고 범위 끝에서 멈춘다', () => {
    expect(stepSetting(DEFAULT_SETTINGS, 'work', 1)).toBe(35);
    expect(stepSetting(DEFAULT_SETTINGS, 'work', -1)).toBe(25);
    expect(stepSetting({ ...DEFAULT_SETTINGS, work: 10 }, 'work', -1)).toBe(10);
    expect(stepSetting({ ...DEFAULT_SETTINGS, rest: 0 }, 'rest', -1)).toBe(0);
    expect(stepSetting({ ...DEFAULT_SETTINGS, sets: 10 }, 'sets', 1)).toBe(10);
    expect(stepSetting(DEFAULT_SETTINGS, 'ready', 1)).toBe(4);
  });
});

describe('설정 저장소', () => {
  it('바꾼 값이 저장되고 다시 읽어도 유지된다', () => {
    const data: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => (k in data ? data[k] : null),
      setItem: (k: string, v: string) => {
        data[k] = v;
      },
      removeItem: (k: string) => {
        delete data[k];
      },
    });
    reloadSettings();
    updateSettings({ work: 45, sound: true });
    expect(JSON.parse(data[SETTINGS_KEY] || '{}')).toMatchObject({ work: 45, sound: true });
    reloadSettings();
    expect(getSettings()).toMatchObject({ work: 45, rest: 15, sound: true });
    resetSettings();
    expect(getSettings()).toEqual(DEFAULT_SETTINGS);
    expect(SETTINGS_KEY in data).toBe(false);
  });

  it('localStorage가 막혀도 죽지 않는다', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    });
    reloadSettings();
    expect(getSettings()).toEqual(DEFAULT_SETTINGS);
    expect(() => updateSettings({ sets: 5 })).not.toThrow();
    expect(getSettings().sets).toBe(5);
  });
});
