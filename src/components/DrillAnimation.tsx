import { useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import type { Ref } from 'react';
import { beepHit } from '../audio/beeper';
import type { Drill, Point } from '../data/types';
import { HIT_RING_SECONDS, ballSpinDelta } from '../engine/render';
import { sample } from '../engine/sample';
import { buildTimeline, frameStartTime } from '../engine/timeline';
import type { TimelineFrame } from '../engine/timeline';
import { DrillScene } from './DrillScene';
import { applyScene, useSceneRefs } from './sceneRefs';
import { FRAME_END } from './DrillThumbnail';

export interface DrillAnimationHandle {
  /** 한 단계 앞(+1)·뒤(-1) 프레임의 끝 자세로 이동. 멈춘 상태에서 쓴다. */
  stepFrame: (dir: 1 | -1) => void;
  /** 처음부터 다시 */
  restart: () => void;
}

export interface DrillAnimationProps {
  drill: Drill;
  /** true면 좌우 반전(왼발 버전) */
  mirror?: boolean;
  /** 재생 배속. 0.5 / 1 / 1.5 */
  speed?: number;
  paused?: boolean;
  /** 공 터치 박자음 */
  sound?: boolean;
  /** 진행 중인 프레임이 바뀔 때마다 불린다(캡션·단계 점 표시용) */
  onFrameChange?: (index: number, frame: TimelineFrame, frameCount: number) => void;
  className?: string;
  ref?: Ref<DrillAnimationHandle>;
}

/** 한 번에 건너뛸 수 있는 최대 시간(초). 탭이 잠들었다 깨어날 때 튀는 것을 막는다. */
const MAX_DT = 0.05;

interface PlayState {
  clock: number;
  lastIndex: number;
  lastBall: Point | null;
  spin: number;
  hitAlpha: number;
  /** 단계 이동으로 이미 터치 효과를 보여 준 프레임(다시 재생할 때 중복 방지) */
  hitShownFor: number;
}

/**
 * 동작 애니메이션. SVG 요소는 한 번만 만들고 requestAnimationFrame에서 속성만 갱신한다.
 * speed/paused/sound가 바뀌어도 재생 위치는 유지되고, drill이나 mirror가 바뀌면 처음부터 시작한다.
 */
export function DrillAnimation({
  drill,
  mirror = false,
  speed = 1,
  paused = false,
  sound = false,
  onFrameChange,
  className,
  ref,
}: DrillAnimationProps) {
  const refs = useSceneRefs();
  const timeline = useMemo(() => buildTimeline(drill, mirror), [drill, mirror]);

  // 루프를 다시 만들지 않도록 최신 props는 ref로 읽는다
  const live = useRef({ speed, paused, sound, onFrameChange });
  useEffect(() => {
    live.current = { speed, paused, sound, onFrameChange };
  });

  const state = useRef<PlayState>({
    clock: 0,
    lastIndex: -1,
    lastBall: null,
    spin: 0,
    hitAlpha: 0,
    hitShownFor: -1,
  });

  useEffect(() => {
    const st = state.current;
    st.clock = 0;
    st.lastIndex = -1;
    st.lastBall = null;
    st.hitAlpha = 0;
    st.hitShownFor = -1;

    let raf = 0;
    let lastTs = 0;

    const tick = (ts: number) => {
      const dt = lastTs ? Math.min(MAX_DT, (ts - lastTs) / 1000) : 0;
      lastTs = ts;
      const now = live.current;
      if (!now.paused) st.clock += dt * now.speed;

      const s = sample(timeline, st.clock);
      if (st.lastBall) st.spin += ballSpinDelta(st.lastBall, s.ball);
      st.lastBall = s.ball;

      if (s.frameIndex !== st.lastIndex) {
        // 직전 프레임의 hit는 그 프레임이 끝나는 지금 일어난다
        const prev = st.lastIndex >= 0 ? timeline.frames[st.lastIndex] : undefined;
        if (prev && prev.hit && st.hitShownFor !== st.lastIndex) {
          st.hitAlpha = 1;
          if (now.sound) beepHit(prev.hit);
        }
        st.hitShownFor = -1;
        st.lastIndex = s.frameIndex;
        const frame = timeline.frames[s.frameIndex];
        if (frame && now.onFrameChange) {
          now.onFrameChange(s.frameIndex, frame, timeline.frames.length);
        }
      }

      st.hitAlpha = Math.max(0, st.hitAlpha - dt / HIT_RING_SECONDS);
      applyScene(refs, s, st.spin, st.hitAlpha);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [refs, timeline]);

  useImperativeHandle(
    ref,
    () => ({
      stepFrame(dir) {
        const st = state.current;
        const n = timeline.frames.length;
        if (n === 0) return;
        const from = st.lastIndex < 0 ? 0 : st.lastIndex;
        const target = (from + dir + n) % n;
        const frame = timeline.frames[target];
        if (!frame) return;
        st.clock = frameStartTime(timeline, target) + frame.duration * FRAME_END;
        st.lastIndex = target;
        st.hitShownFor = target;
        if (frame.hit) {
          st.hitAlpha = 1;
          if (live.current.sound) beepHit(frame.hit);
        }
        const cb = live.current.onFrameChange;
        if (cb) cb(target, frame, n);
      },
      restart() {
        const st = state.current;
        st.clock = 0;
        st.lastIndex = -1;
        st.lastBall = null;
        st.hitShownFor = -1;
      },
    }),
    [timeline],
  );

  return (
    <DrillScene
      refs={refs}
      className={className}
      label={drill.nameKo + ' 동작 애니메이션' + (mirror ? ' (왼발)' : '')}
    />
  );
}
