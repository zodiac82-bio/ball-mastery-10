import { describe, expect, it } from 'vitest';
import { DRILLS } from '../data/drills';
import type { FootState } from '../data/types';
import { ease, lerpFoot, sample } from './sample';
import type { Sample } from './sample';
import { buildTimeline, frameStartTime } from './timeline';

const foot = (x: number, y: number, rot = 0, lift = 0): FootState => ({ x, y, rot, lift });

/** 두 샘플 사이에서 가장 크게 변한 값 */
function maxDiff(a: Sample, b: Sample): number {
  const pairs: Array<[number, number]> = [
    [a.R.x, b.R.x],
    [a.R.y, b.R.y],
    [a.R.rot, b.R.rot],
    [a.R.lift, b.R.lift],
    [a.L.x, b.L.x],
    [a.L.y, b.L.y],
    [a.L.rot, b.L.rot],
    [a.L.lift, b.L.lift],
    [a.ball.x, b.ball.x],
    [a.ball.y, b.ball.y],
  ];
  return Math.max(...pairs.map(([p, q]) => Math.abs(p - q)));
}

describe('ease', () => {
  it('0 → 0, 0.5 → 0.5, 1 → 1 이고 단조 증가', () => {
    expect(ease(0)).toBe(0);
    expect(ease(0.5)).toBe(0.5);
    expect(ease(1)).toBe(1);
    let prev = 0;
    for (let p = 0.01; p <= 1; p += 0.01) {
      expect(ease(p)).toBeGreaterThanOrEqual(prev);
      prev = ease(p);
    }
  });
});

describe('lerpFoot 발 들림 arc', () => {
  it('12px 이하로 움직이면 arc가 없다', () => {
    const mid = lerpFoot(foot(100, 100), foot(112, 100), 0.5);
    expect(mid.lift).toBe(0);
  });

  it('45px 이상 움직이면 가운데서 lift가 0.7 더해진다', () => {
    const mid = lerpFoot(foot(100, 100), foot(160, 100), 0.5);
    expect(mid.lift).toBeCloseTo(0.7, 10);
    expect(mid.x).toBeCloseTo(130, 10);
  });

  it('짧은 이동은 거리에 비례해 낮아진다 (0.7 × dist/45)', () => {
    const mid = lerpFoot(foot(100, 100), foot(100, 122.5), 0.5);
    expect(mid.lift).toBeCloseTo(0.35, 10);
  });

  it('시작과 끝에서는 arc가 0이라 키프레임 값과 정확히 같다', () => {
    const a = foot(100, 100, 0, 0.5);
    const b = foot(200, 150, 20, 0);
    expect(lerpFoot(a, b, 0)).toEqual(a);
    const end = lerpFoot(a, b, 1);
    expect(end.x).toBe(200);
    expect(end.y).toBe(150);
    expect(end.rot).toBe(20);
    expect(end.lift).toBeCloseTo(0, 10);
  });
});

