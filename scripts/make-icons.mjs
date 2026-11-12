// 앱 아이콘 PNG를 만든다. 외부 도구 없이 Node만으로 그린다.
//   실행: npm run icons   →  public/icons/*.png
// 그림: 잔디 줄무늬 위에 공 하나와 파란 발(오른발)·주황 발(왼발). 앱 화면과 같은 색.
// 내용은 가운데 80% 안에 있어서 마스크 아이콘(원형·둥근 사각형으로 잘림)으로도 쓸 수 있다.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32, deflateSync } from 'node:zlib';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const GRASS_A = hex('#2f8a45');
const GRASS_B = hex('#2a7d3e');
const RIGHT = hex('#3b7bf0');
const LEFT = hex('#f28c28');
const WHITE = hex('#fafafa');
const DARK = hex('#1d1d1d');
const SHADOW = [0, 0, 0];

/** 세로로 긴 알약 모양(신발) 안쪽이면 음수 */
function capsule(x, y, cx, cy, halfW, halfL) {
  const dy = Math.max(0, Math.abs(y - cy) - (halfL - halfW));
  return Math.hypot(x - cx, dy) - halfW;
}
const circle = (x, y, cx, cy, r) => Math.hypot(x - cx, y - cy) - r;

function inPentagon(x, y, cx, cy, r) {
  let inside = true;
  for (let i = 0; i < 5; i++) {
    const a0 = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    const a1 = -Math.PI / 2 + ((i + 1) * 2 * Math.PI) / 5;
    const x0 = cx + r * Math.cos(a0);
    const y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy + r * Math.sin(a1);
    if ((x1 - x0) * (y - y0) - (y1 - y0) * (x - x0) < 0) inside = false;
  }
  return inside;
}

const BALL = { x: 0.5, y: 0.36, r: 0.165 };
const PATCHES = [
  [0, 0],
  [-0.94, -0.56],
  [0.94, -0.56],
  [-0.62, 0.88],
  [0.62, 0.88],
  [0, -1.12],
];
const SHOES = [
  { x: 0.365, y: 0.675, color: LEFT },
  { x: 0.635, y: 0.675, color: RIGHT },
];
const SHOE_W = 0.082;
const SHOE_L = 0.175;

function blend(base, color, alpha) {
  return base.map((b, i) => b + (color[i] - b) * alpha);
}

/** 0..1 좌표의 한 점 색 */
function colorAt(x, y) {
  let c = Math.floor(y * 6) % 2 === 0 ? GRASS_A : GRASS_B;

  // 그림자
  for (const s of SHOES) {
    if (capsule(x, y, s.x + 0.014, s.y + 0.014, SHOE_W, SHOE_L) < 0) c = blend(c, SHADOW, 0.28);
  }
  if (circle(x, y, BALL.x + 0.016, BALL.y + 0.02, BALL.r) < 0) c = blend(c, SHADOW, 0.25);

  // 공
  const db = circle(x, y, BALL.x, BALL.y, BALL.r);
  if (db < 0) {
    c = db > -0.012 ? DARK : WHITE;
    if (db <= -0.012) {
      for (const [px, py] of PATCHES) {
        if (inPentagon(x, y, BALL.x + px * BALL.r, BALL.y + py * BALL.r, BALL.r * 0.36)) c = DARK;
      }
    }
  }

  // 신발
  for (const s of SHOES) {
    const d = capsule(x, y, s.x, s.y, SHOE_W, SHOE_L);
    if (d < 0) {
      c = d > -0.01 ? blend(s.color, SHADOW, 0.45) : s.color;
      // 끈 세 줄
      for (const ly of [-0.03, 0.01, 0.05]) {
        if (Math.abs(y - (s.y + ly)) < 0.007 && Math.abs(x - s.x) < SHOE_W * 0.55) {
          c = blend(s.color, [255, 255, 255], 0.6);
        }
      }
    }
  }
  return c;
}

function png(size) {
  const SS = 4; // 가장자리를 부드럽게: 픽셀당 4×4번 찍어 평균
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let py = 0; py < size; py++) {
    const row = py * (size * 4 + 1);
    raw[row] = 0; // 필터 없음
    for (let px = 0; px < size; px++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const c = colorAt((px + (sx + 0.5) / SS) / size, (py + (sy + 0.5) / SS) / size);
          r += c[0];
          g += c[1];
          b += c[2];
        }
      }
      const o = row + 1 + px * 4;
      const n = SS * SS;
      raw[o] = Math.round(r / n);
      raw[o + 1] = Math.round(g / n);
      raw[o + 2] = Math.round(b / n);
      raw[o + 3] = 255;
    }
  }

  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // 비트 깊이
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(OUT, { recursive: true });
const files = [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
  ['favicon-48.png', 48],
];
for (const [name, size] of files) {
  const data = png(size);
  writeFileSync(join(OUT, name), data);
  console.log(name, size + 'px', (data.length / 1024).toFixed(1) + ' kB');
}
