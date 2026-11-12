import { useEffect } from 'react';

interface WakeLockSentinelLike {
  release: () => Promise<void>;
}
interface WakeLockLike {
  request: (type: 'screen') => Promise<WakeLockSentinelLike>;
}

/**
 * active인 동안 화면이 꺼지지 않게 한다(Screen Wake Lock API).
 * 지원하지 않는 브라우저(구형 Safari 등)에서는 조용히 아무 일도 하지 않는다.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const wakeLock = (navigator as unknown as { wakeLock?: WakeLockLike }).wakeLock;
    if (!wakeLock || typeof wakeLock.request !== 'function') return;

    let sentinel: WakeLockSentinelLike | null = null;
    let cancelled = false;

    const acquire = () => {
      try {
        wakeLock
          .request('screen')
          .then((s) => {
            if (cancelled) {
              s.release().catch(() => undefined);
            } else {
              sentinel = s;
            }
          })
          .catch(() => undefined);
      } catch {
        /* 무시 */
      }
    };

    // 다른 앱에 갔다 오면 잠금이 풀리므로 돌아왔을 때 다시 건다
    const onVisible = () => {
      if (document.visibilityState === 'visible') acquire();
    };

    acquire();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      if (sentinel) sentinel.release().catch(() => undefined);
    };
  }, [active]);
}
