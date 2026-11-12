/** 발: 'R' = 오른발, 'L' = 왼발 */
export type Side = 'R' | 'L';

export interface Point {
  x: number;
  y: number;
}

/** 발 상태. rot는 도(°), lift는 0=바닥 · 0.5≈공 위에 올림 */
export interface FootState extends Point {
  rot: number;
  lift: number;
}

/** drills.json의 프레임 한 개. null은 "직전 값 유지" */
export interface DrillFrame {
  /** 1배속 기준, 이 프레임으로 넘어가는 데 걸리는 시간(초) */
  duration: number;
  R: FootState | null;
  L: FootState | null;
  ball: Point | null;
  /** 이 프레임이 끝나는 순간 공에 닿는 발 */
  hit: Side | null;
  caption: string;
}

export interface Drill {
  id: string;
  order: number;
  nameKo: string;
  nameEn: string;
  /** 오른발/왼발을 번갈아 연습하는 동작인지 */
  sidesLR: boolean;
  /** 한 세트 운동 시간(초) */
  work: number;
  sets: number;
  /** 동작 포인트. <b> 강조 태그를 포함할 수 있다 */
  tips: string[];
  ballStart: Point;
  frames: DrillFrame[];
}

export interface CoordinateSystem {
  viewBox: string;
  view: string;
  neutralFeet: { R: FootState; L: FootState };
  ballRadius: number;
  footLength: number;
  footWidth: number;
  notes: string;
}

export interface DrillData {
  coordinateSystem: CoordinateSystem;
  drills: Drill[];
}
