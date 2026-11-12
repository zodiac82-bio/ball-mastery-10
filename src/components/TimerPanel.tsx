import ui from '../styles/ui.module.css';
import { currentItem, phaseProgress } from '../timer/workout';
import type { Phase, WorkoutConfig, WorkoutState } from '../timer/workout';
import styles from './TimerPanel.module.css';

const PHASE_LABEL: Record<Phase, string> = {
  ready: '준비',
  work: '운동!',
  rest: '휴식 · 다음 준비',
  done: '완료!',
};

export interface TimerPanelProps {
  state: WorkoutState;
  config: WorkoutConfig;
  paused: boolean;
  /** 지금 항목의 동작 이름 */
  drillName: string;
  /** L/R 동작이면 어느 발인지 보여 준다 */
  showSide: boolean;
  onTogglePause: () => void;
  onStop: () => void;
  className?: string;
}

/** 운동 타이머 표시: 단계 이름, 큰 카운트다운, 진행 바, 세트 */
export function TimerPanel({
  state,
  config,
  paused,
  drillName,
  showSide,
  onTogglePause,
  onStop,
  className,
}: TimerPanelProps) {
  const item = currentItem(state);
  const done = state.phase === 'done';
  const isRoutine = item ? item.drillCount > 1 : false;
  const side = item && showSide && !done ? (item.side === 'R' ? ' · 오른발' : ' · 왼발') : '';

  return (
    <section
      className={ui.card + ' ' + styles.panel + (className ? ' ' + className : '')}
      data-phase={state.phase}
      aria-label="운동 타이머"
    >
      <div className={styles.phase} data-timer-phase="">
        {paused && !done ? '일시정지' : PHASE_LABEL[state.phase] + side}
      </div>
      <div
        className={state.phase === 'work' || done ? styles.bigWork : styles.big}
        data-timer-left=""
        role="timer"
      >
        {done ? '👏' : state.left}
      </div>
      <div className={styles.bar}>
        <i style={{ width: (done ? 100 : phaseProgress(state, config) * 100) + '%' }} />
      </div>
      <div className={styles.set} data-timer-set="">
        {done
          ? '수고했어요'
          : item
            ? (isRoutine ? item.drillNo + '/' + item.drillCount + ' ' + drillName + ' · ' : '') +
              item.set +
              '/' +
              item.sets +
              '세트'
            : ''}
      </div>
      <div className={styles.buttons}>
        {!done && (
          <button type="button" className={ui.btn} onClick={onTogglePause}>
            {paused ? '▶ 계속' : '⏸ 일시정지'}
          </button>
        )}
        <button type="button" className={ui.btn} onClick={onStop}>
          {done ? '닫기' : '그만하기'}
        </button>
      </div>
    </section>
  );
}
