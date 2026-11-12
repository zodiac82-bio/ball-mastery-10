# 볼마스터리 10

유소년 축구 선수(초등학생)를 위한 볼마스터리 훈련 웹앱(PWA).
동작을 애니메이션으로 보고 → 30초 × 3세트 타이머로 따라 하고 → 기록을 쌓는다.

**배포 주소: https://zodiac82-bio.github.io/ball-mastery-10/** (`main`에 푸시하면 자동으로 다시 배포된다)

> 현재 상태: **8단계까지 모두 완료.** 실제 iPad에서의 확인(아래 "실기기에서 확인할 것")만 남았다.

## 실행

Node.js 22.12 이상 또는 24 LTS가 필요하다(Vitest 5 요구 사항. Node 25는 지원 범위 밖).

```bash
npm install
npm run dev          # 개발 서버 (http://localhost:5173)
npm run build        # 타입 검사 + 프로덕션 빌드 (dist/)
npm run preview      # 빌드 결과 미리보기 (http://localhost:4173, 서비스 워커 포함)
```

검사:

```bash
npm test             # 단위 테스트 (Vitest, 93개)
npm run test:e2e     # 빌드 후 Playwright 스모크 테스트 (iPad 가로·세로 WebKit + Chromium, 27개)
npm run check:legacy # 구형 Safari용 번들에 최신 문법이 남지 않았는지 검사 (빌드 후)
npm run check        # 타입·린트·포맷·단위 테스트·빌드·구형 문법 검사를 한 번에
npm run lint
npm run typecheck
npm run format       # Prettier로 정리
```

그 밖에:

```bash
npm run icons        # 앱 아이콘 다시 만들기 (public/icons/)
```

Playwright를 처음 쓰는 컴퓨터에서는 테스트용 브라우저를 한 번 받아야 한다: `npx playwright install webkit chromium`.
스모크 테스트의 스크린샷(홈·상세·타이머·기록·설정)은 `test-results/screenshots/<기기>/`에 남는다.

## 배포

빌드 결과 `dist/`는 정적 파일뿐이라 어디든 올릴 수 있다. `base: './'`(상대 경로)라서 하위 경로에서도 그대로 동작한다.
**반드시 HTTPS여야 한다**(오프라인 저장과 홈 화면 앱 동작에 필요). 아래 두 곳은 HTTPS를 자동으로 준다.

### GitHub Pages

1. GitHub에 저장소를 만들고 이 폴더를 `main` 브랜치로 푸시한다.
2. 저장소 Settings → Pages → Build and deployment → Source를 **GitHub Actions**로 바꾼다.
3. 푸시할 때마다 `.github/workflows/deploy.yml`이 검사 → 빌드 → 배포한다. 주소는 `https://<사용자>.github.io/<저장소>/`.

### Vercel

1. vercel.com에서 저장소를 Import한다.
2. Framework Preset은 **Vite**, Build Command `npm run build`, Output Directory `dist`(자동 인식됨).
3. Node.js 버전을 24.x로 맞춘다(Project Settings → General).

저장소 없이 올리려면 `npm run build` 후 `npx vercel deploy dist --prod`.

### 의존성을 바꿨을 때 주의

`package.json`의 의존성을 추가·변경한 뒤 GitHub Actions의 `npm ci`가 "package.json and package-lock.json are in sync" 오류로 실패하면, lock 파일에 리눅스용 선택 의존성이 빠진 것이다. `rm -rf node_modules package-lock.json && npm install`로 lock 파일을 처음부터 다시 만들면 해결된다.

### 새 버전 올린 뒤

기기는 새 파일을 백그라운드로 받아 두고 **다음에 앱을 열 때** 적용한다. 바로 확인하려면 앱을 완전히 닫았다가 두 번 연다.

## 번들 용량

| 파일                                     | 크기   | gzip  |
| ---------------------------------------- | ------ | ----- |
| 최신 브라우저용 앱 (`index-*.js`)        | 265 kB | 82 kB |
| 최신 브라우저용 폴리필                   | 43 kB  | 15 kB |
| 구형 브라우저용 앱 (`index-legacy-*.js`) | 276 kB | 86 kB |
| 구형 브라우저용 폴리필                   | 67 kB  | 24 kB |
| CSS                                      | 10 kB  | 3 kB  |
| 서비스 워커 (`sw.js` + workbox)          | 17 kB  | 6 kB  |
| 아이콘 4개                               | 20 kB  | —     |

