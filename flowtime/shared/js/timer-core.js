/**
 * FlowTimer — TimerCore (절대 시각 기반 카운트다운 엔진)
 */
class TimerCore {
  constructor() {
    this.state = TIMER_CONSTANTS.STATE.IDLE;
    this.totalDuration = TIMER_CONSTANTS.DEFAULT_SECONDS;
    this.endTime = null;        // 절대 종료 시각 (ms)
    this.remainingMs = null;    // 일시정지 시 남은 밀리초
    this._onTick = null;
    this._onStateChange = null;
    this._onFinish = null;
    this._rafId = null;
    this._lastTickSecond = -1;
  }

  /** 콜백 등록 */
  onTick(cb) { this._onTick = cb; }
  onStateChange(cb) { this._onStateChange = cb; }
  onFinish(cb) { this._onFinish = cb; }

  /** 타이머 시간 설정 (초) */
  setDuration(seconds) {
    if (this.state !== TIMER_CONSTANTS.STATE.IDLE) return;
    this.totalDuration = Math.max(
      TIMER_CONSTANTS.MIN_SECONDS,
      Math.min(TIMER_CONSTANTS.MAX_SECONDS, seconds)
    );
    // 3초 테스트는 예외 허용
    if (seconds === 3) this.totalDuration = 3;
  }

  /** 시작 */
  start() {
    if (this.state === TIMER_CONSTANTS.STATE.RUNNING) return;

    if (this.state === TIMER_CONSTANTS.STATE.PAUSED && this.remainingMs != null) {
      // 일시정지 → 재개
      this.endTime = Date.now() + this.remainingMs;
      this.remainingMs = null;
    } else {
      // 신규 시작
      this.endTime = Date.now() + this.totalDuration * 1000;
    }

    this.state = TIMER_CONSTANTS.STATE.RUNNING;
    this._emitStateChange();
    this._lastTickSecond = -1;
    this._loop();
  }

  /** 일시정지 */
  pause() {
    if (this.state !== TIMER_CONSTANTS.STATE.RUNNING) return;
    this.remainingMs = Math.max(0, this.endTime - Date.now());
    this.endTime = null;
    this.state = TIMER_CONSTANTS.STATE.PAUSED;
    this._cancelLoop();
    this._emitStateChange();
  }

  /** 재개 */
  resume() {
    if (this.state !== TIMER_CONSTANTS.STATE.PAUSED) return;
    this.start();
  }

  /** 시작/일시정지 토글 */
  toggle() {
    switch (this.state) {
      case TIMER_CONSTANTS.STATE.IDLE:
      case TIMER_CONSTANTS.STATE.FINISHED:
        this.reset();
        this.start();
        break;
      case TIMER_CONSTANTS.STATE.RUNNING:
        this.pause();
        break;
      case TIMER_CONSTANTS.STATE.PAUSED:
        this.resume();
        break;
    }
  }

  /** 리셋 */
  reset() {
    this._cancelLoop();
    this.state = TIMER_CONSTANTS.STATE.IDLE;
    this.endTime = null;
    this.remainingMs = null;
    this._lastTickSecond = -1;
    this._emitStateChange();
  }

  /** 남은 시간 (밀리초) */
  getRemainingMs() {
    if (this.state === TIMER_CONSTANTS.STATE.IDLE || this.state === TIMER_CONSTANTS.STATE.FINISHED) {
      return this.state === TIMER_CONSTANTS.STATE.IDLE ? this.totalDuration * 1000 : 0;
    }
    if (this.state === TIMER_CONSTANTS.STATE.PAUSED) {
      return this.remainingMs || 0;
    }
    return Math.max(0, this.endTime - Date.now());
  }

  /** 진행률 0~1 */
  getProgress() {
    const total = this.totalDuration * 1000;
    if (total === 0) return 0;
    const remaining = this.getRemainingMs();
    return 1 - remaining / total;
  }

  /** 남은 시간 mm:ss 포맷 */
  getFormattedTime() {
    const totalSec = Math.ceil(this.getRemainingMs() / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }

  /** 현재 색상 단계 */
  getColorPhase() {
    const ratio = 1 - this.getProgress(); // 남은 비율
    if (ratio <= TIMER_CONSTANTS.THRESHOLD_DANGER) return 'danger';
    if (ratio <= TIMER_CONSTANTS.THRESHOLD_WARNING) return 'warning';
    return 'normal';
  }

  /** 직렬화 (chrome.storage용) */
  serialize() {
    return {
      state: this.state,
      totalDuration: this.totalDuration,
      endTime: this.endTime,
      remainingMs: this.remainingMs,
    };
  }

  /** 역직렬화 복원 */
  deserialize(data) {
    if (!data) return;
    // 기존 루프가 있으면 먼저 취소 (중복 루프 방지)
    this._cancelLoop();
    this.totalDuration = data.totalDuration || TIMER_CONSTANTS.DEFAULT_SECONDS;
    this.state = data.state || TIMER_CONSTANTS.STATE.IDLE;
    this.endTime = data.endTime || null;
    this.remainingMs = data.remainingMs || null;

    if (this.state === TIMER_CONSTANTS.STATE.RUNNING) {
      if (this.endTime && Date.now() >= this.endTime) {
        // 팝업 닫힌 사이에 종료됨
        this.state = TIMER_CONSTANTS.STATE.FINISHED;
        this._emitStateChange();
        if (this._onFinish) this._onFinish();
      } else {
        // 아직 실행 중 → 루프 재시작
        this._loop();
        this._emitStateChange();
      }
    } else {
      this._emitStateChange();
    }
  }

  /** 내부: 렌더 루프 */
  _loop() {
    const tick = () => {
      const remaining = this.getRemainingMs();

      if (remaining <= 0) {
        this.state = TIMER_CONSTANTS.STATE.FINISHED;
        this._emitStateChange();
        if (this._onTick) this._onTick(0, 1);
        if (this._onFinish) this._onFinish();
        return;
      }

      const currentSecond = Math.ceil(remaining / 1000);
      if (this._onTick) {
        this._onTick(remaining, this.getProgress(), currentSecond !== this._lastTickSecond);
      }
      this._lastTickSecond = currentSecond;

      this._rafId = requestAnimationFrame(tick);
    };
    this._rafId = requestAnimationFrame(tick);
  }

  /** 내부: 루프 취소 */
  _cancelLoop() {
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  /** 내부: 상태 변경 알림 */
  _emitStateChange() {
    if (this._onStateChange) {
      this._onStateChange(this.state);
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TimerCore };
}
