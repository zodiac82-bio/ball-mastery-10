// localStorage 래퍼. 사파리 개인정보 보호 모드나 저장 공간 부족처럼
// localStorage가 막혀 있어도 예외를 밖으로 내보내지 않는다.
// 저장에 실패하면 메모리에만 들고 있어서, 앱을 닫기 전까지는 정상 동작한다.

const memory: Record<string, string> = {};

function getStore(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** 저장된 JSON을 읽는다. 없거나 깨졌거나 막혀 있으면 fallback */
export function readJSON(key: string, fallback: unknown): unknown {
  let raw: string | null | undefined = memory[key];
  if (raw === undefined) {
    try {
      const store = getStore();
      raw = store ? store.getItem(key) : null;
    } catch {
      raw = null;
    }
  }
  if (raw === null || raw === undefined) return fallback;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return fallback;
  }
}

/** JSON으로 저장한다. localStorage에 실제로 저장됐으면 true */
export function writeJSON(key: string, value: unknown): boolean {
  let raw: string;
  try {
    raw = JSON.stringify(value);
  } catch {
    return false;
  }
  try {
    const store = getStore();
    if (store) {
      store.setItem(key, raw);
      delete memory[key];
      return true;
    }
  } catch {
    /* 아래에서 메모리에 보관 */
  }
  memory[key] = raw;
  return false;
}

export function removeKey(key: string): void {
  delete memory[key];
  try {
    const store = getStore();
    if (store) store.removeItem(key);
  } catch {
    /* 무시 */
  }
}