- 한 기기가 처음 열 때 실제로 받는 것은 한쪽 세트뿐이다: 최신 기기 약 **100 kB**(gzip), 구형 iPad 약 **115 kB**(gzip).
- 오프라인용으로는 양쪽 세트를 모두 저장한다(12개 파일, 약 650 kB).
- 앱 코드 자체는 작고, 용량의 대부분은 React다(React만 넣은 1단계 번들이 이미 231 kB였다).

## 완료 기준 점검

| 기준                                                    | 상태                   | 확인 방법                                                                                                 |
| ------------------------------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------- |
| 10개 동작이 프로토타입과 같은 동작으로 끊김 없이 반복   | ✅                     | 단위 테스트가 프로토타입 원본 코드와 1/120초 간격으로 수치 대조(소수 9자리), 루프·프레임 경계 연속성 검사 |
| 오른발/왼발 반전 시 발 색·라벨·캡션이 바뀜              | ✅                     | 단위 테스트 + 스모크 테스트                                                                               |
| 30초 × 3세트, 전체 루틴이 끝까지 진행                   | ✅ (소리는 미확인)     | 단위 테스트로 30세트 1,338초 완주, 브라우저에서 짧은 설정으로 10동작 실제 속도 완주                       |
| 새로고침해도 오늘 기록 유지, localStorage가 막혀도 동작 | ✅                     | 단위 테스트 + 스모크 테스트                                                                               |
| 비행기 모드에서 홈 화면 아이콘으로 열림                 | ⚠️ 데스크톱에서만 확인 | 스모크 테스트가 네트워크를 끊고 다시 연다. 실제 iPad 홈 화면 아이콘은 배포 후 확인 필요                   |
| iPad Safari 가로/세로에서 레이아웃이 깨지지 않음        | ⚠️ WebKit 에뮬레이션만 | Playwright의 iPad(gen 7) 가로·세로. 실기기 미확인                                                         |
| 콘솔 에러 0, 단위 테스트 통과                           | ✅ (최신 브라우저)     | 스모크 테스트가 콘솔 에러를 수집해 0인지 확인. 구형 Safari는 아래 참고                                    |

### 실기기에서 확인할 것

자동으로 확인할 수 없어서 사람이 봐야 하는 것들이다.

1. **소리**: 터치 박자음(오른발 높은 음, 왼발 낮은 음), 준비 삐, 운동 시작음, 종료 3초 전 삐삐삐, 종료음. iPad 옆면의 무음 스위치/제어 센터의 무음이 켜져 있으면 나지 않는다.
2. **구형 iPad에서 실제로 뜨는지**: 구형 번들이 실행되는 것과 문법은 검사했지만, iOS 12 Safari 엔진 자체에서 돌려 본 것은 아니다. 화면 배치(CSS)도 그 엔진에서는 미확인이다.
3. **구형 iPad에서 애니메이션이 끊기지 않는지**(60fps 목표).
4. **홈 화면에 추가 → 비행기 모드 → 아이콘으로 열기**.
5. **화면이 꺼지지 않는지**: Safari 16.4 미만은 화면 꺼짐 방지가 동작하지 않으므로 설정 > 디스플레이 및 밝기 > 자동 잠금을 "안 함"으로 바꾼다.
6. **5·6·8번 동작의 발 순서**: 원본 영상 각도 때문에 불확실했던 부분. 틀렸다면 `src/data/drills.json`의 해당 프레임만 고치면 된다(코드 수정 불필요).

### 알려진 제한

- **구형 Safari(16.4 미만)의 콘솔에는 문법 에러가 한 줄 찍힌다.** 최신 번들을 읽다가 실패한 뒤 구형 번들로 넘어가는 `@vitejs/plugin-legacy`의 정상 동작이고 앱에는 영향이 없다. 그 브라우저에서는 "콘솔 에러 0"이 될 수 없다.
- **3·4번 동작의 팁 문구 "오른발 30초 → 왼발 30초"는 데이터에 적힌 글자 그대로다.** 설정에서 운동 시간을 바꿔도 이 문구는 바뀌지 않는다.
- `npm audit`가 보고하는 취약점은 모두 개발 도구(ESLint·빌드 도구 계열)의 의존성이고, 배포되는 앱 파일에는 들어가지 않는다.

## 폴더 구조

