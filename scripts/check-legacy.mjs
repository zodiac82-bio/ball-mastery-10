// 빌드 결과 중 구형 Safari(iOS 12)가 실제로 실행하는 파일에
// 그 브라우저가 모르는 최신 문법이 남아 있지 않은지 검사한다.
//   실행: npm run check:legacy   (먼저 npm run build)
// ES2019 문법으로 파싱해 본다. 옵셔널 체이닝(?.), ??, BigInt, 클래스 필드, 숫자 구분자(1_000) 등
// ES2020 이후 문법이 있으면 파싱에 실패한다.
// (Safari 12는 ES2018 전부와 ES2019의 `catch {}`까지 지원하고, ?. 와 ?? 는 13.1부터다)
// 문법만 본다. 없는 API(예: Array.prototype.flat)는 plugin-legacy의 폴리필이 맡는다.

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'acorn';

const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');

let assets;
try {
  assets = readdirSync(join(DIST, 'assets'));
} catch {
  console.error('dist/ 가 없습니다. 먼저 npm run build 를 실행하세요.');
  process.exit(1);
}

const targets = [
  ...assets.filter((f) => /-legacy-.*\.js$/.test(f)).map((f) => join('assets', f)),
  ...readdirSync(DIST).filter((f) => /^(sw|workbox-.*|registerSW)\.js$/.test(f)),
];

if (!targets.some((f) => /index-legacy-/.test(f))) {
  console.error('legacy 번들을 찾지 못했습니다. vite.config.ts의 legacy 플러그인을 확인하세요.');
  process.exit(1);
}

let failed = 0;
for (const file of targets) {
  const code = readFileSync(join(DIST, file), 'utf8');
  try {
    parse(code, { ecmaVersion: 2019, sourceType: 'script' });
    console.log('ok    ' + file + '  (' + (code.length / 1024).toFixed(1) + ' kB)');
  } catch (e) {
    failed++;
    const at = typeof e.pos === 'number' ? code.slice(Math.max(0, e.pos - 40), e.pos + 40) : '';
    console.error('FAIL  ' + file + ': ' + e.message + '\n      … ' + at + ' …');
  }
}

if (failed > 0) {
  console.error('\n구형 Safari가 읽지 못하는 문법이 ' + failed + '개 파일에 있습니다.');
  process.exit(1);
}
console.log('\n구형 Safari용 파일 ' + targets.length + '개 모두 ES2019 이하 문법입니다.');
