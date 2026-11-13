import { useState } from 'react';
import { installHintKind, promptInstall, readInstallEnv, useInstallState } from '../pwa/install';
import { readJSON, writeJSON } from '../storage/safeStorage';
import ui from '../styles/ui.module.css';
import styles from './InstallHint.module.css';

const DISMISSED_KEY = 'bm10.installHintDismissed.v1';

/**
 * 홈 화면에 추가하는 방법 안내. 이미 앱으로 열었거나 닫았으면 보이지 않는다.
 *  - Android Chrome: "앱 설치" 버튼을 누르면 설치 창이 뜬다
 *  - iPhone·iPad: 공유 버튼 경로를 글로 안내한다(설치 버튼을 만들 수 없다)
 */
export function InstallHint() {
  const [kind] = useState(() => installHintKind(readInstallEnv()));
  const [dismissed, setDismissed] = useState(() => readJSON(DISMISSED_KEY, false) === true);
  const install = useInstallState();

  if (kind === 'installed' || install === 'installed' || dismissed) return null;

  const canPrompt = install === 'available';

  return (
    <aside className={ui.card + ' ' + styles.hint} data-install-hint={kind}>
      <div className={styles.text}>
        <strong className={styles.title}>📲 홈 화면에 추가하면 앱처럼 쓸 수 있어요</strong>
        <span className={styles.body}>
          {canPrompt
            ? '"앱 설치"를 누르면 홈 화면에 아이콘이 생겨요. 한 번 열어 두면 인터넷이 없는 운동장에서도 돼요.'
            : kind === 'ios'
              ? 'Safari 아래(또는 위)의 공유 버튼 ⬆️ 을 누르고 "홈 화면에 추가"를 고르세요. 한 번 열어 두면 인터넷이 없는 운동장에서도 돼요.'
              : '브라우저 메뉴(⋮)에서 "앱 설치" 또는 "홈 화면에 추가"를 고르세요. 한 번 열어 두면 인터넷 없이도 돼요.'}
        </span>
      </div>
      <div className={styles.buttons}>
        {canPrompt && (
          <button type="button" className={ui.btnPrimary} onClick={promptInstall}>
            앱 설치
          </button>
        )}
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
      </div>
    </aside>
  );
}
