const { TIMER_CONSTANTS } = require('../shared/js/constants');
const { TimerCore } = require('../shared/js/timer-core');

describe('TimerCore — 초기 상태', () => {
  let timer;

  beforeEach(() => {
    timer = new TimerCore();
  });

  test('초기 상태는 IDLE', () => {
    expect(timer.state).toBe(TIMER_CONSTANTS.STATE.IDLE);
  });

  test('기본 duration은 DEFAULT_SECONDS', () => {
    expect(timer.totalDuration).toBe(TIMER_CONSTANTS.DEFAULT_SECONDS);
  });

  test('endTime과 remainingMs가 null', () => {
    expect(timer.endTime).toBeNull();
    expect(timer.remainingMs).toBeNull();
  });
});

describe('TimerCore — setDuration', () => {
  let timer;

  beforeEach(() => {
    timer = new TimerCore();
  });

  test('정상 범위 내 값 설정', () => {
    timer.setDuration(600);
    expect(timer.totalDuration).toBe(600);
  });

  test('최솟값 미만은 MIN_SECONDS로 클램핑', () => {
    timer.setDuration(5);
    expect(timer.totalDuration).toBe(TIMER_CONSTANTS.MIN_SECONDS);
  });

  test('최댓값 초과는 MAX_SECONDS로 클램핑', () => {
    timer.setDuration(99999);
    expect(timer.totalDuration).toBe(TIMER_CONSTANTS.MAX_SECONDS);
  });

  test('3초 테스트 예외 허용', () => {
    timer.setDuration(3);
    expect(timer.totalDuration).toBe(3);
  });

  test('RUNNING 상태에서는 변경 불가', () => {
    timer.setDuration(600);
    timer.start();
    timer.setDuration(120);
    expect(timer.totalDuration).toBe(600);
    timer.pause();
  });
});

describe('TimerCore — 상태 전이', () => {
  let timer;
  let stateChanges;

  beforeEach(() => {
    timer = new TimerCore();
    stateChanges = [];
    timer.onStateChange((state) => stateChanges.push(state));
  });

  afterEach(() => {
    timer.reset();
  });

  test('start → RUNNING', () => {
    timer.start();
    expect(timer.state).toBe(TIMER_CONSTANTS.STATE.RUNNING);
    expect(stateChanges).toContain('running');
  });

  test('pause → PAUSED', () => {
    timer.start();
    timer.pause();
    expect(timer.state).toBe(TIMER_CONSTANTS.STATE.PAUSED);
    expect(stateChanges).toContain('paused');
  });

  test('resume → RUNNING (from PAUSED)', () => {
    timer.start();
    timer.pause();
    timer.resume();
    expect(timer.state).toBe(TIMER_CONSTANTS.STATE.RUNNING);
  });

  test('resume은 IDLE에서 무시됨', () => {
    timer.resume();
    expect(timer.state).toBe(TIMER_CONSTANTS.STATE.IDLE);
  });

  test('pause는 IDLE에서 무시됨', () => {
    timer.pause();
    expect(timer.state).toBe(TIMER_CONSTANTS.STATE.IDLE);
  });

  test('이미 RUNNING일 때 start 중복 호출 무시', () => {
    timer.start();
    const endTime = timer.endTime;
    timer.start();
    expect(timer.endTime).toBe(endTime);
  });

  test('reset → IDLE', () => {
    timer.start();
    timer.reset();
    expect(timer.state).toBe(TIMER_CONSTANTS.STATE.IDLE);
    expect(timer.endTime).toBeNull();
    expect(timer.remainingMs).toBeNull();
  });
});

describe('TimerCore — toggle', () => {
  let timer;

  beforeEach(() => {
    timer = new TimerCore();
  });

  afterEach(() => {
    timer.reset();
  });

  test('IDLE → toggle → RUNNING', () => {
    timer.toggle();
    expect(timer.state).toBe(TIMER_CONSTANTS.STATE.RUNNING);
  });

  test('RUNNING → toggle → PAUSED', () => {
    timer.toggle();
    timer.toggle();
    expect(timer.state).toBe(TIMER_CONSTANTS.STATE.PAUSED);
  });

  test('PAUSED → toggle → RUNNING', () => {
    timer.toggle();
    timer.toggle();
    timer.toggle();
    expect(timer.state).toBe(TIMER_CONSTANTS.STATE.RUNNING);
  });
});

