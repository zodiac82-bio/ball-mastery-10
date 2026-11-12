import { describe, expect, it } from 'vitest';
import { DRILLS } from '../data/drills';
import {
  DEFAULT_CONFIG,
  currentItem,
  makeQueue,
  phaseProgress,
  startWorkout,
  tick,
  totalSeconds,
} from './workout';
import type { Phase, WorkoutConfig, WorkoutEvent, WorkoutState } from './workout';

const cfg = DEFAULT_CONFIG;

/** 끝날 때까지 돌리고 초 단위 기록을 남긴다 */
function run(start: WorkoutState, c: WorkoutConfig) {
  let state = start;
  let seconds = 0;
  const events: Array<WorkoutEvent & { at: number }> = [];
  const phases: Phase[] = [];
  while (state.phase !== 'done') {
    if (seconds > 100000) throw new Error('타이머가 끝나지 않음');
    phases.push(state.phase);
    const r = tick(state, c);
    state = r.state;
    seconds++;
    r.events.forEach((e) => events.push({ ...e, at: seconds }));
  }
  return { state, seconds, events, phases };
}

describe('makeQueue', () => {
  it('동작마다 세트 수만큼 펼친다', () => {
    const q = makeQueue([{ id: 'a', sidesLR: false }], 3);
    expect(q.map((i) => i.set)).toEqual([1, 2, 3]);
    expect(q.map((i) => i.side)).toEqual(['R', 'R', 'R']);
  });

  it('L/R 동작은 오른발 → 왼발 → 오른발', () => {
    const q = makeQueue([{ id: 'a', sidesLR: true }], 3);
    expect(q.map((i) => i.side)).toEqual(['R', 'L', 'R']);
    expect(makeQueue([{ id: 'a', sidesLR: true }], 4).map((i) => i.side)).toEqual([
      'R',
      'L',
      'R',
      'L',
    ]);
  });

  it('전체 루틴은 10동작 × 3세트 = 30항목', () => {
    const q = makeQueue(DRILLS, 3);
    expect(q).toHaveLength(30);
    expect(q[0]).toMatchObject({ drillId: 'tap-step', set: 1, drillNo: 1, drillCount: 10 });
    expect(q[29]).toMatchObject({ drillId: 'roll-back-v', set: 3, drillNo: 10 });
    // 3번(드래그 토 스텝)의 2세트는 왼발
    expect(q[7]).toMatchObject({ drillId: 'drag-toe-step', set: 2, side: 'L' });
  });
});

