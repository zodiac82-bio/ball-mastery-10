import { describe, expect, it } from 'vitest';
import { COORDS, DRILLS } from '../data/drills';
import type { Drill } from '../data/types';
import {
  DEFAULT_STAGE,
  buildTimeline,
  frameStartTime,
  mirrorTimeline,
  swapSideWords,
} from './timeline';

function drill(id: string): Drill {
  const d = DRILLS.find((x) => x.id === id);
  if (!d) throw new Error('no drill ' + id);
  return d;
}

describe('buildTimeline', () => {
  it('기본 무대 값이 drills.json 좌표계와 같다', () => {
    expect(DEFAULT_STAGE.neutral).toEqual(COORDS.neutralFeet);
    expect(COORDS.viewBox).toBe('0 0 ' + DEFAULT_STAGE.width + ' 330');
  });

  it('null 값을 직전 값으로 채운다', () => {
    const tl = buildTimeline(drill('drag-toe-step'), false);
    // 2번째 프레임은 L이 null → 1번째 프레임의 L 유지
    expect(tl.frames[1]?.L).toEqual({ x: 115, y: 248, rot: 0, lift: 0 });
    // 3번째 프레임은 ball이 null → 2번째 프레임의 공 위치 유지
    expect(tl.frames[2]?.ball).toEqual({ x: 165, y: 227 });
  });

  it('공이 한 번도 안 움직이는 동작은 ballStart를 쓴다', () => {
    const d = drill('tap-step');
    const tl = buildTimeline(d, false);
    expect(tl.start.ball).toEqual(d.ballStart);
    for (const f of tl.frames) expect(f.ball).toEqual(d.ballStart);
  });

  it('루프 시작 상태 = 마지막 프레임 상태 (모든 동작)', () => {
    for (const d of DRILLS) {
      for (const mirror of [false, true]) {
        const tl = buildTimeline(d, mirror);
        const last = tl.frames[tl.frames.length - 1];
        expect(last).toBeDefined();
        expect(tl.start).toEqual({ R: last?.R, L: last?.L, ball: last?.ball });
      }
    }
  });

  it('totalDuration은 duration의 합', () => {
    for (const d of DRILLS) {
      const sum = d.frames.reduce((a, f) => a + f.duration, 0);
      expect(buildTimeline(d, false).totalDuration).toBeCloseTo(sum, 10);
      expect(buildTimeline(d, true).totalDuration).toBeCloseTo(sum, 10);
    }
  });

  it('원본 데이터를 건드리지 않는다', () => {
    const d = drill('press-roll');
    const before = JSON.stringify(d);
    const tl = buildTimeline(d, true);
    const first = tl.frames[0];
    if (first) first.R.x = -999;
    expect(JSON.stringify(d)).toBe(before);
  });
});

describe('좌우 반전', () => {
  it('x → 300 - x, rot → -rot, R/L·hit·캡션 교환', () => {
    const d = drill('inside-step');
    const a = buildTimeline(d, false);
    const b = buildTimeline(d, true);
    const fa = a.frames[0];
    const fb = b.frames[0];
    expect(fa).toBeDefined();
    expect(fb).toBeDefined();
    if (!fa || !fb) return;
    // 원본: 오른발 (190,230,rot -10) 이 공을 침
    expect(fa.hit).toBe('R');
    expect(fa.caption).toBe('오른발 안쪽으로 톡');
    // 반전: 그 발이 왼발이 되어 x=110, rot=+10
    expect(fb.hit).toBe('L');
    expect(fb.caption).toBe('왼발 안쪽으로 톡');
    expect(fb.L).toEqual({ x: 300 - fa.R.x, y: fa.R.y, rot: 10, lift: fa.R.lift });
    expect(fb.R).toEqual({ x: 300 - fa.L.x, y: fa.L.y, rot: 0, lift: fa.L.lift });
    expect(fb.ball).toEqual({ x: 300 - fa.ball.x, y: fa.ball.y });
    expect(fb.duration).toBe(fa.duration);
  });

  it('두 번 반전하면 원래 데이터와 같다 (모든 동작)', () => {
    for (const d of DRILLS) {
      const original = buildTimeline(d, false);
      expect(mirrorTimeline(buildTimeline(d, true))).toEqual(original);
      expect(mirrorTimeline(mirrorTimeline(original))).toEqual(original);
    }
  });

  it('반전해도 hit 개수와 프레임 수는 같다', () => {
    for (const d of DRILLS) {
      const a = buildTimeline(d, false);
      const b = buildTimeline(d, true);
      expect(b.frames).toHaveLength(a.frames.length);
      expect(b.frames.filter((f) => f.hit).length).toBe(a.frames.filter((f) => f.hit).length);
    }
  });

  it('swapSideWords는 오른↔왼만 바꾼다', () => {
    expect(swapSideWords('오른발 디딤, 왼발 준비')).toBe('왼발 디딤, 오른발 준비');
    expect(swapSideWords('공을 넘어 왼쪽에 착지')).toBe('공을 넘어 오른쪽에 착지');
    expect(swapSideWords('제자리로')).toBe('제자리로');
  });
});

describe('frameStartTime', () => {
  it('앞 프레임들의 duration 합', () => {
    const tl = buildTimeline(drill('drag-toe-step'), false);
    expect(frameStartTime(tl, 0)).toBe(0);
    expect(frameStartTime(tl, 1)).toBeCloseTo(0.35, 10);
    expect(frameStartTime(tl, 3)).toBeCloseTo(0.95, 10);
    expect(frameStartTime(tl, 99)).toBeCloseTo(tl.totalDuration, 10);
  });
});