describe('sample', () => {
  it('프레임 인덱스와 진행도가 정확하다', () => {
    const d = DRILLS.find((x) => x.id === 'drag-toe-step');
    if (!d) throw new Error('missing drill');
    const tl = buildTimeline(d, false); // duration: .35 .35 .25 .28
    expect(sample(tl, 0).frameIndex).toBe(0);
    expect(sample(tl, 0).progress).toBe(0);
    expect(sample(tl, 0.175).frameIndex).toBe(0);
    expect(sample(tl, 0.175).progress).toBeCloseTo(0.5, 10);
    expect(sample(tl, 0.36).frameIndex).toBe(1);
    expect(sample(tl, 0.8).frameIndex).toBe(2);
    expect(sample(tl, 1.0).frameIndex).toBe(3);
    expect(sample(tl, tl.totalDuration - 0.001).frameIndex).toBe(3);
  });

  it('모든 동작: 각 프레임 한가운데 시각의 인덱스가 그 프레임이다', () => {
    for (const d of DRILLS) {
      const tl = buildTimeline(d, false);
      tl.frames.forEach((f, i) => {
        const s = sample(tl, frameStartTime(tl, i) + f.duration / 2);
        expect(s.frameIndex).toBe(i);
        expect(s.progress).toBeCloseTo(0.5, 6);
      });
    }
  });

  it('프레임이 끝나는 순간 키프레임 값에 도달한다', () => {
    for (const d of DRILLS) {
      const tl = buildTimeline(d, false);
      tl.frames.forEach((f, i) => {
        const s = sample(tl, frameStartTime(tl, i) + f.duration - 1e-7);
        expect(s.R.x).toBeCloseTo(f.R.x, 3);
        expect(s.R.y).toBeCloseTo(f.R.y, 3);
        expect(s.L.x).toBeCloseTo(f.L.x, 3);
        expect(s.L.y).toBeCloseTo(f.L.y, 3);
        expect(s.ball.x).toBeCloseTo(f.ball.x, 3);
        expect(s.ball.y).toBeCloseTo(f.ball.y, 3);
      });
    }
  });

  it('루프 경계에서 위치가 튀지 않는다 (모든 동작, 반전 포함)', () => {
    const eps = 1e-5;
    for (const d of DRILLS) {
      for (const mirror of [false, true]) {
        const tl = buildTimeline(d, mirror);
        const before = sample(tl, tl.totalDuration - eps);
        const after = sample(tl, tl.totalDuration + eps);
        expect(maxDiff(before, after)).toBeLessThan(0.01);
        expect(before.frameIndex).toBe(tl.frames.length - 1);
        expect(after.frameIndex).toBe(0);
      }
    }
  });

  it('프레임 경계에서도 튀지 않는다 (모든 동작)', () => {
    const eps = 1e-5;
    for (const d of DRILLS) {
      const tl = buildTimeline(d, false);
      for (let i = 1; i < tl.frames.length; i++) {
        const t = frameStartTime(tl, i);
        expect(maxDiff(sample(tl, t - eps), sample(tl, t + eps))).toBeLessThan(0.01);
      }
    }
  });

  it('1/60초 간격으로 훑어도 한 프레임에 크게 뛰는 곳이 없다', () => {
    for (const d of DRILLS) {
      const tl = buildTimeline(d, false);
      let prev = sample(tl, 0);
      for (let t = 1 / 60; t < tl.totalDuration * 2; t += 1 / 60) {
        const cur = sample(tl, t);
        // 가장 빠른 구간도 1/60초에 15px(또는 15°) 미만으로 움직인다
        expect(maxDiff(prev, cur)).toBeLessThan(15);
        prev = cur;
      }
    }
  });

  it('시간은 루프 길이로 감긴다 (음수 포함)', () => {
    const d = DRILLS[0];
    if (!d) throw new Error('missing drill');
    const tl = buildTimeline(d, false);
    const T = tl.totalDuration;
    expect(maxDiff(sample(tl, 0.1), sample(tl, 0.1 + T * 3))).toBeLessThan(1e-6);
    expect(maxDiff(sample(tl, T - 0.1), sample(tl, -0.1))).toBeLessThan(1e-6);
  });

  it('반전 샘플은 원본 샘플을 좌우로 뒤집은 것과 같다', () => {
    for (const d of DRILLS) {
      const a = buildTimeline(d, false);
      const b = buildTimeline(d, true);
      for (let t = 0; t < a.totalDuration; t += 0.07) {
        const sa = sample(a, t);
        const sb = sample(b, t);
        expect(sb.frameIndex).toBe(sa.frameIndex);
        expect(sb.L.x).toBeCloseTo(300 - sa.R.x, 8);
        expect(sb.L.y).toBeCloseTo(sa.R.y, 8);
        expect(sb.L.rot).toBeCloseTo(-sa.R.rot, 8);
        expect(sb.L.lift).toBeCloseTo(sa.R.lift, 8);
        expect(sb.R.x).toBeCloseTo(300 - sa.L.x, 8);
        expect(sb.ball.x).toBeCloseTo(300 - sa.ball.x, 8);
        expect(sb.ball.y).toBeCloseTo(sa.ball.y, 8);
      }
    }
  });
});
