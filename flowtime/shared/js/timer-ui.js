/**
 * FlowTimer — TimerUI (원형 타이머 위젯, 키보드 단축키)
 */
class TimerUI {
  constructor(container, timerCore, audioManager, options = {}) {
    this.container = container;
    this.timer = timerCore;
    this.audio = audioManager;
    this._selectedPreset = TIMER_CONSTANTS.DEFAULT_SECONDS;
    this._selectedTrack = '';
    this._isEditing = false;
    this._currentTheme = 'dark';
    // Shadow DOM 호환 옵션
    this._keyboardScope = options.keyboardScope || null;
    this._externalOnTick = options.onTick || null;
    this._externalOnStateChange = options.onStateChange || null;
    this._onMinimize = options.onMinimize || null;
    this._onPowerToggle = options.onPowerToggle || null;
    this._onThemeChange = options.onThemeChange || null;
    this._hidePowerButton = !!options.hidePowerButton;

    // SVG 프로그레스 링 상수
    this._RING_R = 138;
    this._RING_C = 2 * Math.PI * this._RING_R;

    // SVG 아이콘 문자열 (동적 업데이트용)
    this._PLAY_ICON = '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="8,4 20,12 8,20"/></svg>';
    this._PAUSE_ICON = '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>';
    this._RESET_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>';

    this._init();
  }

  _init() {
    this._buildDOM();
    this._bindEvents();
    this._bindKeyboard();
    this._updateDisplay();
  }

  _buildDOM() {
    this.container.innerHTML = `
      <div class="toolbar-area">
        <div class="toolbar">
          <button class="toolbar-btn" id="btn-music" title="배경 음악">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 18V5l12-2v13"/>
              <circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
            </svg>
          </button>
          <button class="toolbar-btn" id="btn-volume" title="볼륨">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
            </svg>
          </button>
          <button class="toolbar-btn" id="btn-theme" title="테마">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/>
              <circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/>
              <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>
              <circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/>
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
            </svg>
          </button>
          <button class="toolbar-btn" id="btn-power" title="타이머 끄기">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <path d="M18.36 6.64a9 9 0 1 1-12.73 0"/>
              <line x1="12" y1="2" x2="12" y2="12"/>
            </svg>
          </button>
          <button class="toolbar-btn" id="btn-minimize" title="최소화">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>

        <div class="music-dropdown" id="music-dropdown">
          <button class="music-dropdown__item active" data-track="">
            <span class="music-dropdown__icon">&#x1F507;</span> 없음
          </button>
          ${MUSIC_TRACKS.map(t =>
            `<button class="music-dropdown__item" data-track="${t.id}">
              <span class="music-dropdown__icon">${t.icon}</span> ${t.name}
            </button>`
          ).join('')}
        </div>

        <div class="theme-dropdown" id="theme-dropdown">
          ${THEMES.map(t => `
            <button class="theme-dropdown__item" data-theme="${t.id}">
              <span class="theme-dot" style="background:${t.previewColor}"></span>
              ${t.name}
            </button>`).join('')}
        </div>

        <div class="volume-popover" id="volume-popover">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
          </svg>
          <input type="range" class="volume-slider" id="volume-slider"
            min="0" max="100" value="50" />
          <span class="volume-value" id="volume-value">50%</span>
        </div>
      </div>

      <div class="timer-face-wrapper">
        <svg class="progress-ring" viewBox="0 0 300 300">
          <circle class="progress-ring__track" cx="150" cy="150" r="${this._RING_R}" />
          <circle class="progress-ring__fill" id="progress-ring-fill" cx="150" cy="150" r="${this._RING_R}"
            stroke-dasharray="${this._RING_C}" stroke-dashoffset="0" />
        </svg>
        <div class="timer-face">
          <div class="time-adjuster" id="time-adjuster">
            <button class="adjuster-btn" id="btn-dec">&minus;</button>
            <span class="adjuster-label">1분</span>
            <button class="adjuster-btn" id="btn-inc">+</button>
          </div>

          <div class="time-display" id="time-display">
            <div class="time-display__time" id="time-text">05:00</div>
          </div>

          <div class="time-edit" id="time-edit">
            <input type="number" class="time-edit__input" id="edit-min"
              min="0" max="90" value="5" />
            <span class="time-edit__sep">:</span>
            <input type="number" class="time-edit__input" id="edit-sec"
              min="0" max="59" value="00" />
          </div>

          <div class="controls">
            <button class="ctrl-btn ctrl-play" id="btn-toggle" title="Start">
              ${this._PLAY_ICON}
            </button>
            <button class="ctrl-btn ctrl-reset" id="btn-reset" title="Reset">
              ${this._RESET_ICON}
            </button>
          </div>
        </div>
      </div>
    `;

    // DOM 참조 캐싱
    this.$progressRing = this.container.querySelector('#progress-ring-fill');
    this.$time = this.container.querySelector('#time-text');
    this.$timeDisplay = this.container.querySelector('#time-display');
    this.$timeEdit = this.container.querySelector('#time-edit');
    this.$editMin = this.container.querySelector('#edit-min');
    this.$editSec = this.container.querySelector('#edit-sec');
    this.$btnToggle = this.container.querySelector('#btn-toggle');
    this.$btnReset = this.container.querySelector('#btn-reset');
    this.$btnMusic = this.container.querySelector('#btn-music');
    this.$btnVolume = this.container.querySelector('#btn-volume');
    this.$btnPower = this.container.querySelector('#btn-power');
    this.$btnMinimize = this.container.querySelector('#btn-minimize');
    this.$musicDropdown = this.container.querySelector('#music-dropdown');
    this.$volumePopover = this.container.querySelector('#volume-popover');
    this.$volumeSlider = this.container.querySelector('#volume-slider');
    this.$volumeValue = this.container.querySelector('#volume-value');
    this.$timeAdjuster = this.container.querySelector('#time-adjuster');
    this.$btnTheme = this.container.querySelector('#btn-theme');
    this.$themeDropdown = this.container.querySelector('#theme-dropdown');

    if (this._hidePowerButton && this.$btnPower) {
      this.$btnPower.style.display = 'none';
    }
  }

