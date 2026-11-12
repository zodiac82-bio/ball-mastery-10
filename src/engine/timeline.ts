import type { Drill, FootState, Point, Side } from '../data/types';

/** 장면의 한 순간: 두 발과 공 */
export interface Pose {
  R: FootState;
  L: FootState;
  ball: Point;
}

/** null이 모두 채워진 프레임 */
export interface TimelineFrame extends Pose {
  duration: number;
  hit: Side | null;
  caption: string;
}

export interface Timeline {
  frames: TimelineFrame[];
  /** 루프 시작 상태 = 마지막 프레임까지 적용한 상태 */
  start: Pose;
  totalDuration: number;
}

/** 좌우 반전 축과 기본 발 위치. 기본값은 drills.json의 좌표계와 같다. */
export interface Stage {
  width: number;
  neutral: { R: FootState; L: FootState };
}

export const DEFAULT_STAGE: Stage = {
  width: 300,
  neutral: {
    R: { x: 180, y: 248, rot: 0, lift: 0 },
    L: { x: 120, y: 248, rot: 0, lift: 0 },
  },
};

function copyFoot(f: FootState): FootState {
  return { x: f.x, y: f.y, rot: f.rot, lift: f.lift };
}

function copyPoint(p: Point): Point {
  return { x: p.x, y: p.y };
}

// -0이 생기지 않게 한다(반전을 두 번 했을 때 원본과 정확히 같아야 함)
function negate(n: number): number {
  return n === 0 ? 0 : -n;
}

function mirrorFoot(f: FootState, width: number): FootState {
  return { x: width - f.x, y: f.y, rot: negate(f.rot), lift: f.lift };
}

function mirrorPoint(p: Point, width: number): Point {
  return { x: width - p.x, y: p.y };
}

function mirrorPose(p: Pose, width: number): Pose {
  return { R: mirrorFoot(p.L, width), L: mirrorFoot(p.R, width), ball: mirrorPoint(p.ball, width) };
}

/** 캡션의 "오른" ↔ "왼" 교환 */
export function swapSideWords(text: string): string {
  return text.replace(/오른|왼/g, (m) => (m === '왼' ? '오른' : '왼'));
}

/** 타임라인을 좌우 반전한다. 두 번 적용하면 원래대로 돌아온다. */
export function mirrorTimeline(tl: Timeline, width: number = DEFAULT_STAGE.width): Timeline {
  return {
    frames: tl.frames.map((f) => {
      const pose = mirrorPose(f, width);
      const hit: Side | null = f.hit === 'R' ? 'L' : f.hit === 'L' ? 'R' : null;
      return {
        duration: f.duration,
        R: pose.R,
        L: pose.L,
        ball: pose.ball,
        hit,
        caption: swapSideWords(f.caption),
      };
    }),
    start: mirrorPose(tl.start, width),
    totalDuration: tl.totalDuration,
  };
}

/**
 * 동작 데이터를 재생 가능한 타임라인으로 만든다.
 *  - null 값은 직전 값으로 채운다
 *  - 루프 시작 상태는 마지막 프레임까지 적용한 상태(끊김 없는 반복)
 *  - mirror=true면 좌우 반전(x → width - x, rot → -rot, R/L·hit·캡션 교환)
 */
export function buildTimeline(
  drill: Drill,
  mirror: boolean,
  stage: Stage = DEFAULT_STAGE,
): Timeline {
  // 1) 모든 프레임을 한 번 적용해서 루프 시작 상태를 구한다
  let cur: Pose = {
    R: copyFoot(stage.neutral.R),
    L: copyFoot(stage.neutral.L),
    ball: copyPoint(drill.ballStart),
  };
  for (const f of drill.frames) {
    cur = {
      R: f.R ? copyFoot(f.R) : cur.R,
      L: f.L ? copyFoot(f.L) : cur.L,
      ball: f.ball ? copyPoint(f.ball) : cur.ball,
    };
  }
  const start = cur;

  // 2) 시작 상태에서 출발해 null을 채운다
  let totalDuration = 0;
  const frames: TimelineFrame[] = drill.frames.map((f) => {
    cur = {
      R: f.R ? copyFoot(f.R) : cur.R,
      L: f.L ? copyFoot(f.L) : cur.L,
      ball: f.ball ? copyPoint(f.ball) : cur.ball,
    };
    totalDuration += f.duration;
    return {
      duration: f.duration,
      R: cur.R,
      L: cur.L,
      ball: cur.ball,
      hit: f.hit,
      caption: f.caption,
    };
  });

  const timeline: Timeline = { frames, start, totalDuration };
  return mirror ? mirrorTimeline(timeline, stage.width) : timeline;
}

/** index번 프레임이 시작되는 시각(초). 한 단계씩 넘기기에 쓴다. */
export function frameStartTime(tl: Timeline, index: number): number {
  let t = 0;
  for (let i = 0; i < index && i < tl.frames.length; i++) {
    const f = tl.frames[i];
    if (f) t += f.duration;
  }
  return t;
}
