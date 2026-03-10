# FlowTimer

발표·집중 세션을 위한 카운트다운 타이머입니다.
**Chrome 확장프로그램**과 **Electron 데스크톱 앱** 두 가지 형태로 제공되며, 핵심 코드를 공유합니다.

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| 카운트다운 타이머 | 30초 ~ 90분, 절대 시각 기반으로 drift 없음 |
| 원형 프로그레스 링 | SVG `stroke-dashoffset` 기반, 60fps 애니메이션 |
| 색상 경고 | 남은 시간 30% → 주황, 10% → 빨강 + 깜빡임 |
| 배경 음악 5종 | 🧘 집중 / 🎬 극적 / ☀️ 경쾌 / ⚡ 활기 / 🎵 로파이 |
| 알림음 | 시작음 · 10초 전 틱 · 종료음 (Web Audio API 합성) |
| 종료 사운드 | 타이머 완료 시 finish 효과음 재생 |
| 볼륨 조절 | 슬라이더 0 ~ 100% |
| 인라인 시간 편집 | 시간 표시 클릭 → 분:초 직접 입력 |
| 키보드 단축키 | `Space` 시작/일시정지, `Esc` 리셋, `1~9` 분 설정 |
| 테마 선택 | Dark / Breeze / Ocean / Sunset |
| 상태 영속 (Chrome) | 팝업 닫아도 타이머 유지, 재오픈 시 복원 |
| 시스템 트레이 (Electron) | 닫기 → 트레이 최소화, 더블클릭 복원 |
| 최상단 고정 (Electron) | 트레이 메뉴에서 Always-on-top 토글 |
| 글로벌 단축키 (Electron) | `Ctrl+Shift+T` 어디서든 창 토글 |

---

## 프로젝트 구조

```
FlowTimer/
├── manifest.json              # Chrome 확장 설정 (Manifest V3)
├── shared/                    # Chrome·Electron 공유 코어
│   ├── js/
│   │   ├── constants.js       # 상수, 테마, 트랙 정의
│   │   ├── timer-core.js      # 타이머 엔진 (상태 머신)
│   │   ├── timer-ui.js        # UI 렌더링 + 인터랙션
│   │   └── audio-manager.js   # 오디오 재생 (플랫폼 분기)
│   ├── css/
│   │   └── timer.css          # 다크 테마 + 멀티 테마 변수
│   └── assets/
│       ├── music/             # 배경 음악 mp3 (5종)
│       └── sounds/            # 효과음 (finish.mp3)
├── chrome-extension/          # Chrome 확장 전용
│   ├── background.js          # Service Worker
│   ├── content-script.js      # 오버레이 위젯 (Shadow DOM)
│   ├── popup.html / popup.js  # 팝업 UI
│   ├── offscreen.html / .js   # Manifest V3 오디오 우회
│   ├── overlay.css            # 오버레이 스타일
│   └── icons/                 # 16·48·128px 아이콘
└── electron-app/              # Electron 데스크톱 앱 전용
    ├── main.js                # 메인 프로세스 (창·트레이·단축키)
    ├── preload.js             # contextBridge API 노출
    ├── renderer.js            # 렌더러 초기화
    ├── index.html             # 앱 진입점
    ├── setup-dev.js           # shared/ 심링크 생성 스크립트
    └── package.json           # 빌드 설정 (electron-builder)
```

---

## 실행 방법

### Chrome 확장프로그램

1. `chrome://extensions` 접속
2. **개발자 모드** 활성화
3. **압축 해제된 확장 프로그램 로드** 클릭
4. 이 레포 루트 폴더 선택
5. 툴바의 FlowTimer 아이콘 클릭

### Electron 데스크톱 앱

```bash
cd electron-app
node setup-dev.js   # shared/ 심링크 생성 (최초 1회)
npm install
npm start
```

#### 배포용 빌드 (Windows)

```bash
npm run dist:win       # NSIS 설치파일 (.exe)
npm run dist:portable  # 포터블 실행파일
```

---

## 아키텍처 요약

- **절대 시각 기반 타이머**: `endTime = Date.now() + duration` 방식으로 탭 백그라운드·Service Worker 재시작에도 정확한 잔여 시간 유지
- **Shadow DOM 오버레이** (Chrome): `closed` 모드로 호스트 페이지 스타일 완전 격리
- **Offscreen Document** (Chrome): Manifest V3의 Service Worker DOM 제약을 우회해 Web Audio API 사용
- **`_sourceId` 패턴**: `chrome.storage.onChanged`에서 자신의 변경과 외부 동기화 구분

---

## 라이선스

MIT