```
index.html
vite.config.ts          빌드/테스트 설정 (레거시 타깃 포함)
reference/
  prototype.html        검증된 원본 프로토타입 (비교용, 빌드에 포함 안 됨)
src/
  main.tsx              진입점
  App.tsx               최상위 컴포넌트 (라우팅, 타이머·기록·설정 연결)
  data/drills.json      10개 동작 키프레임 데이터
  data/types.ts         동작 데이터 타입
  data/drills.ts        타입이 붙은 DRILLS, findDrill
  engine/timeline.ts    buildTimeline, mirrorTimeline (null 채우기·루프 시작·좌우 반전)
  engine/sample.ts      sample, lerpFoot (easeInOut 보간·발 들림 arc)
  engine/render.ts      SVG 속성 계산 (발·그림자·공 회전·터치 링)
  components/DrillScene.tsx      잔디·공·발 SVG (요소는 한 번만 생성)
  components/sceneRefs.ts        applyScene: 매 프레임 속성만 갱신
  components/DrillAnimation.tsx  rAF 재생 루프, 터치 링·박자음, 단계 이동
  components/DrillThumbnail.tsx  첫 프레임 정지 그림
  audio/beeper.ts       Web Audio 박자음 (webkitAudioContext 폴백)
  router.ts             해시 라우팅 (#/, #/drill/<id>, #/records, #/settings)
  screens/Home.tsx      동작 목록
  screens/DrillDetail.tsx  동작 상세 + 컨트롤
  screens/Records.tsx   이번 주 달력, 연속 운동일, 오늘 한 동작, 기록 초기화
  screens/Settings.tsx  운동/휴식/준비 시간, 세트 수, 기본 속도·소리
  components/ConfirmDialog.tsx  앱 안 확인 대화상자
  components/Segmented.tsx  묶음 선택 버튼
  data/tips.ts          팁의 <b> 강조를 안전하게 나누는 파서
  styles/ui.module.css  공용 버튼·카드 스타일
  timer/workout.ts      운동 타이머 상태 기계 (순수 함수: makeQueue, tick)
  hooks/useWorkout.ts   실제 경과 시간으로 tick을 부르는 훅
  hooks/useWakeLock.ts  화면 꺼짐 방지 (지원 안 하면 무시)
  components/TimerPanel.tsx  카운트다운 표시
  storage/safeStorage.ts  예외를 삼키는 localStorage 래퍼 (실패 시 메모리 보관)
  storage/records.ts    날짜별·동작별 완료 세트 기록
  storage/stats.ts      이번 주·연속 운동일·누적 계산
  storage/settings.ts   설정 저장, 범위 제한
  styles/global.css     디자인 토큰, 전역 스타일
  pwa/install.ts        홈 화면 추가 안내 종류 판단 (iOS / 그 밖 / 이미 설치)
  components/InstallHint.tsx  홈 화면 추가 안내 문구
scripts/make-icons.mjs  아이콘 PNG 생성 (Node만 사용)
scripts/check-legacy.mjs  구형 Safari용 번들 문법 검사
tests/smoke.spec.ts     Playwright 스모크 테스트
playwright.config.ts    iPad 가로·세로(WebKit) + Chromium
.github/workflows/deploy.yml  GitHub Pages 배포
public/icons/           앱 아이콘 (192, 512, apple-touch 180, favicon 48)
```

## 구현 단계

- [x] 1. 프로젝트 세팅
- [x] 2. 데이터·엔진 + 단위 테스트
- [x] 3. `<DrillAnimation>` 컴포넌트
- [x] 4. 홈 + 상세 화면
- [x] 5. 타이머 + 전체 루틴 + 기록 저장
- [x] 6. 기록·설정 화면
- [x] 7. PWA
- [x] 8. 마무리 (Playwright, 번들 용량, 배포 문서)

## 오프라인(PWA) 확인 방법

서비스 워커는 개발 서버(`npm run dev`)에는 없고 빌드 결과에만 들어간다.

```bash
npm run build
npm run preview
```

1. http://localhost:4173 을 한 번 연다(이때 앱 파일 12개, 약 650KB가 기기에 저장된다).
2. 터미널에서 미리보기 서버를 끈다(Ctrl+C).
3. 브라우저를 새로고침해도 앱이 그대로 열리면 오프라인 동작이 되는 것이다.

**iPad에서 쓰려면 HTTPS 주소가 필요하다.** 서비스 워커는 `https://` 또는 `localhost`에서만 등록된다. 같은 와이파이의 `http://192.168.x.x:4173` 으로 열면 화면은 보이지만 오프라인 저장과 홈 화면 앱 동작은 되지 않는다. GitHub Pages나 Vercel처럼 HTTPS를 주는 곳에 올려서 확인한다(배포 방법은 8단계에서 정리).

iPad에 설치: Safari로 주소를 연다 → 공유 버튼 → "홈 화면에 추가". 그 뒤 한 번은 인터넷이 되는 곳에서 아이콘으로 열어야 파일이 저장된다.

## 결정 사항

