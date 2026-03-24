const { TIMER_CONSTANTS, MUSIC_TRACKS, SOUND_EFFECTS, THEMES } = require('../shared/js/constants');

describe('TIMER_CONSTANTS', () => {
  test('기본값이 올바르게 설정됨', () => {
    expect(TIMER_CONSTANTS.MIN_SECONDS).toBe(30);
    expect(TIMER_CONSTANTS.MAX_SECONDS).toBe(5400);
    expect(TIMER_CONSTANTS.DEFAULT_SECONDS).toBe(300);
  });

  test('프리셋이 오름차순 정렬됨', () => {
    const presets = TIMER_CONSTANTS.PRESETS;
    for (let i = 1; i < presets.length; i++) {
      expect(presets[i]).toBeGreaterThan(presets[i - 1]);
    }
  });

  test('프리셋이 모두 양수', () => {
    TIMER_CONSTANTS.PRESETS.forEach(p => {
      expect(p).toBeGreaterThan(0);
    });
  });

  test('임계값이 0~1 범위', () => {
    expect(TIMER_CONSTANTS.THRESHOLD_WARNING).toBeGreaterThan(0);
    expect(TIMER_CONSTANTS.THRESHOLD_WARNING).toBeLessThanOrEqual(1);
    expect(TIMER_CONSTANTS.THRESHOLD_DANGER).toBeGreaterThan(0);
    expect(TIMER_CONSTANTS.THRESHOLD_DANGER).toBeLessThanOrEqual(1);
    expect(TIMER_CONSTANTS.THRESHOLD_DANGER).toBeLessThan(TIMER_CONSTANTS.THRESHOLD_WARNING);
  });

  test('상태 enum이 4가지 존재', () => {
    const states = TIMER_CONSTANTS.STATE;
    expect(states.IDLE).toBe('idle');
    expect(states.RUNNING).toBe('running');
    expect(states.PAUSED).toBe('paused');
    expect(states.FINISHED).toBe('finished');
    expect(Object.keys(states)).toHaveLength(4);
  });

  test('KEY_MAP의 모든 값이 양수', () => {
    Object.values(TIMER_CONSTANTS.KEY_MAP).forEach(sec => {
      expect(sec).toBeGreaterThan(0);
    });
  });

  test('CIRCLE_CIRCUMFERENCE가 2*PI*R과 일치', () => {
    const expected = 2 * Math.PI * TIMER_CONSTANTS.CIRCLE_RADIUS;
    expect(TIMER_CONSTANTS.CIRCLE_CIRCUMFERENCE).toBeCloseTo(expected, 2);
  });
});

describe('MUSIC_TRACKS', () => {
  test('트랙이 1개 이상 존재', () => {
    expect(MUSIC_TRACKS.length).toBeGreaterThan(0);
  });

  test('각 트랙에 필수 필드가 존재', () => {
    MUSIC_TRACKS.forEach(track => {
      expect(track).toHaveProperty('id');
      expect(track).toHaveProperty('name');
      expect(track).toHaveProperty('file');
      expect(track.file).toMatch(/\.mp3$/);
    });
  });

  test('트랙 id가 고유함', () => {
    const ids = MUSIC_TRACKS.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('THEMES', () => {
  test('테마가 1개 이상 존재', () => {
    expect(THEMES.length).toBeGreaterThan(0);
  });

  test('각 테마에 필수 CSS 변수가 존재', () => {
    const requiredVars = [
      '--color-bg', '--color-surface', '--color-primary',
      '--color-track', '--color-text', '--color-text-dim',
    ];
    THEMES.forEach(theme => {
      expect(theme).toHaveProperty('id');
      expect(theme).toHaveProperty('name');
      expect(theme).toHaveProperty('vars');
      requiredVars.forEach(v => {
        expect(theme.vars).toHaveProperty(v);
      });
    });
  });

  test('테마 id가 고유함', () => {
    const ids = THEMES.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('SOUND_EFFECTS', () => {
  test('필수 알림음이 존재', () => {
    expect(SOUND_EFFECTS).toHaveProperty('start');
    expect(SOUND_EFFECTS).toHaveProperty('tick');
    expect(SOUND_EFFECTS).toHaveProperty('finish');
  });

  test('모든 파일이 mp3 형식', () => {
    Object.values(SOUND_EFFECTS).forEach(file => {
      expect(file).toMatch(/\.mp3$/);
    });
  });
});
