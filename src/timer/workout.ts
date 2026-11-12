import type { Side } from '../data/types';

// 운동 타이머의 순수 상태 기계. 1초마다 tick()을 부르면 다음 상태와
// 그 순간 일어난 일(소리, 세트 완료)을 돌려준다. 시계·소리·저장은 바깥에서 한다.

export interface WorkoutConfig {
  /** 운동 시간(초) */
  work: number;
  /** 세트 사이 휴식(초) */
  rest: number;
  /** 시작 전 준비 카운트(초) */
  ready: number;
  /** 동작당 세트 수 */
  sets: number;
}

export const DEFAULT_CONFIG: WorkoutConfig = { work: 30, rest: 15, ready: 3, sets: 3 };

export interface QueueItem {
  drillId: string;
  /** 이 동작의 몇 번째 세트인지 (1부터) */
  set: number;
  sets: number;
  side: Side;
  /** 루틴 안에서 몇 번째 동작인지 (1부터) */
  drillNo: number;
  drillCount: number;
}

export type Phase = 'ready' | 'work' | 'rest' | 'done';

export interface WorkoutState {
  queue: QueueItem[];
  /** 지금(또는 휴식 뒤에 할) 항목. done이면 queue.length */
  index: number;
  phase: Phase;
  /** 이 단계의 남은 시간(초) */
  left: number;
}

export type WorkoutEvent =
  /** 카운트다운 삐 */
  | { type: 'tick' }
  /** 운동 시작 */
  | { type: 'workStart' }
  /** 세트 하나를 끝냄 */
  | { type: 'setDone'; item: QueueItem }
  /** 전부 끝남 */
  | { type: 'finished' };

/** 종료 몇 초 전부터 삐 소리를 낼지 */
const COUNTDOWN_BEEPS = 3;

/**
 * 동작 목록을 세트 순서대로 펼친다.
 * L/R 동작은 세트마다 오른발 → 왼발 → 오른발 … 로 바뀐다.
 */
export function makeQueue(
  drills: ReadonlyArray<{ id: string; sidesLR: boolean }>,
  sets: number,
): QueueItem[] {
  const queue: QueueItem[] = [];
  drills.forEach((d, i) => {
    for (let s = 1; s <= sets; s++) {
      queue.push({
        drillId: d.id,
        set: s,
        sets,
        side: d.sidesLR && s % 2 === 0 ? 'L' : 'R',
        drillNo: i + 1,
        drillCount: drills.length,
      });
    }
  });
  return queue;
}

export function startWorkout(queue: QueueItem[], cfg: WorkoutConfig): WorkoutState {
  if (queue.length === 0) return { queue, index: 0, phase: 'done', left: 0 };
  if (cfg.ready > 0) return { queue, index: 0, phase: 'ready', left: cfg.ready };
  return { queue, index: 0, phase: 'work', left: cfg.work };
}

/** 화면에 보여 줄 항목. 끝난 뒤에는 마지막 항목 */
export function currentItem(state: WorkoutState): QueueItem | undefined {
  return state.queue[Math.min(state.index, state.queue.length - 1)];
}

/** 지금 단계의 전체 길이(초). 진행 바 계산용 */
export function phaseTotal(state: WorkoutState, cfg: WorkoutConfig): number {
  if (state.phase === 'work') return cfg.work;
  if (state.phase === 'rest') return cfg.rest;
  if (state.phase === 'ready') return cfg.ready;
  return 0;
}

/** 지금 단계가 얼마나 진행됐는지 0..1 */
export function phaseProgress(state: WorkoutState, cfg: WorkoutConfig): number {
  const total = phaseTotal(state, cfg);
  if (total <= 0) return 1;
  return Math.max(0, Math.min(1, 1 - state.left / total));
}

/** 1초 경과 */
export function tick(
  state: WorkoutState,
  cfg: WorkoutConfig,
): { state: WorkoutState; events: WorkoutEvent[] } {
  if (state.phase === 'done') return { state, events: [] };

  const left = state.left - 1;
  if (left > 0) {
    // 준비 중에는 매초, 운동·휴식은 끝나기 3초 전부터 삐
    const beep = state.phase === 'ready' || left <= COUNTDOWN_BEEPS;
    return { state: { ...state, left }, events: beep ? [{ type: 'tick' }] : [] };
  }

  if (state.phase === 'ready' || state.phase === 'rest') {
    return { state: { ...state, phase: 'work', left: cfg.work }, events: [{ type: 'workStart' }] };
  }

  // 운동 한 세트 끝
  const events: WorkoutEvent[] = [];
  const finished = state.queue[state.index];
  if (finished) events.push({ type: 'setDone', item: finished });
  const index = state.index + 1;
  if (index >= state.queue.length) {
    events.push({ type: 'finished' });
    return { state: { ...state, index, phase: 'done', left: 0 }, events };
  }
  if (cfg.rest > 0) {
    // 휴식 동안 화면은 이미 다음 항목(다음 동작·다음 발)을 보여 준다
    return { state: { ...state, index, phase: 'rest', left: cfg.rest }, events };
  }
  events.push({ type: 'workStart' });
  return { state: { ...state, index, phase: 'work', left: cfg.work }, events };
}

/** 처음부터 끝까지 걸리는 시간(초) */
export function totalSeconds(queueLength: number, cfg: WorkoutConfig): number {
  if (queueLength <= 0) return 0;
  return cfg.ready + cfg.work * queueLength + cfg.rest * (queueLength - 1);
}
