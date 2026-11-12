// "홈 화면에 추가" 안내에 쓰는 판단. iOS Safari에는 설치 버튼이 없어서
// 사용자가 공유 메뉴에서 직접 추가해야 한다.

export type InstallHintKind =
  /** 이미 홈 화면 앱으로 열림 → 안내 불필요 */
  | 'installed'
  /** iPhone·iPad: 공유 버튼 → 홈 화면에 추가 */
  | 'ios'
  /** 그 밖의 브라우저: 메뉴의 앱 설치 */
  | 'other';

export interface InstallEnv {
  userAgent: string;
  maxTouchPoints: number;
  /** iOS Safari의 navigator.standalone */
  iosStandalone: boolean;
  /** (display-mode: standalone) 미디어 쿼리 결과 */
  displayStandalone: boolean;
}

export function installHintKind(env: InstallEnv): InstallHintKind {
  if (env.iosStandalone || env.displayStandalone) return 'installed';
  const ua = env.userAgent;
  // iPadOS 13+ Safari는 Mac인 척하므로 터치 지원 여부로 구분한다
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && env.maxTouchPoints > 1);
  return isIOS ? 'ios' : 'other';
}

export function readInstallEnv(): InstallEnv {
  let displayStandalone = false;
  try {
    displayStandalone =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(display-mode: standalone)').matches;
  } catch {
    /* 무시 */
  }
  const nav = navigator as Navigator & { standalone?: boolean };
  return {
    userAgent: nav.userAgent || '',
    maxTouchPoints: nav.maxTouchPoints || 0,
    iosStandalone: nav.standalone === true,
    displayStandalone,
  };
}
