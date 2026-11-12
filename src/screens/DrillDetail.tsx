import { useCallback, useEffect, useRef, useState } from 'react';
import { unlockAudio } from '../audio/beeper';
import { DrillAnimation } from '../components/DrillAnimation';
import type { DrillAnimationHandle } from '../components/DrillAnimation';
import { Segmented } from '../components/Segmented';
import { TimerPanel } from '../components/TimerPanel';
import { DRILLS } from '../data/drills';
import { parseTip } from '../data/tips';
import type { Drill, Side } from '../data/types';
import type { TimelineFrame } from '../engine/timeline';
import { routeHref } from '../router';
import ui from '../styles/ui.module.css';
import { currentItem } from '../timer/workout';
import type { WorkoutConfig, WorkoutState } from '../timer/workout';
import styles from './DrillDetail.module.css';

const SPEED_OPTIONS = [
  { value: 0.5, label: '천천히' },
  { value: 1, label: '보통' },
  { value: 1.5, label: '빠르게' },
];

const SIDE_OPTIONS: Array<{ value: Side; label: string }> = [
  { value: 'R', label: '오른발' },
  { value: 'L', label: '왼발' },
];

export interface DrillDetailProps {
  drill: Drill;
  speed: number;
  onSpeedChange: (speed: number) => void;
  sound: boolean;
  onSoundChange: (sound: boolean) => void;
  /** 현재 설정(운동 시간·세트 수 표시용) */
  config: WorkoutConfig;
  /** 진행 중인 운동 타이머. 없으면 null */
  workout: { state: WorkoutState; config: WorkoutConfig; paused: boolean } | null;
  onStartWorkout: () => void;
  onStopWorkout: () => void;
  onTogglePauseWorkout: () => void;
}

/** 순서상 앞뒤 동작(끝에서 처음으로 이어진다) */
function neighbor(drill: Drill, dir: 1 | -1): Drill {
  const n = DRILLS.length;
  const i = DRILLS.indexOf(drill);
  return DRILLS[(i + dir + n) % n] || drill;
}

export function DrillDetail({
  drill,
  speed,
  onSpeedChange,
  sound,
  onSoundChange,
  config,
  workout,
  onStartWorkout,
  onStopWorkout,
  onTogglePauseWorkout,
}: DrillDetailProps) {
  const [side, setSide] = useState<Side>('R');
  const [paused, setPaused] = useState(false);
  const [frame, setFrame] = useState({
    index: 0,
    count: drill.frames.length,
    caption: drill.frames[0]?.caption || '',
  });
  const anim = useRef<DrillAnimationHandle>(null);

  const onFrameChange = useCallback((index: number, f: TimelineFrame, count: number) => {
    setFrame({ index, count, caption: f.caption });
  }, []);

  const step = (dir: 1 | -1) => {
    // 재생 중에 누르면 멈추고 한 단계 이동한다
    if (!paused) setPaused(true);
    anim.current?.stepFrame(dir);
  };

  // 타이머가 돌 때는 세트에 맞는 발(오른발 → 왼발 → 오른발)을 자동으로 보여 준다
  const item = workout ? currentItem(workout.state) : undefined;
  const shownSide: Side = item ? item.side : side;

  // 운동이 시작되면 멈춰 둔 애니메이션도 다시 재생한다
  const phase = workout ? workout.state.phase : null;
  useEffect(() => {
    if (phase === 'work') setPaused(false);
  }, [phase]);

  const prev = neighbor(drill, -1);
  const next = neighbor(drill, 1);

  return (
    <main className={ui.page}>
      <nav className={styles.top}>
        <a className={ui.btn} href={routeHref({ name: 'home' })}>
          ← 목록
        </a>
        <span className={styles.spacer} />
        <a
          className={ui.btn}
          href={routeHref({ name: 'drill', id: prev.id })}
          aria-label={'이전 동작: ' + prev.nameKo}
        >
          ◀ 이전
        </a>
        <a
          className={ui.btn}
          href={routeHref({ name: 'drill', id: next.id })}
          aria-label={'다음 동작: ' + next.nameKo}
        >
          다음 ▶
        </a>
      </nav>

      <div className={styles.layout}>
        <section className={ui.card + ' ' + styles.stageCard}>
          <div className={styles.stageBox}>
            <DrillAnimation
              ref={anim}
              drill={drill}
              mirror={shownSide === 'L'}
              speed={speed}
              paused={paused}
              sound={sound}
              onFrameChange={onFrameChange}
              className={styles.stage}
            />
          </div>
          <p className={styles.caption} aria-live="off">
            {frame.caption}
          </p>
          <div className={styles.dots} aria-hidden="true">
            {Array.from({ length: frame.count }, (_, i) => (
              <i key={i} className={i === frame.index ? styles.dotOn : styles.dot} />
            ))}
          </div>

          <div className={styles.controls}>
            <Segmented
              label="재생 속도"
              options={SPEED_OPTIONS}
              value={speed}
              onChange={onSpeedChange}
            />
            <Segmented
              label="보여 줄 발"
              options={SIDE_OPTIONS}
              value={shownSide}
              onChange={setSide}
              disabled={!!workout}
            />
            <div className={ui.seg} role="group" aria-label="재생 조작">
              <button
                type="button"
                className={ui.segBtn}
                onClick={() => step(-1)}
                aria-label="이전 단계"
              >
                ◀
              </button>
              <button
                type="button"
                className={paused ? ui.segOn : ui.segBtn}
                onClick={() => setPaused((p) => !p)}
              >
                {paused ? '▶ 재생' : '⏸ 멈춤'}
              </button>
              <button
                type="button"
                className={ui.segBtn}
                onClick={() => step(1)}
                aria-label="다음 단계"
              >
                ▶
              </button>
            </div>
            <div className={ui.seg}>
              <button
                type="button"
                className={sound ? ui.segOn : ui.segBtn}
                aria-pressed={sound}
                onClick={() => {
                  unlockAudio();
                  onSoundChange(!sound);
                }}
              >
                {sound ? '🔊 소리 켬' : '🔇 소리 끔'}
              </button>
            </div>
          </div>
        </section>

        {workout && (
          <TimerPanel
            className={styles.timer}
            state={workout.state}
            config={workout.config}
            paused={workout.paused}
            drillName={drill.nameKo}
            showSide={drill.sidesLR}
            onTogglePause={onTogglePauseWorkout}
            onStop={onStopWorkout}
          />
        )}

        <section className={styles.info}>
          <h1 className={styles.name}>
            {drill.order}. {drill.nameKo}
          </h1>
          <div className={styles.en}>{drill.nameEn}</div>
          <div className={styles.meta}>
            {config.work}초 × {config.sets}세트
            {drill.sidesLR && ' · 오른발/왼발 번갈아'}
          </div>
          {!workout && (
            <button
              type="button"
              className={ui.btnPrimary + ' ' + styles.start}
              onClick={onStartWorkout}
            >
              ▶ {config.work}초 × {config.sets}세트 시작
            </button>
          )}
          <div className={styles.legend}>
            <span className={styles.legendR}>오른발</span>
            <span className={styles.legendL}>왼발</span>
            <span className={styles.legendBall}>공</span>
          </div>
          <ul className={styles.tips}>
            {drill.tips.map((tip, i) => (
              <li key={i}>
                {parseTip(tip).map((p, k) => (p.bold ? <b key={k}>{p.text}</b> : p.text))}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
