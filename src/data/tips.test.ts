import { describe, expect, it } from 'vitest';
import { DRILLS } from './drills';
import { parseTip } from './tips';

describe('parseTip', () => {
  it('<b> 구간만 강조로 나눈다', () => {
    expect(parseTip('발바닥 <b>앞쪽(볼)</b>으로 톡톡')).toEqual([
      { text: '발바닥 ', bold: false },
      { text: '앞쪽(볼)', bold: true },
      { text: '으로 톡톡', bold: false },
    ]);
  });

  it('강조가 여러 개여도 된다', () => {
    expect(parseTip('<b>A</b> 그리고 <b>B</b>').map((p) => p.bold)).toEqual([true, false, true]);
  });

  it('강조가 없으면 통째로 한 조각', () => {
    expect(parseTip('무릎은 살짝 굽히고')).toEqual([{ text: '무릎은 살짝 굽히고', bold: false }]);
  });

  it('다른 태그는 글자 그대로 남는다', () => {
    const parts = parseTip('<img src=x onerror=alert(1)> <b>굵게</b>');
    expect(parts[0]).toEqual({ text: '<img src=x onerror=alert(1)> ', bold: false });
    expect(parts[1]).toEqual({ text: '굵게', bold: true });
  });

  it('실제 데이터의 팁은 조각을 이어 붙이면 태그만 빠진 원문이다', () => {
    for (const d of DRILLS) {
      for (const tip of d.tips) {
        const joined = parseTip(tip)
          .map((p) => p.text)
          .join('');
        expect(joined).toBe(tip.replace(/<\/?b>/g, ''));
        expect(joined).not.toMatch(/[<>]/);
      }
    }
  });
});
