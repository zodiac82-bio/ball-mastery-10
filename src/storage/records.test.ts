import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  RECORDS_KEY,
  addSet,
  clearRecords,
  dateKey,
  daySets,
  getRecords,
  recordSet,
  reloadRecords,
  sanitizeRecords,
  todayRecord,
} from './records';
import { readJSON, removeKey, writeJSON } from './safeStorage';

/** 메모리로 흉내 낸 localStorage */
function fakeStorage(initial: Record<string, string> = {}) {
  const data: Record<string, string> = { ...initial };
  return {
    data,
    getItem: (k: string) => (k in data ? (data[k] as string) : null),
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
    removeItem: (k: string) => {
      delete data[k];
    },
  };
}

/** 무엇을 해도 예외를 던지는 localStorage (사파리 개인정보 보호 모드 등) */
const brokenStorage = {
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
  removeItem: () => {
    throw new Error('SecurityError');
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
  removeKey(RECORDS_KEY);
  removeKey('t');
  reloadRecords();
});

describe('dateKey', () => {
  it('현지 날짜를 YYYY-MM-DD로', () => {
    expect(dateKey(new Date(2026, 10, 12, 23, 59))).toBe('2026-11-12');
    expect(dateKey(new Date(2026, 0, 5, 0, 0))).toBe('2026-01-05');
  });
});

describe('addSet · daySets', () => {
  it('세트를 하나씩 더하고 원본은 그대로 둔다', () => {
    const a = {};
    const b = addSet(a, '2026-11-12', 'tap-step');
    const c = addSet(b, '2026-11-12', 'tap-step');
    const d = addSet(c, '2026-11-12', 'press-roll');
    const e = addSet(d, '2026-11-13', 'tap-step');
    expect(a).toEqual({});
    expect(b).toEqual({ '2026-11-12': { 'tap-step': 1 } });
    expect(e).toEqual({
      '2026-11-12': { 'tap-step': 2, 'press-roll': 1 },
      '2026-11-13': { 'tap-step': 1 },
    });
    expect(daySets(e['2026-11-12'])).toBe(3);
    expect(daySets(undefined)).toBe(0);
  });
});

describe('sanitizeRecords', () => {
  it('깨진 값은 버리고 올바른 값만 남긴다', () => {
    expect(sanitizeRecords(null)).toEqual({});
    expect(sanitizeRecords('x')).toEqual({});
    expect(sanitizeRecords([1, 2])).toEqual({});
    expect(
      sanitizeRecords({
        '2026-11-12': { 'tap-step': 3, bad: -1, worse: 'x', half: 2.7 },
        'not-a-date': { 'tap-step': 1 },
        '2026-11-13': 'nope',
        '2026-11-14': {},
      }),
    ).toEqual({ '2026-11-12': { 'tap-step': 3, half: 2 } });
  });
});

describe('저장소', () => {
  it('기록하면 localStorage에 남고, 다시 읽어도 그대로다 (새로고침)', () => {
    const store = fakeStorage();
    vi.stubGlobal('localStorage', store);
    reloadRecords();
    const now = new Date(2026, 10, 12, 16, 0);
    recordSet('tap-step', now);
    recordSet('tap-step', now);
    expect(JSON.parse(store.data[RECORDS_KEY] || '{}')).toEqual({
      '2026-11-12': { 'tap-step': 2 },
    });
    reloadRecords(); // 앱을 다시 연 것과 같다
    expect(todayRecord(getRecords(), now)).toEqual({ 'tap-step': 2 });
    expect(todayRecord(getRecords(), new Date(2026, 10, 13))).toEqual({});
  });

  it('localStorage가 예외를 던져도 죽지 않고, 세션 동안은 기록이 유지된다', () => {
    vi.stubGlobal('localStorage', brokenStorage);
    reloadRecords();
    const now = new Date(2026, 10, 12);
    expect(() => recordSet('press-roll', now)).not.toThrow();
    expect(todayRecord(getRecords(), now)).toEqual({ 'press-roll': 1 });
    reloadRecords();
    expect(todayRecord(getRecords(), now)).toEqual({ 'press-roll': 1 });
    expect(() => clearRecords()).not.toThrow();
    expect(getRecords()).toEqual({});
  });

  it('localStorage가 아예 없어도 동작한다', () => {
    vi.stubGlobal('localStorage', undefined);
    reloadRecords();
    expect(() => recordSet('tap-step')).not.toThrow();
    expect(daySets(todayRecord(getRecords()))).toBe(1);
  });

  it('저장된 값이 깨진 JSON이면 빈 기록으로 시작한다', () => {
    vi.stubGlobal('localStorage', fakeStorage({ [RECORDS_KEY]: '{oops' }));
    reloadRecords();
    expect(getRecords()).toEqual({});
  });

  it('clearRecords는 저장소에서도 지운다', () => {
    const store = fakeStorage();
    vi.stubGlobal('localStorage', store);
    reloadRecords();
    recordSet('tap-step');
    clearRecords();
    expect(RECORDS_KEY in store.data).toBe(false);
    expect(getRecords()).toEqual({});
  });
});

describe('safeStorage', () => {
  it('writeJSON은 실제로 저장됐는지 알려 준다', () => {
    vi.stubGlobal('localStorage', fakeStorage());
    expect(writeJSON('t', { a: 1 })).toBe(true);
    expect(readJSON('t', null)).toEqual({ a: 1 });
    vi.stubGlobal('localStorage', brokenStorage);
    expect(writeJSON('t', { a: 2 })).toBe(false);
    expect(readJSON('t', null)).toEqual({ a: 2 });
    expect(readJSON('none', 'fallback')).toBe('fallback');
  });
});
