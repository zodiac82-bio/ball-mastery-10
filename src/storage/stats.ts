import { dateKey, daySets } from './records';
import type { Records } from './records';

// 기록 화면에 쓰는 계산. 날짜는 모두 기기 현지 시간 기준.

export function addDays(date: Date, days: number): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + days);
  return d;
}

export interface WeekDay {
  key: string;
  /** 월 화 수 목 금 토 일 */
  label: string;
  dayOfMonth: number;
  sets: number;
  isToday: boolean;
  isFuture: boolean;
}

const LABELS = ['월', '화', '수', '목', '금', '토', '일'];

/** 이번 주(월요일 시작) 7일 */
export function weekOf(records: Records, now: Date): WeekDay[] {
  // getDay(): 일=0 … 토=6 → 월요일까지 며칠 전인지
  const sinceMonday = (now.getDay() + 6) % 7;
  const monday = addDays(now, -sinceMonday);
  const todayKey = dateKey(now);
  return LABELS.map((label, i) => {
    const date = addDays(monday, i);
    const key = dateKey(date);
    return {
      key,
      label,
      dayOfMonth: date.getDate(),
      sets: daySets(records[key]),
      isToday: key === todayKey,
      isFuture: i > sinceMonday,
    };
  });
}

/**
 * 연속 운동일. 오늘 했으면 오늘부터, 아직 안 했으면 어제부터 거꾸로 센다
 * (오늘 운동 전이라고 스트릭이 0으로 보이지 않게).
 */
export function currentStreak(records: Records, now: Date): number {
  let day = daySets(records[dateKey(now)]) > 0 ? now : addDays(now, -1);
  let streak = 0;
  while (daySets(records[dateKey(day)]) > 0) {
    streak++;
    day = addDays(day, -1);
  }
  return streak;
}

/** 지금까지 운동한 날 수와 세트 수 */
export function totals(records: Records): { days: number; sets: number } {
  let days = 0;
  let sets = 0;
  Object.keys(records).forEach((key) => {
    const n = daySets(records[key]);
    if (n > 0) {
      days++;
      sets += n;
    }
  });
  return { days, sets };
}
