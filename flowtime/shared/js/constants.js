/**
 * FlowTimer — Shared Constants
 */

const TIMER_CONSTANTS = {
  MIN_SECONDS: 30,
  MAX_SECONDS: 5400, // 90분
  DEFAULT_SECONDS: 300, // 5분

  // 프리셋 (분 단위)
  PRESETS: [1, 2, 3, 5, 10, 15, 20, 25, 30, 45, 60, 90],

  // SVG 원형 프로그레스바
  CIRCLE_RADIUS: 90,
  CIRCLE_CIRCUMFERENCE: 2 * Math.PI * 90, // ≈ 565.49

  // 색상 임계값
  THRESHOLD_WARNING: 0.3,  // 30% 이하 → 주황
  THRESHOLD_DANGER: 0.1,   // 10% 이하 → 빨강

  // 색상
  COLORS: {
    NORMAL: '#7c5cfc',     // 보라 (기본)
    WARNING: '#f5a623',    // 주황 (30% 이하)
    DANGER: '#e74c3c',     // 빨강 (10% 이하)
    TRACK: '#2a2a3e',      // 트랙 (배경 원)
    BG_DARK: '#1a1a2e',    // 배경
    TEXT: '#ffffff',        // 텍스트
    TEXT_DIM: '#8888aa',   // 보조 텍스트
  },

  // 알림음 타이밍
  ALERT_TICK_SECONDS: 5,   // 종료 5초 전 틱 시작

  // 타이머 상태
  STATE: {
    IDLE: 'idle',
    RUNNING: 'running',
    PAUSED: 'paused',
    FINISHED: 'finished',
  },

  // 키보드 단축키 매핑
  KEY_MAP: {
    '1': 60,    // 1분
    '2': 120,   // 2분
    '3': 180,   // 3분
    '4': 240,   // 4분
    '5': 300,   // 5분
    '6': 360,   // 6분
    '7': 420,   // 7분
    '8': 480,   // 8분
    '9': 540,   // 9분
    '0': 3,     // 3초 (테스트용)
  },
};

// 배경 음악 목록
const MUSIC_TRACKS = [
  { id: 'focus', name: '집중', icon: '\u{1F9D8}', file: 'focus.mp3' },
  { id: 'dramatic', name: '극적', icon: '\u{1F3AC}', file: 'dramatic.mp3' },
  { id: 'upbeat', name: '경쾌', icon: '\u{2600}\uFE0F', file: 'upbeat.mp3' },
  { id: 'energetic', name: '활기', icon: '\u{26A1}', file: 'energetic.mp3' },
  { id: 'lofi', name: '로파이', icon: '\u{1F3B5}', file: 'lofi.mp3' },
];

// 테마 목록
const THEMES = [
  {
    id: 'dark',
    name: '다크',
    previewColor: '#7c5cfc',
    vars: {
      '--color-bg': '#0d0d0d', '--color-surface': '#1a1a1a', '--color-surface-hover': '#252525',
      '--color-primary': '#7c5cfc', '--color-primary-glow': 'rgba(124,92,252,0.3)',
      '--color-track': '#2a2a2a', '--color-text': '#ffffff',
      '--color-text-dim': '#888888', '--color-text-muted': '#555555',
    },
  },
  {
    id: 'breeze',
    name: '브리즈',
    previewColor: '#6c47e8',
    vars: {
      '--color-bg': '#f4f4f8', '--color-surface': '#ffffff', '--color-surface-hover': '#eaeaf0',
      '--color-primary': '#6c47e8', '--color-primary-glow': 'rgba(108,71,232,0.2)',
      '--color-track': '#d8d8e8', '--color-text': '#1a1a2e',
      '--color-text-dim': '#666688', '--color-text-muted': '#aaaacc',
    },
  },
  {
    id: 'ocean',
    name: '오션',
    previewColor: '#00b4d8',
    vars: {
      '--color-bg': '#0d1b2a', '--color-surface': '#102436', '--color-surface-hover': '#162f44',
      '--color-primary': '#00b4d8', '--color-primary-glow': 'rgba(0,180,216,0.3)',
      '--color-track': '#1a3048', '--color-text': '#caf0f8',
      '--color-text-dim': '#6bb8cc', '--color-text-muted': '#3d7a8c',
    },
  },
  {
    id: 'sunset',
    name: '선셋',
    previewColor: '#ff6b35',
    vars: {
      '--color-bg': '#1e1410', '--color-surface': '#2d1f18', '--color-surface-hover': '#3a2820',
      '--color-primary': '#ff6b35', '--color-primary-glow': 'rgba(255,107,53,0.3)',
      '--color-track': '#3a2820', '--color-text': '#ffe8e0',
      '--color-text-dim': '#cc9988', '--color-text-muted': '#775544',
    },
  },
];

// 알림음 목록
const SOUND_EFFECTS = {
  start: 'start.mp3',
  tick: 'tick.mp3',
  finish: 'finish.mp3',
};

// 플랫폼 감지
const PLATFORM = (() => {
  // Electron: preload에서 electronAPI 노출됨
  if (typeof window !== 'undefined' && window.electronAPI) {
    return 'electron';
  }
  // Chrome 확장: chrome.runtime.id 존재
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
    return 'chrome';
  }
  return 'web';
})();

// ES Module / script 호환
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TIMER_CONSTANTS, MUSIC_TRACKS, SOUND_EFFECTS, THEMES, PLATFORM };
}
