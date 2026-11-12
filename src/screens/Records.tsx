import { useState } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DRILLS } from '../data/drills';
import { routeHref } from '../router';
import { clearRecords, daySets, todayRecord } from '../storage/records';
import type { Records as RecordData } from '../storage/records';
import { currentStreak, totals, weekOf } from '../storage/stats';
import ui from '../styles/ui.module.css';
import styles from './Records.module.css';

export interface RecordsProps {
  records: RecordData;
  /** 테스트에서 날짜를 고정할 때만 넘긴다 */
  now?: Date;
}

export function Records({ records, now = new Date() }: RecordsProps) {
  const [confirming, setConfirming] = useState(false);
  const week = weekOf(records, now);
  const streak = currentStreak(records, now);
  const today = todayRecord(records, now);
  const todaySets = daySets(today);
  const all = totals(records);
  const weekDays = week.filter((d) => d.sets > 0).length;

  return (
    <main className={ui.page}>
      <nav className={styles.top}>
        <a className={ui.btn} href={routeHref({ name: 'home' })}>
          ← 목록
        </a>
        <h1 className={styles.title}>기록</h1>
      </nav>

      <div className={styles.stats}>
        <div className={ui.card + ' ' + styles.stat}>
          <div className={styles.statNum} data-stat="streak">
            {streak}
            <span className={styles.unit}>일</span>
          </div>
          <div className={styles.statLabel}>🔥 연속 운동</div>
        </div>
        <div className={ui.card + ' ' + styles.stat}>
          <div className={styles.statNum} data-stat="today">
            {todaySets}
            <span className={styles.unit}>세트</span>
          </div>
          <div className={styles.statLabel}>오늘</div>
        </div>
        <div className={ui.card + ' ' + styles.stat}>
          <div className={styles.statNum} data-stat="week">
            {weekDays}
            <span className={styles.unit}>/7일</span>
          </div>
          <div className={styles.statLabel}>이번 주</div>
        </div>
      </div>

      <h2 className={styles.h2}>이번 주</h2>
      <ol className={styles.week}>
        {week.map((d) => (
          <li
            key={d.key}
            data-day={d.key}
            className={
              styles.day +
              (d.sets > 0 ? ' ' + styles.dayDone : '') +
              (d.isToday ? ' ' + styles.dayToday : '') +
              (d.isFuture ? ' ' + styles.dayFuture : '')
            }
          >
            <span className={styles.dayLabel}>{d.label}</span>
            <span className={styles.dayNum}>{d.dayOfMonth}</span>
            <span className={styles.daySets}>{d.sets > 0 ? '✓ ' + d.sets : '·'}</span>
          </li>
        ))}
      </ol>
      <p className={styles.hint}>✓ 옆의 숫자는 그날 끝낸 세트 수예요.</p>

      <h2 className={styles.h2}>오늘 한 동작</h2>
      <ul className={styles.list}>
        {DRILLS.map((d) => {
          const n = today[d.id] || 0;
          return (
            <li key={d.id} className={n > 0 ? styles.rowDone : styles.row}>
              <span className={styles.rowName}>
                {d.order}. {d.nameKo}
              </span>
              <span className={styles.rowSets}>{n > 0 ? n + '세트' : '–'}</span>
            </li>
          );
        })}
      </ul>

      <p className={styles.hint}>
        지금까지 {all.days}일 동안 {all.sets}세트를 했어요. 기록은 이 기기에만 저장돼요.
      </p>

      <button
        type="button"
        className={ui.btn}
        onClick={() => setConfirming(true)}
        disabled={all.sets === 0}
      >
        기록 초기화
      </button>

      {confirming && (
        <ConfirmDialog
          title="기록을 모두 지울까요?"
          message={
            '지금까지 쌓인 ' +
            all.days +
            '일, ' +
            all.sets +
            '세트 기록이 사라지고 되돌릴 수 없어요.'
          }
          confirmLabel="모두 지우기"
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            clearRecords();
            setConfirming(false);
          }}
        />
      )}
    </main>
  );
}
