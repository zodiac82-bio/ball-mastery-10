import { useLayoutEffect, useMemo } from 'react';
import type { Drill } from '../data/types';
import { sample } from '../engine/sample';
import { buildTimeline } from '../engine/timeline';
import { DrillScene } from './DrillScene';
import { applyScene, useSceneRefs } from './sceneRefs';

/** 프레임의 "끝 자세"를 보여 줄 때 쓰는 진행도 */
export const FRAME_END = 0.999;

export interface DrillThumbnailProps {
  drill: Drill;
  className?: string;
}

/** 첫 프레임 자세의 정지 그림 (홈 카드용) */
export function DrillThumbnail({ drill, className }: DrillThumbnailProps) {
  const refs = useSceneRefs();
  const timeline = useMemo(() => buildTimeline(drill, false), [drill]);

  useLayoutEffect(() => {
    const first = timeline.frames[0];
    if (!first) return;
    applyScene(refs, sample(timeline, first.duration * FRAME_END), 0, 0);
  }, [refs, timeline]);

  return (
    <DrillScene refs={refs} compact className={className} label={drill.nameKo + ' 미리보기'} />
  );
}
