import { unlockAudio } from '../audio/beeper';
import { Segmented } from '../components/Segmented';
import { DRILLS } from '../data/drills';
import { routeHref } from '../router';
import {
  DEFAULT_SETTINGS,
  LIMITS,
  resetSettings,
  stepSetting,
  updateSettings,
} from '../storage/settings';
import type { NumericSetting, Settings as SettingsData } from '../storage/settings';
import ui from '../styles/ui.module.css';
import { totalSeconds } from '../timer/workout';
import styles from './Settings.module.css';

const SPEED_OPTIONS = [
  { value: 0.5, label: '천천히' },
  { value: 1, label: '보통' },
  { value: 1.5, label: '빠르게' },
];

const SOUND_OPTIONS = [
  { value: 'off', label: '🔇 끔' },
  { value: 'on', label: '🔊 켬' },
];

const ROWS: Array<{ key: NumericSetting; label: string; unit: string; help: string }> = [
  { key: 'work', label: '운동 시간', unit: '초', help: '한 세트 동안 따라 하는 시간' },
  { key: 'rest', label: '휴식 시간', unit: '초', help: '세트 사이에 쉬는 시간' },
  { key: 'ready', label: '준비 시간', unit: '초', help: '시작 전 카운트다운' },
  { key: 'sets', label: '세트 수', unit: '세트', help: '동작 하나를 몇 번 반복할지' },
];

function isDefault(s: SettingsData): boolean {
  return (Object.keys(DEFAULT_SETTINGS) as Array<keyof SettingsData>).every(
    (k) => s[k] === DEFAULT_SETTINGS[k],
  );
}

function minutes(seconds: number): string {
  const m = Math.round(seconds / 60);
  return m < 1 ? seconds + '초' : '약 ' + m + '분';
}

export interface SettingsProps {
  settings: SettingsData;
  /** 설정이 바뀐 뒤 불린다(지금 화면의 속도·소리에도 바로 반영하려고) */
  onChanged: (next: Partial<SettingsData>) => void;
}

export function Settings({ settings, onChanged }: SettingsProps) {
  const change = (patch: Partial<SettingsData>) => {
    updateSettings(patch);
    onChanged(patch);
  };

  return (
    <main className={ui.page}>
      <nav className={styles.top}>
        <a className={ui.btn} href={routeHref({ name: 'home' })}>
          ← 목록
        </a>
        <h1 className={styles.title}>설정</h1>
      </nav>

      <h2 className={styles.h2}>타이머</h2>
      <ul className={ui.card + ' ' + styles.group}>
        {ROWS.map((row) => {
          const value = settings[row.key];
          const lim = LIMITS[row.key];
          return (
            <li key={row.key} className={styles.row} data-setting={row.key}>
              <div className={styles.rowText}>
                <div className={styles.rowLabel}>{row.label}</div>
                <div className={styles.rowHelp}>{row.help}</div>
              </div>
              <div className={styles.stepper}>
                <button
                  type="button"
                  className={ui.btn + ' ' + styles.stepBtn}
                  aria-label={row.label + ' 줄이기'}
                  disabled={value <= lim.min}
                  onClick={() => change({ [row.key]: stepSetting(settings, row.key, -1) })}
                >
                  −
                </button>
                <output className={styles.value} aria-live="polite">
                  {value}
                  <span className={styles.unit}>{row.unit}</span>
                </output>
                <button
                  type="button"
                  className={ui.btn + ' ' + styles.stepBtn}
                  aria-label={row.label + ' 늘리기'}
                  disabled={value >= lim.max}
                  onClick={() => change({ [row.key]: stepSetting(settings, row.key, 1) })}
                >
                  +
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <p className={styles.hint} data-summary="">
        동작 하나 {minutes(totalSeconds(settings.sets, settings))} · 전체 루틴(10동작){' '}
        {minutes(totalSeconds(DRILLS.length * settings.sets, settings))}
      </p>

      <h2 className={styles.h2}>애니메이션</h2>
      <ul className={ui.card + ' ' + styles.group}>
        <li className={styles.row}>
          <div className={styles.rowText}>
            <div className={styles.rowLabel}>기본 속도</div>
            <div className={styles.rowHelp}>동작을 처음 열 때의 재생 속도</div>
          </div>
          <Segmented
            label="기본 속도"
            options={SPEED_OPTIONS}
            value={settings.speed}
            onChange={(speed) => change({ speed })}
          />
        </li>
        <li className={styles.row}>
          <div className={styles.rowText}>
            <div className={styles.rowLabel}>공 터치 소리</div>
            <div className={styles.rowHelp}>
              발이 공에 닿을 때 나는 박자음. 타이머 신호음은 항상 나요
            </div>
          </div>
          <Segmented
            label="공 터치 소리"
            options={SOUND_OPTIONS}
            value={settings.sound ? 'on' : 'off'}
            onChange={(v) => {
              unlockAudio();
              change({ sound: v === 'on' });
            }}
          />
        </li>
      </ul>

      <button
        type="button"
        className={ui.btn + ' ' + styles.reset}
        disabled={isDefault(settings)}
        onClick={() => {
          resetSettings();
          onChanged(DEFAULT_SETTINGS);
        }}
      >
        기본값으로 되돌리기
      </button>
    </main>
  );
}
