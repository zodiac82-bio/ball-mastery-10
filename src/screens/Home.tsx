import { DrillThumbnail } from '../components/DrillThumbnail';
import { InstallHint } from '../components/InstallHint';
import { DRILLS } from '../data/drills';
import { routeHref } from '../router';
import ui from '../styles/ui.module.css';
import type { WorkoutConfig } from '../timer/workout';
import styles from './Home.module.css';

export interface HomeProps {
  config: WorkoutConfig;
  /** 오늘 완료한 세트 수 (동작 id → 세트 수) */
  doneToday: Record<string, number>;
  /** 전체 루틴 시작. 없으면 버튼이 비활성화된다 */
  onStartRoutine?: () => void;
}

function pad2(n: number): string {
  return n < 10 ? '0' + n : String(n);
}

export function Home({ config, doneToday, onStartRoutine }: HomeProps) {
  return (
    <main className={ui.page}>
      <header className={styles.header}>
        <div className={styles.headText}>
          <h1 className={styles.title}>
            볼마스터리 <span className={styles.accent}>10</span>
          </h1>
          <p className={styles.sub}>동작을 골라 애니메이션을 보고, 타이머에 맞춰 따라 해요</p>
        </div>
        <div className={styles.actions}>
          <a className={ui.btn} href={routeHref({ name: 'records' })}>
            기록
          </a>
          <a className={ui.btn} href={routeHref({ name: 'settings' })}>
            설정
          </a>
          <button
            type="button"
            className={ui.btnPrimary}
            onClick={onStartRoutine}
            disabled={!onStartRoutine}
          >
            ▶ 전체 루틴 시작
          </button>
        </div>
      </header>

      <ul className={styles.grid}>
        {DRILLS.map((d) => {
          const done = doneToday[d.id] || 0;
          return (
            <li key={d.id}>
              <a
                className={ui.card + ' ' + styles.card}
                href={routeHref({ name: 'drill', id: d.id })}
              >
                <DrillThumbnail drill={d} className={styles.thumb} />
                {done > 0 && <span className={styles.done}>✓ {done}세트</span>}
                <span className={styles.no}>{pad2(d.order)}</span>
                <span className={styles.name}>
                  {d.nameKo}
                  {d.sidesLR && <span className={ui.tag}>L/R</span>}
                </span>
                <span className={styles.en}>{d.nameEn}</span>
                <span className={styles.meta}>
                  {config.work}초 × {config.sets}세트
                </span>
              </a>
            </li>
          );
        })}
      </ul>

      <InstallHint />

      <footer className={styles.legend}>
        위에서 내려다본 모습 · <b className={styles.right}>파란 발 = 오른발</b> ·{' '}
        <b className={styles.left}>주황 발 = 왼발</b>
      </footer>
    </main>
  );
}