  _bindEvents() {
    // 시작/일시정지 토글
    this.$btnToggle.addEventListener('click', () => this._handleToggle());

    // 리셋
    this.$btnReset.addEventListener('click', () => this._handleReset());

    // 전원 토글
    this.$btnPower.addEventListener('click', () => {
      if (this._onPowerToggle) this._onPowerToggle();
    });

    // 최소화
    this.$btnMinimize.addEventListener('click', () => {
      if (this._onMinimize) this._onMinimize();
    });

    // 시간 조절 (±1분)
    this.container.querySelector('#btn-dec').addEventListener('click', () => this._handleAdjust(-60));
    this.container.querySelector('#btn-inc').addEventListener('click', () => this._handleAdjust(60));

    // 시간 표시 클릭 → 인라인 편집 모드
    this.$timeDisplay.addEventListener('click', () => {
      if (this.timer.state === TIMER_CONSTANTS.STATE.IDLE) {
        this._startEditing();
      }
    });

    // 편집 확정 (Enter / 포커스 벗어남)
    const confirmEdit = () => this._confirmEditing();
    this.$editMin.addEventListener('blur', () => {
      setTimeout(() => {
        const root = this.container.getRootNode();
        const active = root.activeElement || document.activeElement;
        if (active !== this.$editSec) confirmEdit();
      }, 50);
    });
    this.$editSec.addEventListener('blur', () => {
      setTimeout(() => {
        const root = this.container.getRootNode();
        const active = root.activeElement || document.activeElement;
        if (active !== this.$editMin) confirmEdit();
      }, 50);
    });
    this.$editMin.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') confirmEdit();
      if (e.key === 'Escape') this._cancelEditing();
    });
    this.$editSec.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') confirmEdit();
      if (e.key === 'Escape') this._cancelEditing();
    });

    // ── 테마 드롭다운 ──
    this.$btnTheme.addEventListener('click', (e) => {
      e.stopPropagation();
      this._closeMusic();
      this._closeVolume();
      this.$themeDropdown.classList.toggle('open');
      this.$btnTheme.classList.toggle('active', this.$themeDropdown.classList.contains('open'));
    });

    this.$themeDropdown.addEventListener('click', (e) => {
      const item = e.target.closest('.theme-dropdown__item');
      if (!item) return;
      this.applyTheme(item.dataset.theme);
      this._closeTheme();
    });

    // ── 음악 드롭다운 ──
    this.$btnMusic.addEventListener('click', (e) => {
      e.stopPropagation();
      this._closeVolume();
      this._closeTheme();
      this.$musicDropdown.classList.toggle('open');
      this.$btnMusic.classList.toggle('active', this.$musicDropdown.classList.contains('open'));
    });

    this.$musicDropdown.addEventListener('click', (e) => {
      const item = e.target.closest('.music-dropdown__item');
      if (!item) return;

      this.$musicDropdown.querySelectorAll('.music-dropdown__item').forEach(b => b.classList.remove('active'));
      item.classList.add('active');
      this._selectedTrack = item.dataset.track;

      if (this.audio) {
        this.audio.stopMusic();
        if (this._selectedTrack && this.timer.state === TIMER_CONSTANTS.STATE.RUNNING) {
          this.audio.playMusic(this._selectedTrack);
        }
      }

      this.$musicDropdown.classList.remove('open');
      this.$btnMusic.classList.remove('active');
    });

    // ── 볼륨 팝오버 ──
    this.$btnVolume.addEventListener('click', (e) => {
      e.stopPropagation();
      this._closeMusic();
      this._closeTheme();
      this.$volumePopover.classList.toggle('open');
      this.$btnVolume.classList.toggle('active', this.$volumePopover.classList.contains('open'));
    });

    this.$volumeSlider.addEventListener('input', (e) => {
      const vol = parseInt(e.target.value, 10);
      this.$volumeValue.textContent = vol + '%';
      if (this.audio) this.audio.setVolume(vol / 100);
    });

    // 팝오버/드롭다운 외부 클릭 닫기
    const root = this._keyboardScope || document;
    root.addEventListener('click', (e) => {
      if (!this.$btnMusic.contains(e.target) && !this.$musicDropdown.contains(e.target)) {
        this._closeMusic();
      }
      if (!this.$btnVolume.contains(e.target) && !this.$volumePopover.contains(e.target)) {
        this._closeVolume();
      }
      if (!this.$btnTheme.contains(e.target) && !this.$themeDropdown.contains(e.target)) {
        this._closeTheme();
      }
    });

    // 타이머 콜백
    this.timer.onTick((remainingMs, progress, isNewSecond) => {
      this._renderProgress(progress);
      this.$time.textContent = this.timer.getFormattedTime();
      this._updateColorPhase();

      if (this._externalOnTick) {
        this._externalOnTick(remainingMs, progress, this.timer.getFormattedTime(), this.timer.getColorPhase());
      }

      if (isNewSecond && this.audio) {
        const sec = Math.ceil(remainingMs / 1000);
        if (sec <= TIMER_CONSTANTS.ALERT_TICK_SECONDS && sec > 0) {
          this.audio.playSound('tick');
        }
      }
    });

    this.timer.onStateChange((state) => {
      this._updateControls(state);

      if (this._externalOnStateChange) {
        this._externalOnStateChange(state);
      }

      if (this.audio) {
        if (state === TIMER_CONSTANTS.STATE.RUNNING) {
          if (this._selectedTrack) {
            if (this.audio.getCurrentTrack() === this._selectedTrack) {
              this.audio.resumeMusic();
            } else {
              this.audio.playMusic(this._selectedTrack);
            }
          }
        } else {
          if (state === TIMER_CONSTANTS.STATE.PAUSED) {
            this.audio.pauseMusic();
          } else {
            this.audio.stopMusic();
          }
        }
      }
    });

    this.timer.onFinish(() => {
      this._onFinish();
    });
  }

  _closeMusic() {
    this.$musicDropdown.classList.remove('open');
    this.$btnMusic.classList.remove('active');
  }

  _closeVolume() {
    this.$volumePopover.classList.remove('open');
    this.$btnVolume.classList.remove('active');
  }

  _closeTheme() {
    this.$themeDropdown.classList.remove('open');
    this.$btnTheme.classList.remove('active');
  }

  applyTheme(themeId) {
    const theme = THEMES.find(t => t.id === themeId);
    if (!theme) return;
    this._currentTheme = themeId;

    const root = this.container.getRootNode();
    const target = (root instanceof ShadowRoot) ? root.host : document.documentElement;
    Object.entries(theme.vars).forEach(([k, v]) => target.style.setProperty(k, v));

    this.$themeDropdown.querySelectorAll('.theme-dropdown__item').forEach(b => {
      b.classList.toggle('active', b.dataset.theme === themeId);
    });

    if (this._onThemeChange) this._onThemeChange(themeId);
  }

  _bindKeyboard() {
    const scope = this._keyboardScope || document;
    scope.addEventListener('keydown', (e) => {
      if (this._isEditing) return;
      if (e.target.tagName === 'INPUT') return;

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        e.stopPropagation();
        this._handleToggle();
      } else if (e.key === 'Escape') {
        e.stopPropagation();
        this._handleReset();
      } else if (TIMER_CONSTANTS.KEY_MAP[e.key] !== undefined) {
        e.stopPropagation();
        const seconds = TIMER_CONSTANTS.KEY_MAP[e.key];
        this._setPreset(seconds);
      }
    });
  }

  // ── 인라인 시간 편집 ──

  _startEditing() {
    if (this._isEditing) return;
    this._isEditing = true;
    const totalSec = this.timer.totalDuration;
    this.$editMin.value = Math.floor(totalSec / 60);
    this.$editSec.value = String(totalSec % 60).padStart(2, '0');
    this.$timeDisplay.classList.add('hidden');
    this.$timeEdit.classList.add('visible');
    this.$editMin.focus();
    this.$editMin.select();
  }

  _confirmEditing() {
    if (!this._isEditing) return;
    this._isEditing = false;
    const min = parseInt(this.$editMin.value, 10) || 0;
    const sec = parseInt(this.$editSec.value, 10) || 0;
    const total = min * 60 + sec;
    this.$timeDisplay.classList.remove('hidden');
    this.$timeEdit.classList.remove('visible');
    if (total > 0) this._setPreset(total);
  }

  _cancelEditing() {
    if (!this._isEditing) return;
    this._isEditing = false;
    this.$timeDisplay.classList.remove('hidden');
    this.$timeEdit.classList.remove('visible');
  }

  // ── 핸들러 ──

  _handleToggle() {
    const state = this.timer.state;
    if (state === TIMER_CONSTANTS.STATE.FINISHED) {
      this._handleReset();
      return;
    }
    if (state === TIMER_CONSTANTS.STATE.IDLE) {
      if (this.audio) this.audio.playSound('start');
    }
    this.timer.toggle();
  }

  _handleReset() {
    this.timer.reset();
    if (this.audio) this.audio.stopMusic();
    this._renderProgress(0);
    this._updateDisplay();
    this._updateColorPhase();
  }

  _handleAdjust(delta) {
    if (this.timer.state !== TIMER_CONSTANTS.STATE.IDLE) return;
    const newDuration = this.timer.totalDuration + delta;
    if (newDuration < 60 || newDuration > TIMER_CONSTANTS.MAX_SECONDS) return;
    this.timer.setDuration(newDuration);
    this._selectedPreset = newDuration;
    this._updateDisplay();
  }

  _setPreset(seconds) {
    if (this.timer.state === TIMER_CONSTANTS.STATE.RUNNING ||
        this.timer.state === TIMER_CONSTANTS.STATE.PAUSED) {
      this._handleReset();
    }
    this.timer.setDuration(seconds);
    this._selectedPreset = seconds;
    this._updateDisplay();
  }

  _renderProgress(progress) {
    this.$progressRing.style.strokeDashoffset = this._RING_C * progress;
  }

  _updateColorPhase() {
    const phase = this.timer.getColorPhase();
    this.$progressRing.classList.remove('warning', 'danger');
    if (phase === 'warning') this.$progressRing.classList.add('warning');
    if (phase === 'danger') this.$progressRing.classList.add('danger');
  }

  _updateDisplay() {
    this.$time.textContent = this.timer.getFormattedTime();
  }

  _updateControls(state) {
    switch (state) {
      case TIMER_CONSTANTS.STATE.IDLE:
        this.$btnToggle.innerHTML = this._PLAY_ICON;
        this.$btnToggle.title = 'Start';
        this.$timeAdjuster.classList.remove('hidden');
        break;
      case TIMER_CONSTANTS.STATE.RUNNING:
        this.$btnToggle.innerHTML = this._PAUSE_ICON;
        this.$btnToggle.title = 'Pause';
        this.$timeAdjuster.classList.add('hidden');
        break;
      case TIMER_CONSTANTS.STATE.PAUSED:
        this.$btnToggle.innerHTML = this._PLAY_ICON;
        this.$btnToggle.title = 'Resume';
        this.$timeAdjuster.classList.add('hidden');
        break;
      case TIMER_CONSTANTS.STATE.FINISHED:
        this.$btnToggle.innerHTML = this._RESET_ICON;
        this.$btnToggle.title = 'Restart';
        this.$timeAdjuster.classList.add('hidden');
        break;
    }
  }

  _onFinish() {
    if (this.audio) this.audio.playSound('finish');
  }

  /** 외부에서 상태 복원 후 UI 동기화 */
  syncFromTimer() {
    this._renderProgress(this.timer.getProgress());
    this._updateDisplay();
    this._updateControls(this.timer.state);
    this._updateColorPhase();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TimerUI };
}
