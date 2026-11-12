import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DRILLS } from '../data/drills';
import { sample } from './sample';
import { buildTimeline } from './timeline';

// reference/prototype.html 안의 원본 build()/sample() 코드를 그대로 꺼내 실행해서
// 이식한 엔진이 같은 숫자를 내는지 대조한다.
// 프로토타입은 "검증된 동작"의 기준이므로, 이 테스트가 깨지면 엔진이 달라진 것이다.

type ProtoFoot = [number, number, number, number];
interface ProtoFrame {
  d: number;
  R: ProtoFoot;
  L: ProtoFoot;
  B: [number, number];
  hit: string | null;
  cap: string;
}
interface ProtoBuilt {
  fr: ProtoFrame[];
  start: { R: ProtoFoot; L: ProtoFoot; B: [number, number] };
  T: number;
}
interface ProtoSample {
  R: ProtoFoot;
  L: ProtoFoot;
  B: [number, number];
  idx: number;
  p: number;
}
interface Proto {
  DRILLS: Array<{ n: string; en: string; lr: boolean; tips: string[] }>;
  build: (d: unknown, mirror: boolean) => ProtoBuilt;
  sample: (b: ProtoBuilt, t: number) => ProtoSample;
}

function between(src: string, from: string, to: string): string {
  const a = src.indexOf(from);
  const b = src.indexOf(to, a);
  if (a < 0 || b < 0) throw new Error('prototype.html에서 구간을 찾지 못함: ' + from);
  return src.slice(a, b);
}

function loadPrototype(): Proto {
  const html = readFileSync(new URL('../../reference/prototype.html', import.meta.url), 'utf8');
  const dataAndBuild = between(html, 'var NR=', '// ---------- SVG scene');
  const sampling = between(html, 'function ease(p)', 'function draw(');
  const factory = new Function(
    dataAndBuild + '\n' + sampling + '\nreturn {DRILLS:DRILLS,build:build,sample:sample};',
  ) as () => Proto;
  return factory();
}

const proto = loadPrototype();

describe('프로토타입과 수치 대조', () => {
  it('동작 이름·L/R·팁이 프로토타입과 같다', () => {
    expect(proto.DRILLS).toHaveLength(DRILLS.length);
    DRILLS.forEach((d, i) => {
      const p = proto.DRILLS[i];
      expect(p?.n).toBe(d.nameKo);
      expect(p?.en).toBe(d.nameEn);
      expect(p?.lr).toBe(d.sidesLR);
      expect(p?.tips).toEqual(d.tips);
    });
  });

  for (const mirror of [false, true]) {
    it('타임라인이 같다 (' + (mirror ? '왼발 반전' : '오른발') + ')', () => {
      DRILLS.forEach((d, i) => {
        const mine = buildTimeline(d, mirror);
        const theirs = proto.build(proto.DRILLS[i], mirror);
        expect(mine.totalDuration).toBeCloseTo(theirs.T, 10);
        expect(mine.frames).toHaveLength(theirs.fr.length);
        mine.frames.forEach((f, k) => {
          const pf = theirs.fr[k];
          if (!pf) throw new Error('frame missing');
          expect(f.duration).toBe(pf.d);
          expect([f.R.x, f.R.y, f.R.rot, f.R.lift]).toEqual(pf.R.map((n) => n + 0));
          expect([f.L.x, f.L.y, f.L.rot, f.L.lift]).toEqual(pf.L.map((n) => n + 0));
          expect([f.ball.x, f.ball.y]).toEqual(pf.B);
          expect(f.hit).toBe(pf.hit);
          expect(f.caption).toBe(pf.cap);
        });
        expect([mine.start.ball.x, mine.start.ball.y]).toEqual(theirs.start.B);
      });
    });

    it('1/120초 간격 샘플이 모두 같다 (' + (mirror ? '왼발 반전' : '오른발') + ')', () => {
      let checked = 0;
      DRILLS.forEach((d, i) => {
        const mine = buildTimeline(d, mirror);
        const theirs = proto.build(proto.DRILLS[i], mirror);
        for (let t = 0; t < theirs.T * 2; t += 1 / 120) {
          const a = sample(mine, t);
          const b = proto.sample(theirs, t);
          expect(a.frameIndex).toBe(b.idx);
          expect(a.progress).toBeCloseTo(b.p, 9);
          const av = [a.R.x, a.R.y, a.R.rot, a.R.lift, a.L.x, a.L.y, a.L.rot, a.L.lift];
          const bv = [...b.R, ...b.L];
          av.forEach((v, k) => expect(v).toBeCloseTo(bv[k] ?? NaN, 9));
          expect(a.ball.x).toBeCloseTo(b.B[0], 9);
          expect(a.ball.y).toBeCloseTo(b.B[1], 9);
          checked++;
        }
      });
      expect(checked).toBeGreaterThan(3000);
    });
  }
});
