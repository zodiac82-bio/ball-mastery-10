import { createRef, useRef } from 'react';
import type { RefObject } from 'react';
import type { FootState, Side } from '../data/types';
import { ballShadowCenter, footAttrs, hitRing, topFoot } from '../engine/render';
import type { Pose } from '../engine/timeline';

/** 매 프레임 속성만 갱신할 SVG 요소들. 요소 자체는 한 번만 만든다. */
export interface SceneRefs {
  feet: RefObject<SVGGElement | null>;
  R: RefObject<SVGGElement | null>;
  L: RefObject<SVGGElement | null>;
  shadowR: RefObject<SVGPathElement | null>;
  shadowL: RefObject<SVGPathElement | null>;
  ball: RefObject<SVGGElement | null>;
  ballPattern: RefObject<SVGGElement | null>;
  ballShadow: RefObject<SVGEllipseElement | null>;
  hit: RefObject<SVGCircleElement | null>;
  /** 지금 위에 그려진 발 */
  top: { current: Side | null };
}

export function useSceneRefs(): SceneRefs {
  const holder = useRef<SceneRefs | null>(null);
  if (!holder.current) {
    holder.current = {
      feet: createRef(),
      R: createRef(),
      L: createRef(),
      shadowR: createRef(),
      shadowL: createRef(),
      ball: createRef(),
      ballPattern: createRef(),
      ballShadow: createRef(),
      hit: createRef(),
      top: { current: null },
    };
  }
  return holder.current;
}

function applyFoot(g: SVGGElement | null, shadow: SVGPathElement | null, foot: FootState): void {
  if (!g || !shadow) return;
  const a = footAttrs(foot);
  g.setAttribute('transform', a.transform);
  g.setAttribute('opacity', a.opacity);
  shadow.setAttribute('transform', a.shadowTransform);
  shadow.setAttribute('opacity', a.shadowOpacity);
}

/**
 * 장면을 pose대로 그린다. DOM을 만들지 않고 속성만 바꾼다.
 * @param spin 공 무늬 회전각(도)
 * @param hitAlpha 터치 링 세기 1 → 0
 */
export function applyScene(refs: SceneRefs, pose: Pose, spin: number, hitAlpha: number): void {
  applyFoot(refs.R.current, refs.shadowR.current, pose.R);
  applyFoot(refs.L.current, refs.shadowL.current, pose.L);

  // 더 높이 들린 발을 위에 그린다(바뀔 때만 순서 이동)
  const top = topFoot(pose.R, pose.L);
  const feet = refs.feet.current;
  const topEl = top === 'R' ? refs.R.current : refs.L.current;
  if (feet && topEl && refs.top.current !== top) {
    feet.appendChild(topEl);
    refs.top.current = top;
  }

  const bx = pose.ball.x.toFixed(1);
  const by = pose.ball.y.toFixed(1);
  const ball = refs.ball.current;
  if (ball) ball.setAttribute('transform', 'translate(' + bx + ',' + by + ')');
  const pattern = refs.ballPattern.current;
  if (pattern) pattern.setAttribute('transform', 'rotate(' + spin.toFixed(1) + ')');
  const shadow = refs.ballShadow.current;
  if (shadow) {
    const c = ballShadowCenter(pose.ball);
    shadow.setAttribute('cx', c.x.toFixed(1));
    shadow.setAttribute('cy', c.y.toFixed(1));
  }
  const ring = refs.hit.current;
  if (ring) {
    const h = hitRing(hitAlpha);
    ring.setAttribute('cx', bx);
    ring.setAttribute('cy', by);
    ring.setAttribute('r', h.r.toFixed(1));
    ring.setAttribute('opacity', h.opacity.toFixed(2));
  }
}
