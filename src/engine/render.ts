import type { FootState, Point, Side } from '../data/types';

// 프로토타입 draw()/setFoot()의 계산 부분만 옮긴 순수 함수들.
// SVG 요소는 컴포넌트가 한 번 만들고, 여기서 나온 속성 값만 매 프레임 갱신한다.

export const COLORS = {
  right: '#3b7bf0',
  left: '#f28c28',
  grassA: '#2f8a45',
  grassB: '#2a7d3e',
  hitRing: '#c8f25a',
} as const;

export const BALL_RADIUS = 16;

/** 신발 외곽선 (길이 54 × 폭 24, 중심 원점, 위쪽이 발끝) */
export const SHOE_PATH =
  'M0,-27 C8,-27 12,-17 12,-7 L11,17 C11,24 6,27 0,27 C-6,27 -11,24 -11,17 L-12,-7 C-12,-17 -8,-27 0,-27Z';

export interface FootAttrs {
  transform: string;
  opacity: string;
  shadowTransform: string;
  shadowOpacity: string;
}

/**
 * 발과 그림자의 SVG 속성.
 *  - lift가 클수록 1 + 0.16×lift배 확대, 위로 6×lift px 이동
 *  - 그림자는 오른쪽 아래로 벌어지며 옅어진다
 *  - 들린 발은 최대 30%까지 투명해져 아래의 공이 비쳐 보인다
 */
export function footAttrs(foot: FootState): FootAttrs {
  const lift = Math.max(0, foot.lift);
  const scale = 1 + 0.16 * lift;
  const rot = foot.rot.toFixed(1);
  return {
    transform:
      'translate(' +
      foot.x.toFixed(1) +
      ',' +
      (foot.y - lift * 6).toFixed(1) +
      ') rotate(' +
      rot +
      ') scale(' +
      scale.toFixed(3) +
      ')',
    opacity: (1 - 0.3 * Math.min(1, lift * 1.6)).toFixed(2),
    shadowTransform:
      'translate(' +
      (foot.x + 3 + lift * 7).toFixed(1) +
      ',' +
      (foot.y + 3 + lift * 3).toFixed(1) +
      ') rotate(' +
      rot +
      ')',
    shadowOpacity: (0.9 - lift * 0.5).toFixed(2),
  };
}

/** 위에 그려야 하는 발(더 높이 들린 쪽, 같으면 오른발) */
export function topFoot(R: FootState, L: FootState): Side {
  return R.lift >= L.lift ? 'R' : 'L';
}

/** 공이 prev → cur로 움직였을 때 무늬가 더 돌아야 하는 각도(도) */
export function ballSpinDelta(prev: Point, cur: Point): number {
  return (cur.x - prev.x - (cur.y - prev.y)) * 3.2;
}

export function ballShadowCenter(ball: Point): Point {
  return { x: ball.x + 4, y: ball.y + 5 };
}

/** 터치 링이 사라지는 데 걸리는 시간(초) */
export const HIT_RING_SECONDS = 0.25;

/** 터치 링. alpha는 1(방금 닿음) → 0(사라짐) */
export function hitRing(alpha: number): { r: number; opacity: number } {
  const a = Math.max(0, Math.min(1, alpha));
  return { r: BALL_RADIUS + (1 - a) * 12, opacity: a };
}

/** 공 무늬의 오각형 꼭짓점 문자열 */
export function pentagonPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    pts.push((cx + r * Math.cos(a)).toFixed(1) + ',' + (cy + r * Math.sin(a)).toFixed(1));
  }
  return pts.join(' ');
}

/** 공 무늬 오각형들의 중심 */
export const BALL_PATCHES: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [-15, -9],
  [15, -9],
  [-10, 14],
  [10, 14],
  [0, -18],
];
