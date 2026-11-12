import { describe, expect, it } from 'vitest';
import { ballSpinDelta, footAttrs, hitRing, pentagonPoints, topFoot } from './render';

describe('footAttrs', () => {
  it('바닥에 있는 발은 확대·이동 없이 불투명', () => {
    const a = footAttrs({ x: 180, y: 248, rot: 0, lift: 0 });
    expect(a.transform).toBe('translate(180.0,248.0) rotate(0.0) scale(1.000)');
    expect(a.opacity).toBe('1.00');
    expect(a.shadowTransform).toBe('translate(183.0,251.0) rotate(0.0)');
    expect(a.shadowOpacity).toBe('0.90');
  });

  it('lift 0.5: 1.08배, 위로 3px, 그림자가 오른쪽 아래로 벌어짐, 24% 투명', () => {
    const a = footAttrs({ x: 150, y: 193, rot: 20, lift: 0.5 });
    expect(a.transform).toBe('translate(150.0,190.0) rotate(20.0) scale(1.080)');
    expect(a.opacity).toBe('0.76');
    expect(a.shadowTransform).toBe('translate(156.5,197.5) rotate(20.0)');
    expect(a.shadowOpacity).toBe('0.65');
  });

  it('투명도는 최대 30%까지만', () => {
    expect(footAttrs({ x: 0, y: 0, rot: 0, lift: 1.2 }).opacity).toBe('0.70');
  });

  it('음수 lift는 0으로 취급', () => {
    expect(footAttrs({ x: 10, y: 10, rot: 0, lift: -0.2 })).toEqual(
      footAttrs({ x: 10, y: 10, rot: 0, lift: 0 }),
    );
  });
});

describe('그 밖의 렌더 계산', () => {
  it('더 높이 들린 발이 위에 그려진다 (같으면 오른발)', () => {
    const f = (lift: number) => ({ x: 0, y: 0, rot: 0, lift });
    expect(topFoot(f(0.5), f(0))).toBe('R');
    expect(topFoot(f(0), f(0.5))).toBe('L');
    expect(topFoot(f(0), f(0))).toBe('R');
  });

  it('공 무늬는 이동 거리에 비례해 돈다', () => {
    expect(ballSpinDelta({ x: 0, y: 0 }, { x: 10, y: 0 })).toBeCloseTo(32, 10);
    expect(ballSpinDelta({ x: 0, y: 0 }, { x: 0, y: 10 })).toBeCloseTo(-32, 10);
    expect(ballSpinDelta({ x: 5, y: 5 }, { x: 5, y: 5 })).toBe(0);
  });

  it('터치 링은 반지름 16에서 28로 퍼지며 사라진다', () => {
    expect(hitRing(1)).toEqual({ r: 16, opacity: 1 });
    expect(hitRing(0)).toEqual({ r: 28, opacity: 0 });
    expect(hitRing(2).opacity).toBe(1);
    expect(hitRing(-1).opacity).toBe(0);
  });

  it('오각형은 꼭짓점 5개', () => {
    expect(pentagonPoints(0, 0, 5.5).split(' ')).toHaveLength(5);
    expect(pentagonPoints(0, 0, 5.5).split(' ')[0]).toBe('0.0,-5.5');
  });
});
