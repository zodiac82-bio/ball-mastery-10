import raw from './drills.json';
import type { Drill, DrillData } from './types';

// JSON import는 hit를 string으로 추론하므로 한 번 좁혀 준다.
// 실제 값이 타입과 맞는지는 drills.test.ts가 검사한다.
const data = raw as unknown as DrillData;

export const COORDS = data.coordinateSystem;

/** 원본 영상 순서대로 정렬된 10개 동작 */
export const DRILLS: Drill[] = data.drills.slice().sort((a, b) => a.order - b.order);

export function findDrill(id: string): Drill | undefined {
  return DRILLS.find((d) => d.id === id);
}