- **스타일은 CSS Modules.** Tailwind v4는 `@layer`, `oklch()` 등 Safari 12에 없는 CSS 기능에 기대고 있어서 구형 iPad에서 깨질 위험이 있다. 의존성도 줄어든다.
- **구형 Safari 대응은 `@vitejs/plugin-legacy`.** 타깃 `ios >= 12`, `safari >= 12`. 번들이 두 벌 나온다. modern 번들은 `import.meta.resolve`를 지원하는 브라우저(Safari 16.4+)만 쓰고 옵셔널 체이닝이 남아 있다. 그보다 오래된 Safari는 자동으로 legacy 번들(SystemJS + 폴리필, `?.`·`??` 없음)을 받는다. 구형 iPad가 실제로 실행하는 것은 legacy 번들이다.
- **라우팅은 직접 만든 해시 라우팅**(`#/drill/tap-step`). 화면이 4개뿐이라 라우터 라이브러리를 넣지 않는다. GitHub Pages 같은 정적 호스팅에서 서버 설정 없이 동작한다.
- **`base: './'`**(상대 경로)로 빌드해서 GitHub Pages 하위 경로와 Vercel 루트 양쪽에서 그대로 쓴다.
- **TypeScript는 6.0.x로 고정.** typescript-eslint 8이 `<6.1.0`까지만 지원한다.
- **`drills.json`은 Prettier 대상에서 제외.** 코치가 나중에 손으로 고칠 때 diff가 깔끔하게 보이도록 원본 형식을 유지한다.
- **프로토타입은 `reference/`에 보관**해서 3단계에서 눈으로 비교하는 기준으로 쓴다.
- **`<DrillAnimation>`은 지시서의 props 외에 `ref` 핸들(`stepFrame`, `restart`)을 가진다.** "한 단계씩 넘기기"는 재생 위치를 컴포넌트 안에서 관리해야 해서 props만으로는 표현하기 어렵다. 단계 이동은 그 프레임의 끝 자세(진행도 0.999)를 보여 준다.
- **오디오는 첫 탭에서 자동으로 연다**(`installAudioUnlock`). 소리 버튼을 누르기 전에 타이머가 시작돼도 소리가 나게 하기 위해서다.
- **CSS에서 flex `gap`을 쓰지 않는다.** Safari 14.0 이하는 flex gap을 지원하지 않아 간격이 사라진다. flex 안의 간격은 margin으로, `gap`은 grid에서만 쓴다. `clamp()`, `aspect-ratio`, `inset`도 같은 이유로 피한다.
- **팁의 `<b>`는 HTML로 넣지 않고 파서로 나눠 렌더링한다**(`parseTip`). `<b>` 외의 태그는 글자 그대로 보인다.
- **"한 단계씩 넘기기" ◀ ▶는 재생 중에 눌러도 된다.** 누르면 자동으로 멈추고 한 단계 이동한다. 아이가 멈춤을 먼저 누르지 않아도 되게 하기 위해서다.
- **속도와 소리는 동작을 넘겨도 유지되고, 발 선택과 멈춤 상태는 동작마다 초기화된다**(프로토타입과 같은 동작).
- **상세 화면 배치는 `orientation` 미디어 쿼리로 나눈다.** 가로이고 폭 700px 이상이면 좌우, 그 외에는 위아래.
- **기록은 "완료한 세트 수"를 센다.** 프로토타입은 "도달한 최고 세트 번호"를 저장했지만, 같은 날 두 번 하면 6세트로 쌓이는 쪽이 기록 화면에 맞다. 저장 키는 `bm10.records.v1`, 모양은 `{ "YYYY-MM-DD": { "<동작 id>": 세트 수 } }`, 날짜는 기기 현지 시간 기준.
- **운동/휴식/세트 수는 앱 전체 설정 하나를 쓴다.** `drills.json`의 동작별 `work`/`sets`(모두 30/3)는 타이머에 쓰지 않는다. 6단계 설정 화면이 전체 값을 바꾸는 구조라서다.
- **휴식이 끝나기 3초 전에도 삐 소리를 낸다.** 프로토타입에는 없지만 다음 세트를 준비할 신호가 필요하다.
- **타이머 신호음은 "소리" 토글과 무관하게 항상 난다.** 토글은 공 터치 박자음만 켜고 끈다(프로토타입과 같음).
- **타이머는 실제 경과 시간으로 초를 세되, 한 번에 1.5초까지만 인정한다.** 화면이 잠기거나 다른 앱에 다녀오면 그동안은 멈춰 있던 것으로 친다(보지 않은 시간에 세트가 기록되지 않게).
- **타이머가 도는 동안 다른 화면으로 가면 타이머를 끝낸다**(목록, 이전/다음, 브라우저 뒤로 가기 모두). 전체 루틴이 다음 동작으로 넘어갈 때는 주소도 함께 바뀐다.
- **타이머 중에는 발 선택이 잠긴다.** L/R 동작은 세트마다 오른발 → 왼발 → 오른발로 자동 전환되고, 휴식 중에 이미 다음 발을 보여 준다.
- **화면 꺼짐 방지(Wake Lock)는 Safari 16.4 이상에서만 동작한다.** 그보다 오래된 iPad는 설정 > 디스플레이 및 밝기 > 자동 잠금을 "안 함"으로 바꿔야 한다.
- **한 주는 월요일에 시작한다.** 기록 화면의 달력은 월~일 7칸이다.
- **연속 운동일은 오늘 아직 안 했으면 어제부터 센다.** 운동 전이라고 0으로 보이면 아이가 실망하므로, 어제까지 이어 온 날수를 그대로 보여 준다. 하루를 통째로 건너뛰면 끊긴다.
- **설정 범위**: 운동 10~120초(5초 단위), 휴식 0~60초(5초 단위), 준비 0~10초, 세트 1~10. 글자 입력 대신 −/+ 버튼만 쓴다(장갑, 멀리서 터치). 저장 키는 `bm10.settings.v1`.
- **설정의 기본 속도·소리를 바꾸면 지금 세션에도 바로 적용된다.** 상세 화면에서 바꾼 속도·소리는 그 세션에만 적용되고 설정에는 저장되지 않는다.
- **기록 초기화는 "취소"에 먼저 초점이 가는 확인 대화상자를 거친다.** 지워질 날수와 세트 수를 문구에 보여 준다.
- **새 버전은 다음에 앱을 열 때 적용된다.** 서비스 워커가 새 파일을 받아도 열려 있는 화면을 새로고침하지 않는다(운동 타이머 도중에 화면이 바뀌지 않게).
- **modern·legacy 번들을 둘 다 미리 저장한다.** 어떤 기기가 열어도 오프라인에서 동작하게 하기 위해서고, 그래서 저장 용량이 약 650KB다.
- **아이콘은 `scripts/make-icons.mjs`가 Node만으로 그린다.** 이미지 편집 도구나 추가 패키지가 필요 없다. 그림이 가운데 80% 안에 있어서 같은 파일을 마스크 아이콘으로도 쓴다.
- **테마 색과 배경 색은 앱 배경과 같은 `#0f1a14`.** iOS 상태 표시줄은 `black-translucent`라서 화면 위쪽에 안전 영역만큼 여백을 준다.
- **홈 화면 추가 안내는 홈 화면 맨 아래에 한 번 보여 주고, 닫으면 다시 나오지 않는다.** 이미 홈 화면 앱으로 열었으면 보이지 않는다. iPad/iPhone에는 공유 버튼 경로를, 그 밖에는 브라우저 메뉴 경로를 안내한다.
- **스모크 테스트는 스크린샷을 "찍어서 남기기"만 하고 픽셀 비교는 하지 않는다.** 글꼴과 운영체제에 따라 픽셀이 달라져 비교 기준이 쉽게 깨지기 때문이다. 대신 화면의 글자·상태·콘솔 에러를 검사한다.
- **스모크 테스트는 dev 서버가 아니라 빌드 결과를 대상으로 한다.** 실제로 배포되는 파일(서비스 워커, 구형 번들 포함)을 확인하기 위해서다. 타이머 테스트는 설정을 10초 × 2세트로 줄여서 돌린다.
- **구형 번들 테스트는 최신 브라우저에서 최신용 스크립트를 빼고 여는 방식이다.** 구형 번들이 실제로 실행되는지는 확인하지만, 구형 엔진을 대신하지는 못한다. 문법은 `check:legacy`가 ES2019 기준으로 따로 본다(Safari 12는 `catch {}`까지 지원, `?.`·`??`는 13.1부터).

## 하지 않는 것

유튜브 영상 임베드/다운로드, 로그인·서버·광고·외부 분석 도구, 아이의 개인정보 수집, 동작별 if문 하드코딩(애니메이션은 반드시 `drills.json` 데이터 기반).

## 나중에 추가할 수 있는 것

- 코치가 키프레임을 수정하는 편집기 화면(드래그로 발/공 위치 조정 → JSON 내보내기)
- 새 동작 추가(공 두 개, 콘 드리블 등)
- 아이가 직접 찍은 영상과 애니메이션을 나란히 보기
- 레벨/배지 시스템
