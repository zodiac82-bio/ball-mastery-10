import { useSyncExternalStore } from 'react';
import { readJSON, removeKey, writeJSON } from './safeStorage';

// 운동 기록: 날짜별 · 동작별 완료 세트 수.
// 이름·나이 같은 개인정보는 저장하지 않는다. 기기 밖으로 나가지 않는다.

/** 동작 id → 완료 세트 수 */
export type DayRecord = Record<string, number>;
/** 'YYYY-MM-DD'(기기 현지 날짜) → 그날 기록 */
export type Records = Record<string, DayRecord>;

export const RECORDS_KEY = 'bm10.records.v1';

/** 기기 현지 시간 기준 날짜 키 */
export function dateKey(date: Date): string {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return date.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (d < 10 ? '0' : '') + d;
}

/** 저장소에서 읽은 값을 믿을 수 있는 모양으로 걸러 낸다 */
export function sanitizeRecords(raw: unknown): Records {
  const out: Records = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  const days = raw as Record<string, unknown>;
  Object.keys(days).forEach((day) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return;
    const value = days[day];
    if (!value || typeof value !== 'object' || Array.isArray(value)) return;
    const entries = value as Record<string, unknown>;
    const clean: DayRecord = {};
    Object.keys(entries).forEach((id) => {
      const n = entries[id];
      if (typeof n === 'number' && isFinite(n) && n > 0) clean[id] = Math.floor(n);
    });
    if (Object.keys(clean).length > 0) out[day] = clean;
  });
  return out;
}

/** 세트 하나를 더한 새 기록을 돌려준다(원본은 그대로) */
export function addSet(records: Records, day: string, drillId: string): Records {
  const prev = records[day] || {};
  return { ...records, [day]: { ...prev, [drillId]: (prev[drillId] || 0) + 1 } };
}

/** 그날 한 세트 수 합계 */
export function daySets(day: DayRecord | undefined): number {
  if (!day) return 0;
  return Object.keys(day).reduce((sum, id) => sum + (day[id] || 0), 0);
}

// ---- 앱 전체가 공유하는 저장소 ----

const EMPTY: DayRecord = {};
let current: Records | null = null;
const listeners: Array<() => void> = [];

function load(): Records {
  if (!current) current = sanitizeRecords(readJSON(RECORDS_KEY, {}));
  return current;
}

function emit(): void {
  listeners.slice().forEach((fn) => fn());
}

function subscribe(fn: () => void): () => void {
  listeners.push(fn);
  return () => {
    const i = listeners.indexOf(fn);
    if (i >= 0) listeners.splice(i, 1);
  };
}

export function getRecords(): Records {
  return load();
}

/** 완료한 세트 하나를 기록한다 */
export function recordSet(drillId: string, when: Date = new Date()): void {
  current = addSet(load(), dateKey(when), drillId);
  writeJSON(RECORDS_KEY, current);
  emit();
}

export function clearRecords(): void {
  current = {};
  removeKey(RECORDS_KEY);
  emit();
}

/** 테스트용: 메모리에 올라온 기록을 버리고 저장소에서 다시 읽게 한다 */
export function reloadRecords(): void {
  current = null;
  emit();
}

export function useRecords(): Records {
  return useSyncExternalStore(subscribe, getRecords, getRecords);
}

/** 오늘 기록 (동작 id → 세트 수) */
export function todayRecord(records: Records, now: Date = new Date()): DayRecord {
  return records[dateKey(now)] || EMPTY;
}
