import { describe, expect, it } from 'vitest';
import { COORDS, DRILLS, findDrill } from './drills';
import type { FootState, Point } from './types';

function isFoot(v: FootState): boolean {
  return [v.x, v.y, v.rot, v.lift].every((n) => typeof n === 'number' && isFinite(n));
}
function isPoint(v: Point): boolean {
  return [v.x, v.y].every((n) => typeof n === 'number' && isFinite(n));
}

describe('drills.json', () => {
  it('10개 동작이 순서대로 들어 있고 id가 겹치지 않는다', () => {
    expect(DRILLS).toHaveLength(10);
    expect(DRILLS.map((d) => d.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(new Set(DRILLS.map((d) => d.id)).size).toBe(10);
  });

  it('L/R 동작은 3번, 4번이다', () => {
    expect(DRILLS.filter((d) => d.sidesLR).map((d) => d.order)).toEqual([3, 4]);
  });

  it('모든 값이 타입 정의와 맞는다', () => {
    for (const d of DRILLS) {
      expect(d.nameKo.length).toBeGreaterThan(0);
      expect(d.nameEn.length).toBeGreaterThan(0);
      expect(d.work).toBeGreaterThan(0);
      expect(d.sets).toBeGreaterThan(0);
      expect(d.tips).toHaveLength(3);
      expect(isPoint(d.ballStart)).toBe(true);
      expect(d.frames.length).toBeGreaterThan(0);
      for (const f of d.frames) {
        expect(f.duration).toBeGreaterThan(0);
        expect(f.R === null || isFoot(f.R)).toBe(true);
        expect(f.L === null || isFoot(f.L)).toBe(true);
        expect(f.ball === null || isPoint(f.ball)).toBe(true);
        expect([null, 'R', 'L']).toContain(f.hit);
        expect(f.caption.length).toBeGreaterThan(0);
      }
    }
  });

  it('좌표계 기본 발 위치가 문서와 같다', () => {
    expect(COORDS.neutralFeet.R).toEqual({ x: 180, y: 248, rot: 0, lift: 0 });
    expect(COORDS.neutralFeet.L).toEqual({ x: 120, y: 248, rot: 0, lift: 0 });
    expect(COORDS.viewBox).toBe('0 0 300 330');
  });

  it('findDrill은 id로 찾고, 없으면 undefined', () => {
    expect(findDrill('tap-step')?.nameKo).toBe('탭 스텝');
    expect(findDrill('nope')).toBeUndefined();
  });
});
