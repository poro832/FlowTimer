# ⏳ FlowTimer — 음악과 함께 흐르는 타이머

> 발표·집중 세션을 위한 **카운트다운 타이머**. 배경 음악과 알림음으로 시간의 흐름을 감각적으로 느끼게 해 줍니다.
> **Windows 데스크톱 앱 · Chrome 확장프로그램 · 웹** 세 가지 형태로, 핵심 코드를 공유합니다.

🔗 **웹 데모:** https://poro832.github.io/FlowTimer/
📦 **버전:** v1.1.0 · **License:** MIT

---

## ✨ 주요 기능

- **카운트다운 타이머** — 30초~90분, **절대 시각 기반**이라 탭이 백그라운드로 가도 시간이 밀리지 않음
- **원형 프로그레스 링** — SVG 기반 60fps 애니메이션, 남은 시간 30%→주황·10%→빨강 경고
- **배경 음악 5종 + 알림음** — 집중/극적/경쾌/활기/로파이, 시작·10초 전 틱·종료음(Web Audio API 합성)
- **인라인 시간 편집 · 키보드 단축키** — `Space` 시작/정지, `Esc` 리셋, `1~9` 분 설정
- **멀티 테마** — Dark / Breeze / Ocean / Sunset
- **데스크톱 편의** — 시스템 트레이 최소화, 최상단 고정, 글로벌 단축키(`Ctrl+Shift+T`)
- **상태 영속(Chrome)** — 팝업을 닫아도 타이머 유지, 재오픈 시 복원

---

## 🧩 제공 형태

| 형태 | 설명 |
|---|---|
| **Windows 데스크톱 앱** | Electron 기반, NSIS 설치파일·포터블 빌드 지원(트레이·글로벌 단축키) |
| **Chrome 확장프로그램** | Manifest V3, 팝업 + 페이지 오버레이 위젯 |
| **웹** | GitHub Pages 배포(위 데모 링크) |

세 형태가 `shared/`의 타이머 엔진·UI·오디오 코어를 공유합니다.

---

## 🛠️ 기술 스택

| 구분 | 기술 |
|---|---|
| **공통 코어** | Vanilla JavaScript, CSS, Web Audio API, SVG |
| **데스크톱** | Electron 33, electron-builder 25 |
| **확장** | Chrome Extension (Manifest V3, Service Worker, Offscreen Document) |
| **배포** | GitHub Actions → GitHub Pages |

---

## 💡 핵심 구현 포인트

- **절대 시각 기반 타이머** — `endTime = Date.now() + duration` 방식으로, 탭 백그라운드·Service Worker 재시작에도 잔여 시간이 정확.
- **Shadow DOM 오버레이(Chrome)** — `closed` 모드로 호스트 페이지와 스타일을 완전히 격리.
- **Offscreen Document(Chrome)** — Manifest V3 Service Worker의 DOM 제약을 우회해 Web Audio API로 사운드 재생.
- **하나의 코어, 세 플랫폼** — 엔진·UI·오디오를 `shared/`로 분리해 데스크톱·확장·웹이 동일 동작.

---

## 🚀 실행 / 빌드

### Chrome 확장프로그램
`chrome://extensions` → 개발자 모드 → **압축 해제된 확장 프로그램 로드** → 레포 폴더 선택

### Windows 데스크톱 앱 (Electron)
```bash
cd flowtime/electron-app
node setup-dev.js   # shared/ 심링크 생성 (최초 1회)
npm install
npm start

# 배포용 빌드
npm run dist:win       # NSIS 설치파일(.exe)
npm run dist:portable  # 포터블 실행파일
```

> 전체 구조·아키텍처 상세는 [`flowtime/README.md`](flowtime/README.md) 참고.

---

> 🧑‍💻 개인 프로젝트 — 하나의 코드베이스로 데스크톱·브라우저·웹을 아우른 멀티플랫폼 타이머
