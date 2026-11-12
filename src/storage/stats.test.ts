import { describe, expect, it } from 'vitest';
import type { Records } from './records';
import { addDays, currentStreak, totals, weekOf } from './stats';

// 2026-11-12는 목요일
const THU = new Date(2026, 10, 12, 16, 30);

describe('weekOf', () => {
  it('월요일부터 일요일까지 7일', () => {
    const week = weekOf({}, THU);
    expect(week.map((d) => d.label).join('')).toBe('월화수목금토일');
    expect(week.map((d) => d.key)).toEqual([
      '2026-11-09',
      '2026-11-10',
      '2026-11-11',
      '2026-11-12',
      '2026-11-13',
      '2026-11-14',
      '2026-11-15',
    ]);
    expect(week.map((d) => d.isToday)).toEqual([false, false, false, true, false, false, false]);
    expect(week.map((d) => d.isFuture)).toEqual([false, false, false, false, true, true, true]);
  });

  it('일요일은 그 주의 마지막 날, 월요일은 첫날', () => {
    const sun = weekOf({}, new Date(2026, 10, 15));
    expect(sun[0]?.key).toBe('2026-11-09');
    expect(sun[6]?.isToday).toBe(true);
    const mon = weekOf({}, new Date(2026, 10, 16));
    expect(mon[0]?.key).toBe('2026-11-16');
    expect(mon[0]?.isToday).toBe(true);
  });

  it('달이 바뀌는 주도 이어진다', () => {
    const week = weekOf({}, new Date(2026, 11, 2)); // 12월 2일 수요일
    expect(week.map((d) => d.dayOfMonth)).toEqual([30, 1, 2, 3, 4, 5, 6]);
  });

  it('그날 세트 합계를 보여 준다', () => {
    const records: Records = {
      '2026-11-10': { 'tap-step': 3, 'press-roll': 2 },
      '2026-11-12': { 'tap-step': 1 },
    };
    expect(weekOf(records, THU).map((d) => d.sets)).toEqual([0, 5, 0, 1, 0, 0, 0]);
  });
});

describe('currentStreak', () => {
  const day = (offset: number) => {
    const d = addDays(THU, offset);
    const m = d.getMonth() + 1;
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + ('0' + d.getDate()).slice(-2);
  };

  it('기록이 없으면 0', () => {
    expect(currentStreak({}, THU)).toBe(0);
  });

  it('오늘 포함 연속 3일', () => {
    const r: Records = { [day(0)]: { a: 1 }, [day(-1)]: { a: 3 }, [day(-2)]: { a: 2 } };
    expect(currentStreak(r, THU)).toBe(3);
  });

  it('오늘 아직 안 했어도 어제까지의 연속은 유지된다', () => {
    const r: Records = { [day(-1)]: { a: 3 }, [day(-2)]: { a: 2 } };
    expect(currentStreak(r, THU)).toBe(2);
  });

  it('하루 빠지면 끊긴다', () => {
    const r: Records = { [day(0)]: { a: 1 }, [day(-2)]: { a: 2 }, [day(-3)]: { a: 2 } };
    expect(currentStreak(r, THU)).toBe(1);
    expect(currentStreak({ [day(-2)]: { a: 2 } }, THU)).toBe(0);
  });

  it('달을 넘어가도 이어서 센다', () => {
    const now = new Date(2026, 11, 2);
    const r: Records = {
      '2026-12-02': { a: 1 },
      '2026-12-01': { a: 1 },
      '2026-11-30': { a: 1 },
      '2026-11-29': { a: 1 },
    };
    expect(currentStreak(r, now)).toBe(4);
  });
});

describe('totals', () => {
  it('운동한 날 수와 세트 합계', () => {
    expect(totals({})).toEqual({ days: 0, sets: 0 });
    expect(
      totals({ '2026-11-10': { a: 3, b: 2 }, '2026-11-12': { a: 1 }, '2026-11-13': {} }),
    ).toEqual({ days: 2, sets: 6 });
  });
});
