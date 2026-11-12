import { memo, useId } from 'react';
import type { RefObject } from 'react';
import type { Side } from '../data/types';
import { BALL_PATCHES, BALL_RADIUS, COLORS, SHOE_PATH, pentagonPoints } from '../engine/render';
import type { SceneRefs } from './sceneRefs';

const FULL_VIEWBOX = '0 0 300 330';
/** 썸네일용: 발과 공 주변만 잘라 보여 준다 */
const COMPACT_VIEWBOX = '40 140 220 160';

interface FootProps {
  side: Side;
  footRef: RefObject<SVGGElement | null>;
}

function Foot({ side, footRef }: FootProps) {
  return (
    <g ref={footRef} data-foot={side}>
      <path
        d={SHOE_PATH}
        fill={side === 'R' ? COLORS.right : COLORS.left}
        stroke="rgba(0,0,0,.45)"
        strokeWidth={1.5}
      />
      <path
        d="M-7,-4 L7,-4 M-7,2 L7,2 M-6,8 L6,8"
        stroke="rgba(255,255,255,.55)"
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      <text y={-12} textAnchor="middle" fontSize={11} fontWeight={800} fill="#fff">
        {side}
      </text>
    </g>
  );
}

export interface DrillSceneProps {
  refs: SceneRefs;
  /** true면 썸네일(라벨 없이 발 주변만) */
  compact?: boolean;
  className?: string;
  label?: string;
}

/**
 * 잔디·공·두 발의 정적 SVG. 움직임은 applyScene()이 refs를 통해 준다.
 * 요소 구성과 그리는 순서는 프로토타입 scene()과 같다.
 */
export const DrillScene = memo(function DrillScene({
  refs,
  compact = false,
  className,
  label,
}: DrillSceneProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const grassId = 'grass' + uid;
  const clipId = 'ballclip' + uid;
  return (
    <svg
      viewBox={compact ? COMPACT_VIEWBOX : FULL_VIEWBOX}
      className={className}
      role="img"
      aria-label={label}
    >
      <defs>
        <pattern id={grassId} width={300} height={60} patternUnits="userSpaceOnUse">
          <rect width={300} height={30} fill={COLORS.grassA} />
          <rect y={30} width={300} height={30} fill={COLORS.grassB} />
        </pattern>
        <clipPath id={clipId}>
          <circle r={BALL_RADIUS} />
        </clipPath>
      </defs>
      <rect width={300} height={330} fill={'url(#' + grassId + ')'} />
      {!compact && (
        <>
          <text
            x={150}
            y={24}
            textAnchor="middle"
            fill="rgba(255,255,255,.55)"
            fontSize={12}
            fontWeight={700}
          >
            ▲ 앞쪽
          </text>
          <text x={150} y={320} textAnchor="middle" fill="rgba(255,255,255,.35)" fontSize={10}>
            위에서 내려다본 모습
          </text>
        </>
      )}
      <ellipse ref={refs.ballShadow} rx={BALL_RADIUS} ry={12} fill="rgba(0,0,0,.25)" />
      <g>
        <path ref={refs.shadowR} d={SHOE_PATH} fill="rgba(0,0,0,.28)" />
        <path ref={refs.shadowL} d={SHOE_PATH} fill="rgba(0,0,0,.28)" />
      </g>
      <g ref={refs.ball} data-ball="">
        <circle r={BALL_RADIUS} fill="#fafafa" stroke="#222" strokeWidth={1.2} />
        <g ref={refs.ballPattern} clipPath={'url(#' + clipId + ')'}>
          {BALL_PATCHES.map(([cx, cy]) => (
            <polygon key={cx + ',' + cy} points={pentagonPoints(cx, cy, 5.5)} fill="#1d1d1d" />
          ))}
        </g>
      </g>
      <circle
        ref={refs.hit}
        r={BALL_RADIUS}
        fill="none"
        stroke={COLORS.hitRing}
        strokeWidth={3}
        opacity={0}
      />
      <g ref={refs.feet}>
        <Foot side="R" footRef={refs.R} />
        <Foot side="L" footRef={refs.L} />
      </g>
    </svg>
  );
});
