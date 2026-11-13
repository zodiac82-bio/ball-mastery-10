import { useSyncExternalStore } from 'react';

// "홈 화면에 추가" 안내에 쓰는 판단과, Android Chrome의 설치 창 띄우기.
//  - iOS Safari에는 설치 버튼이 없어서 사용자가 공유 메뉴에서 직접 추가해야 한다.
//  - Android Chrome(과 데스크톱 Chrome·Edge)은 beforeinstallprompt 이벤트를 주는데,
//    이걸 잡아 두면 앱 안의 버튼으로 설치 창을 띄울 수 있다.

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

// ---- Android Chrome 설치 창 ----

/** Chrome이 주는 beforeinstallprompt 이벤트 (표준 타입에 없어서 직접 적는다) */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<unknown>;
  userChoice?: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type InstallState =
  /** 설치 창을 띄울 수 없음 (iOS, 이미 설치됨, 브라우저가 아직 준비 안 됨) */
  | 'unavailable'
  /** 버튼을 누르면 설치 창을 띄울 수 있음 */
  | 'available'
  /** 방금 설치됨 */
  | 'installed';

let deferred: InstallPromptEvent | null = null;
let state: InstallState = 'unavailable';
const listeners: Array<() => void> = [];

function setState(next: InstallState): void {
  if (state === next) return;
  state = next;
  listeners.slice().forEach((fn) => fn());
}

function subscribe(fn: () => void): () => void {
  listeners.push(fn);
  return () => {
    const i = listeners.indexOf(fn);
    if (i >= 0) listeners.splice(i, 1);
  };
}

function getState(): InstallState {
  return state;
}

/**
 * 앱 시작 때 한 번 부른다. 이벤트는 화면이 그려지기 전에 올 수 있어서
 * 컴포넌트가 아니라 여기서 미리 잡아 둔다.
 */
export function watchInstallPrompt(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    // 브라우저가 알아서 띄우는 작은 안내 대신 우리 버튼을 쓴다
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    setState('available');
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    setState('installed');
  });
}

/** 설치 창을 띄운다. 사용자 탭 핸들러 안에서 불러야 한다. */
export function promptInstall(): void {
  const event = deferred;
  if (!event) return;
  // 이벤트 하나로는 한 번만 띄울 수 있다
  deferred = null;
  setState('unavailable');
  try {
    const shown = event.prompt();
    const choice = event.userChoice;
    if (choice && typeof choice.then === 'function') {
      choice
        .then((result) => {
          if (result && result.outcome === 'accepted') setState('installed');
        })
        .catch(() => undefined);
    }
    if (shown && typeof (shown as Promise<unknown>).catch === 'function') {
      (shown as Promise<unknown>).catch(() => undefined);
    }
  } catch {
    /* 무시 */
  }
}

export function useInstallState(): InstallState {
  return useSyncExternalStore(subscribe, getState, getState);
}