describe('TimerCore — getRemainingMs', () => {
  let timer;

  beforeEach(() => {
    timer = new TimerCore();
  });

  afterEach(() => {
    timer.reset();
  });

  test('IDLE 상태에서 totalDuration * 1000 반환', () => {
    timer.setDuration(600);
    expect(timer.getRemainingMs()).toBe(600000);
  });

  test('RUNNING 상태에서 양수 반환', () => {
    timer.setDuration(600);
    timer.start();
    const remaining = timer.getRemainingMs();
    expect(remaining).toBeGreaterThan(0);
    expect(remaining).toBeLessThanOrEqual(600000);
  });

  test('PAUSED 상태에서 일정한 값 반환', () => {
    timer.setDuration(600);
    timer.start();
    timer.pause();
    const r1 = timer.getRemainingMs();
    const r2 = timer.getRemainingMs();
    expect(r1).toBe(r2);
  });
});

describe('TimerCore — getProgress', () => {
  let timer;

  beforeEach(() => {
    timer = new TimerCore();
  });

  test('IDLE 상태에서 0', () => {
    expect(timer.getProgress()).toBe(0);
  });

  test('RUNNING 상태에서 0~1 사이', () => {
    timer.start();
    const progress = timer.getProgress();
    expect(progress).toBeGreaterThanOrEqual(0);
    expect(progress).toBeLessThanOrEqual(1);
    timer.reset();
  });
});

describe('TimerCore — getFormattedTime', () => {
  let timer;

  beforeEach(() => {
    timer = new TimerCore();
  });

  test('기본 5분 = "05:00"', () => {
    expect(timer.getFormattedTime()).toBe('05:00');
  });

  test('90분 = "90:00"', () => {
    timer.setDuration(5400);
    expect(timer.getFormattedTime()).toBe('90:00');
  });

  test('30초 = "00:30"', () => {
    timer.setDuration(30);
    expect(timer.getFormattedTime()).toBe('00:30');
  });

  test('mm:ss 형식 검증', () => {
    expect(timer.getFormattedTime()).toMatch(/^\d{2,}:\d{2}$/);
  });
});

describe('TimerCore — getColorPhase', () => {
  let timer;

  beforeEach(() => {
    timer = new TimerCore();
  });

  test('IDLE (100% 남음) → normal', () => {
    expect(timer.getColorPhase()).toBe('normal');
  });

  test('값이 normal/warning/danger 중 하나', () => {
    expect(['normal', 'warning', 'danger']).toContain(timer.getColorPhase());
  });
});

describe('TimerCore — serialize / deserialize', () => {
  let timer;

  beforeEach(() => {
    timer = new TimerCore();
  });

  afterEach(() => {
    timer.reset();
  });

  test('serialize가 필수 필드 포함', () => {
    const data = timer.serialize();
    expect(data).toHaveProperty('state');
    expect(data).toHaveProperty('totalDuration');
    expect(data).toHaveProperty('endTime');
    expect(data).toHaveProperty('remainingMs');
  });

  test('IDLE 상태 직렬화/역직렬화 복원', () => {
    timer.setDuration(600);
    const data = timer.serialize();

    const timer2 = new TimerCore();
    timer2.deserialize(data);
    expect(timer2.state).toBe(TIMER_CONSTANTS.STATE.IDLE);
    expect(timer2.totalDuration).toBe(600);
  });

  test('PAUSED 상태 직렬화/역직렬화 복원', () => {
    timer.setDuration(600);
    timer.start();
    timer.pause();
    const data = timer.serialize();

    const timer2 = new TimerCore();
    timer2.deserialize(data);
    expect(timer2.state).toBe(TIMER_CONSTANTS.STATE.PAUSED);
    expect(timer2.remainingMs).toBe(data.remainingMs);
  });

  test('만료된 RUNNING 상태 역직렬화 → FINISHED', () => {
    const data = {
      state: TIMER_CONSTANTS.STATE.RUNNING,
      totalDuration: 300,
      endTime: Date.now() - 1000, // 이미 만료
      remainingMs: null,
    };

    const finishFn = jest.fn();
    timer.onFinish(finishFn);
    timer.deserialize(data);
    expect(timer.state).toBe(TIMER_CONSTANTS.STATE.FINISHED);
    expect(finishFn).toHaveBeenCalled();
  });

  test('null 데이터 역직렬화 시 무시', () => {
    timer.deserialize(null);
    expect(timer.state).toBe(TIMER_CONSTANTS.STATE.IDLE);
  });
});

describe('TimerCore — 콜백 등록', () => {
  test('onTick 콜백 등록', () => {
    const timer = new TimerCore();
    const fn = jest.fn();
    timer.onTick(fn);
    expect(timer._onTick).toBe(fn);
  });

  test('onStateChange 콜백 등록', () => {
    const timer = new TimerCore();
    const fn = jest.fn();
    timer.onStateChange(fn);
    expect(timer._onStateChange).toBe(fn);
  });

  test('onFinish 콜백 등록', () => {
    const timer = new TimerCore();
    const fn = jest.fn();
    timer.onFinish(fn);
    expect(timer._onFinish).toBe(fn);
  });
});
