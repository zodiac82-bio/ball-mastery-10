// Web Audio 박자음. iOS 정책상 AudioContext는 사용자의 첫 탭에서 만든다.
// 오디오가 없거나 막혀 있어도 앱은 조용히 계속 동작해야 한다.

type AudioContextCtor = new () => AudioContext;

let ctx: AudioContext | null = null;

function getCtor(): AudioContextCtor | undefined {
  const w = window as unknown as {
    AudioContext?: AudioContextCtor;
    webkitAudioContext?: AudioContextCtor;
  };
  return w.AudioContext || w.webkitAudioContext;
}

/** 사용자 제스처(탭/클릭) 핸들러 안에서 부른다. 여러 번 불러도 된다. */
export function unlockAudio(): void {
  try {
    if (!ctx) {
      const Ctor = getCtor();
      if (Ctor) ctx = new Ctor();
    }
    if (ctx && ctx.state !== 'running' && typeof ctx.resume === 'function') {
      const p = ctx.resume() as Promise<void> | undefined;
      if (p && typeof p.catch === 'function') {
        p.catch(() => {
          /* 무시 */
        });
      }
    }
  } catch {
    /* 오디오 없이 계속 */
  }
}

/** 첫 탭에서 오디오를 자동으로 연다. 앱 시작 때 한 번 부른다. */
export function installAudioUnlock(): void {
  const events = ['touchend', 'mousedown', 'keydown'];
  const handler = () => {
    unlockAudio();
    if (ctx && ctx.state === 'running') {
      events.forEach((e) => document.removeEventListener(e, handler, true));
    }
  };
  events.forEach((e) => document.addEventListener(e, handler, true));
}

/** 짧은 사인파 삐 소리. 오디오가 아직 안 열렸으면 아무 일도 하지 않는다. */
export function beep(freq: number, duration: number, volume = 0.15): void {
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.start(t);
    osc.stop(t + duration);
  } catch {
    /* 무시 */
  }
}

/** 공 터치 박자음: 오른발 880Hz, 왼발 660Hz */
export const HIT_TONE = { R: 880, L: 660 } as const;

export function beepHit(side: 'R' | 'L'): void {
  beep(HIT_TONE[side], 0.08, 0.12);
}
