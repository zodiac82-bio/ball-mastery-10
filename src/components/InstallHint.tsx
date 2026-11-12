import { useState } from 'react';
import { installHintKind, readInstallEnv } from '../pwa/install';
import { readJSON, writeJSON } from '../storage/safeStorage';
import ui from '../styles/ui.module.css';
import styles from './InstallHint.module.css';

const DISMISSED_KEY = 'bm10.installHintDismissed.v1';

/** 홈 화면에 추가하는 방법 안내. 이미 앱으로 열었거나 닫았으면 보이지 않는다. */
export function InstallHint() {
  const [kind] = useState(() => installHintKind(readInstallEnv()));
  const [dismissed, setDismissed] = useState(() => readJSON(DISMISSED_KEY, false) === true);

  if (kind === 'installed' || dismissed) return null;

  return (
    <aside className={ui.card + ' ' + styles.hint} data-install-hint={kind}>
      <div className={styles.text}>
        <strong className={styles.title}>📲 홈 화면에 추가하면 앱처럼 쓸 수 있어요</strong>
        <span className={styles.body}>
          {kind === 'ios'
            ? 'Safari 아래(또는 위)의 공유 버튼 ⬆️ 을 누르고 "홈 화면에 추가"를 고르세요. 한 번 열어 두면 인터넷이 없는 운동장에서도 돼요.'
            : '브라우저 메뉴에서 "앱 설치" 또는 "홈 화면에 추가"를 고르세요. 한 번 열어 두면 인터넷 없이도 돼요.'}
        </span>
      </div>
      <button
        type="button"
        className={ui.btn}
        onClick={() => {
          writeJSON(DISMISSED_KEY, true);
          setDismissed(true);
        }}
      >
        닫기
      </button>
    </aside>
  );
}
