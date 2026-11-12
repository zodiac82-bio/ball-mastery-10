import type { FootState, Point } from '../data/types';
import type { Pose, Timeline } from './timeline';

export interface Sample extends Pose {
  /** 지금 진행 중인 프레임 번호 */
  frameIndex: number;
  /** 그 프레임 안에서의 진행도 0..1 */
  progress: number;
}

/** 2차 easeInOut */
export function ease(p: number): number {
  return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
}

export function lerp(a: number, b: number, p: number): number {
  return a + (b - a) * p;
}

/** 발 들림 arc가 생기는 최소 이동 거리(px) */
const ARC_MIN_DIST = 12;
/** arc 최대 높이(lift 단위) */
const ARC_HEIGHT = 0.7;
/** 이 거리 이상 움직이면 arc가 최대 높이가 된다(px) */
const ARC_FULL_DIST = 45;

/**
 * 발 보간. 위치·회전·lift는 easeInOut이고,
 * 12px 넘게 움직이는 발은 걸음처럼 가운데서 살짝 들린다.
 */
export function lerpFoot(a: FootState, b: FootState, p: number): FootState {
  const e = ease(p);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const arc =
    dist > ARC_MIN_DIST
      ? ARC_HEIGHT * Math.sin(Math.PI * p) * Math.min(1, dist / ARC_FULL_DIST)
      : 0;
  return {
    x: lerp(a.x, b.x, e),
    y: lerp(a.y, b.y, e),
    rot: lerp(a.rot, b.rot, e),
    lift: lerp(a.lift, b.lift, e) + arc,
  };
}

export function lerpPoint(a: Point, b: Point, p: number): Point {
  const e = ease(p);
  return { x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e) };
}

/** 시각 t(초, 1배속 기준)의 장면. t는 루프 길이로 감긴다(음수도 가능). */
export function sample(tl: Timeline, t: number): Sample {
  const T = tl.totalDuration;
  const last = tl.frames[tl.frames.length - 1];
  if (!last || T <= 0) {
    return { R: tl.start.R, L: tl.start.L, ball: tl.start.ball, frameIndex: 0, progress: 0 };
  }
  const time = ((t % T) + T) % T;
  let acc = 0;
  let prev: Pose = tl.start;
  for (let i = 0; i < tl.frames.length; i++) {
    const f = tl.frames[i];
    if (!f) continue;
    if (time < acc + f.duration) {
      const p = (time - acc) / f.duration;
      return {
        R: lerpFoot(prev.R, f.R, p),
        L: lerpFoot(prev.L, f.L, p),
        ball: lerpPoint(prev.ball, f.ball, p),
        frameIndex: i,
        progress: p,
      };
    }
    acc += f.duration;
    prev = f;
  }
  // 부동소수 오차로 끝까지 온 경우
  return { R: last.R, L: last.L, ball: last.ball, frameIndex: tl.frames.length - 1, progress: 1 };
}