describe('타이머 진행', () => {
  it('준비 3초 → 운동 30초 → 휴식 15초 순서로 간다', () => {
    let s = startWorkout(makeQueue([{ id: 'a', sidesLR: false }], 3), cfg);
    expect(s).toMatchObject({ phase: 'ready', left: 3, index: 0 });
    s = tick(s, cfg).state;
    s = tick(s, cfg).state;
    expect(s).toMatchObject({ phase: 'ready', left: 1 });
    const toWork = tick(s, cfg);
    expect(toWork.state).toMatchObject({ phase: 'work', left: 30 });
    expect(toWork.events).toEqual([{ type: 'workStart' }]);
    s = toWork.state;
    for (let i = 0; i < 29; i++) s = tick(s, cfg).state;
    expect(s).toMatchObject({ phase: 'work', left: 1, index: 0 });
    const toRest = tick(s, cfg);
    expect(toRest.state).toMatchObject({ phase: 'rest', left: 15, index: 1 });
    expect(toRest.events).toEqual([{ type: 'setDone', item: s.queue[0] }]);
  });

  it('한 동작 3세트는 123초 걸리고 세트 완료가 3번 나온다', () => {
    const r = run(startWorkout(makeQueue([{ id: 'a', sidesLR: false }], 3), cfg), cfg);
    expect(r.seconds).toBe(123);
    expect(r.seconds).toBe(totalSeconds(3, cfg));
    const done = r.events.filter((e) => e.type === 'setDone');
    expect(done.map((e) => e.at)).toEqual([33, 78, 123]);
    expect(r.events.filter((e) => e.type === 'workStart').map((e) => e.at)).toEqual([3, 48, 93]);
    expect(r.events[r.events.length - 1]).toMatchObject({ type: 'finished', at: 123 });
    expect(r.state.index).toBe(3);
  });

  it('삐 소리: 준비 2번, 운동 끝 3초 전 3번, 휴식 끝 3초 전 3번', () => {
    const r = run(startWorkout(makeQueue([{ id: 'a', sidesLR: false }], 3), cfg), cfg);
    const ticks = r.events.filter((e) => e.type === 'tick').map((e) => e.at);
    expect(ticks).toEqual([
      1,
      2, // 준비 (3초째는 운동 시작음)
      30,
      31,
      32, // 1세트 끝나기 전
      45,
      46,
      47, // 휴식 끝나기 전
      75,
      76,
      77,
      90,
      91,
      92,
      120,
      121,
      122,
    ]);
  });

  it('전체 루틴(10동작 × 3세트)이 끝까지 진행된다', () => {
    const q = makeQueue(DRILLS, cfg.sets);
    const r = run(startWorkout(q, cfg), cfg);
    expect(r.seconds).toBe(3 + 30 * 30 + 15 * 29);
    const done = r.events.filter((e) => e.type === 'setDone');
    expect(done).toHaveLength(30);
    // 완료 순서가 큐 순서와 같다
    expect(done.map((e) => (e.type === 'setDone' ? e.item : null))).toEqual(q);
    expect(r.events.filter((e) => e.type === 'finished')).toHaveLength(1);
    expect(r.phases.filter((p) => p === 'work')).toHaveLength(900);
    expect(r.phases.filter((p) => p === 'rest')).toHaveLength(15 * 29);
  });

  it('휴식 중에는 다음 항목을 가리킨다 (다음 동작·다음 발 미리 보기)', () => {
    let s = startWorkout(makeQueue([{ id: 'lr', sidesLR: true }], 3), cfg);
    expect(currentItem(s)?.side).toBe('R');
    for (let i = 0; i < 33; i++) s = tick(s, cfg).state;
    expect(s.phase).toBe('rest');
    expect(currentItem(s)).toMatchObject({ set: 2, side: 'L' });
  });

  it('끝난 뒤에는 더 진행하지 않고, currentItem은 마지막 항목', () => {
    const q = makeQueue([{ id: 'a', sidesLR: false }], 2);
    const r = run(startWorkout(q, cfg), cfg);
    expect(tick(r.state, cfg)).toEqual({ state: r.state, events: [] });
    expect(currentItem(r.state)).toEqual(q[1]);
  });

  it('준비·휴식이 0초여도 동작한다', () => {
    const c = { work: 5, rest: 0, ready: 0, sets: 2 };
    const start = startWorkout(makeQueue([{ id: 'a', sidesLR: false }], 2), c);
    expect(start).toMatchObject({ phase: 'work', left: 5 });
    const r = run(start, c);
    expect(r.seconds).toBe(10);
    expect(r.events.filter((e) => e.type === 'setDone')).toHaveLength(2);
    expect(r.phases).not.toContain('rest');
  });

  it('빈 큐는 바로 끝', () => {
    expect(startWorkout([], cfg).phase).toBe('done');
    expect(totalSeconds(0, cfg)).toBe(0);
  });

  it('진행 바는 0에서 1로 간다', () => {
    let s = startWorkout(makeQueue([{ id: 'a', sidesLR: false }], 1), cfg);
    expect(phaseProgress(s, cfg)).toBe(0);
    for (let i = 0; i < 3 + 15; i++) s = tick(s, cfg).state;
    expect(s).toMatchObject({ phase: 'work', left: 15 });
    expect(phaseProgress(s, cfg)).toBeCloseTo(0.5, 10);
  });
});
