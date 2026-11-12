import { useCallback, useEffect, useRef, useState } from 'react';
import { startWorkout, tick } from '../timer/workout';
import type { QueueItem, WorkoutConfig, WorkoutEvent, WorkoutState } from '../timer/workout';

export interface Workout {
  /** 진행 중이 아니면 null */
  state: WorkoutState | null;
  /** 시작할 때 고정된 설정 */
  config: WorkoutConfig | null;
  paused: boolean;
  start: (queue: QueueItem[], config: WorkoutConfig) => void;
  stop: () => void;
  togglePause: () => void;
}

/** 시계를 확인하는 간격(ms) */
const POLL_MS = 200;
/**
 * 한 번에 인정하는 최대 경과 시간(ms).
 * 화면이 잠기거나 다른 앱으로 갔다 오면 타이머는 그동안 멈춰 있던 것으로 친다
 * (아이가 안 보고 있던 시간에 세트가 기록되지 않게).
 */
const MAX_STEP_MS = 1500;

function nowMs(): number {
  return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
}

/**
 * 운동 타이머. setInterval 횟수가 아니라 실제 경과 시간으로 초를 세므로
 * 브라우저가 타이머를 늦게 불러도 밀리지 않는다.
 */
export function useWorkout(onEvent: (event: WorkoutEvent) => void): Workout {
  const [state, setState] = useState<WorkoutState | null>(null);
  const [paused, setPaused] = useState(false);
  const stateRef = useRef<WorkoutState | null>(null);
  const configRef = useRef<WorkoutConfig | null>(null);
  const onEventRef = useRef(onEvent);
  useEffect(() => {
    onEventRef.current = onEvent;
  });

  const running = state !== null && state.phase !== 'done' && !paused;

  useEffect(() => {
    if (!running) return;
    let last = nowMs();
    let carry = 0;
    const id = setInterval(() => {
      const now = nowMs();
      carry += Math.min(MAX_STEP_MS, Math.max(0, now - last));
      last = now;
      while (carry >= 1000) {
        carry -= 1000;
        const cur = stateRef.current;
        const cfg = configRef.current;
        if (!cur || !cfg || cur.phase === 'done') return;
        const result = tick(cur, cfg);
        stateRef.current = result.state;
        setState(result.state);
        result.events.forEach((e) => onEventRef.current(e));
      }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [running]);

  const start = useCallback((queue: QueueItem[], config: WorkoutConfig) => {
    const first = startWorkout(queue, config);
    configRef.current = config;
    stateRef.current = first;
    setPaused(false);
    setState(first);
  }, []);

  const stop = useCallback(() => {
    stateRef.current = null;
    setPaused(false);
    setState(null);
  }, []);

  const togglePause = useCallback(() => setPaused((p) => !p), []);

  return { state, config: state ? configRef.current : null, paused, start, stop, togglePause };
}
