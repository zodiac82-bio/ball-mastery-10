import { useSyncExternalStore } from 'react';
import { DEFAULT_CONFIG } from '../timer/workout';
import type { WorkoutConfig } from '../timer/workout';
import { readJSON, removeKey, writeJSON } from './safeStorage';

export interface Settings extends WorkoutConfig {
  /** 애니메이션 기본 속도 */
  speed: number;
  /** 공 터치 박자음 기본값 */
  sound: boolean;
}

export const SETTINGS_KEY = 'bm10.settings.v1';

export const SPEEDS: ReadonlyArray<number> = [0.5, 1, 1.5];

export const DEFAULT_SETTINGS: Settings = { ...DEFAULT_CONFIG, speed: 1, sound: false };

export type NumericSetting = 'work' | 'rest' | 'ready' | 'sets';

/** 숫자 설정의 허용 범위와 버튼 한 번에 바뀌는 양 */
export const LIMITS: Record<NumericSetting, { min: number; max: number; step: number }> = {
  work: { min: 10, max: 120, step: 5 },
  rest: { min: 0, max: 60, step: 5 },
  ready: { min: 0, max: 10, step: 1 },
  sets: { min: 1, max: 10, step: 1 },
};

function clampInt(value: unknown, key: NumericSetting): number {
  const lim = LIMITS[key];
  if (typeof value !== 'number' || !isFinite(value)) return DEFAULT_SETTINGS[key];
  return Math.max(lim.min, Math.min(lim.max, Math.round(value)));
}

/** 저장소에서 읽은 값을 범위 안의 올바른 설정으로 만든다 */
export function sanitizeSettings(raw: unknown): Settings {
  const r = (raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}) as Record<
    string,
    unknown
  >;
  const speed = typeof r.speed === 'number' && SPEEDS.indexOf(r.speed) >= 0 ? r.speed : 1;
  return {
    work: clampInt(r.work, 'work'),
    rest: clampInt(r.rest, 'rest'),
    ready: clampInt(r.ready, 'ready'),
    sets: clampInt(r.sets, 'sets'),
    speed,
    sound: r.sound === true,
  };
}

/** 숫자 설정을 한 칸 올리거나 내린 값 */
export function stepSetting(settings: Settings, key: NumericSetting, dir: 1 | -1): number {
  return clampInt(settings[key] + dir * LIMITS[key].step, key);
}

// ---- 앱 전체가 공유하는 저장소 ----

let current: Settings | null = null;
const listeners: Array<() => void> = [];

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

export function getSettings(): Settings {
  if (!current) current = sanitizeSettings(readJSON(SETTINGS_KEY, null));
  return current;
}

export function updateSettings(patch: Partial<Settings>): void {
  current = sanitizeSettings({ ...getSettings(), ...patch });
  writeJSON(SETTINGS_KEY, current);
  emit();
}

export function resetSettings(): void {
  current = { ...DEFAULT_SETTINGS };
  removeKey(SETTINGS_KEY);
  emit();
}

/** 테스트용: 저장소에서 다시 읽게 한다 */
export function reloadSettings(): void {
  current = null;
  emit();
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, getSettings, getSettings);
}
