/**
 * FlowTimer — Content Script (오버레이 위젯)
 * timerEnabled 플래그에 따라 활성화/비활성화
 * OFF일 때는 DOM/루프/인터벌 전혀 생성하지 않음
 */
(() => {
  let initialized = false;
  let cleanupFn = null;

  // ── timerEnabled 확인 후 조건부 활성화 ──
  chrome.storage.local.get(['timerEnabled'], (result) => {
    if (result.timerEnabled) activate();
  });

  // ── timerEnabled 변경 감지 (이 리스너는 항상 유지) ──
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes.timerEnabled) return;
    if (changes.timerEnabled.newValue) activate();
    else deactivate();
  });

  function deactivate() {
    if (!initialized) return;
    if (cleanupFn) cleanupFn();
    initialized = false;
    cleanupFn = null;
  }

  function activate() {
    if (initialized) return;
    initialized = true;

    // 이전 버전 호스트가 남아있으면 제거 (확장 리로드 대응)
    const existingHost = document.getElementById('__flowtimer-host__');
    if (existingHost) existingHost.remove();

    const INSTANCE_ID = 'cs_' + Math.random().toString(36).slice(2, 10);

    // ── 1. Shadow DOM 호스트 생성 ──
    const host = document.createElement('div');
    host.id = '__flowtimer-host__';
    Object.assign(host.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: '2147483647',
      fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
      lineHeight: '1.4',
      margin: '0',
      padding: '0',
      border: 'none',
      background: 'none',
    });
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: 'closed' });

    // ── 2. 스타일 로드 ──
    const timerCSS = document.createElement('link');
    timerCSS.rel = 'stylesheet';
    timerCSS.href = chrome.runtime.getURL('shared/css/timer.css');
    shadow.appendChild(timerCSS);

    const overlayCSS = document.createElement('link');
    overlayCSS.rel = 'stylesheet';
    overlayCSS.href = chrome.runtime.getURL('chrome-extension/overlay.css');
    shadow.appendChild(overlayCSS);

    // ── 3. 축소 위젯 DOM ──
    const MINI_R = 23;
    const MINI_C = 2 * Math.PI * MINI_R;

    const collapsed = document.createElement('div');
    collapsed.className = 'overlay-collapsed';
    collapsed.innerHTML = `
      <svg class="mini-ring" viewBox="0 0 52 52">
        <circle class="mini-ring__track" cx="26" cy="26" r="${MINI_R}" />
        <circle class="mini-ring__progress" cx="26" cy="26" r="${MINI_R}"
          stroke-dasharray="${MINI_C}" stroke-dashoffset="0" />
      </svg>
      <span class="mini-time">05:00</span>
    `;
    shadow.appendChild(collapsed);

    const $miniProgress = collapsed.querySelector('.mini-ring__progress');
    const $miniTime = collapsed.querySelector('.mini-time');

    // ── 4. 펼침 패널 DOM ──
    const expanded = document.createElement('div');
    expanded.className = 'overlay-expanded';
    expanded.innerHTML = `<div class="timer-container" id="timer-container"></div>`;
    shadow.appendChild(expanded);

    const $timerContainer = expanded.querySelector('#timer-container');

    // ── 5. 상태 ──
    let isExpanded = false;
    let _syncing = false;

    function expand() {
      isExpanded = true;
      collapsed.classList.add('hidden');
      expanded.classList.add('visible');
    }

    function collapse() {
      isExpanded = false;
      expanded.classList.remove('visible');
      collapsed.classList.remove('hidden');
      updateMiniWidget();
    }

    // ── 이벤트 리스너 (정리를 위해 추적) ──
    let clickAllowed = true;
    const onCollapsedClick = () => { if (clickAllowed) expand(); };
    collapsed.addEventListener('click', onCollapsedClick);

    const onDocMousedown = (e) => {
      if (!isExpanded) return;
      if (host.contains(e.target)) return;
      collapse();
    };
    document.addEventListener('mousedown', onDocMousedown);

    // ── 6. 드래그 이동 ──
    let isDragging = false;
    let dragStartX, dragStartY, hostStartX, hostStartY;

    function bindToolbarDrag() {
      const toolbar = $timerContainer.querySelector('.toolbar');
      if (!toolbar) return;

      toolbar.addEventListener('mousedown', (e) => {
        if (e.target.closest('.toolbar-btn')) return;
        e.preventDefault();
        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        const rect = host.getBoundingClientRect();
        hostStartX = rect.left;
        hostStartY = rect.top;
      });
    }

    const onCollapsedMousedown = (e) => {
      isDragging = false;
      clickAllowed = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      const rect = host.getBoundingClientRect();
      hostStartX = rect.left;
      hostStartY = rect.top;

      const onMove = (me) => {
        const dx = Math.abs(me.clientX - dragStartX);
        const dy = Math.abs(me.clientY - dragStartY);
        if (dx > 4 || dy > 4) { isDragging = true; clickAllowed = false; }
        if (isDragging) {
          applyPosition(hostStartX + (me.clientX - dragStartX), hostStartY + (me.clientY - dragStartY));
        }
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        if (isDragging) { isDragging = false; savePosition(); }
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    };
    collapsed.addEventListener('mousedown', onCollapsedMousedown);

    const onDocMousemove = (e) => {
      if (!isDragging || !isExpanded) return;
      applyPosition(hostStartX + (e.clientX - dragStartX), hostStartY + (e.clientY - dragStartY));
    };
    document.addEventListener('mousemove', onDocMousemove);

    const onDocMouseup = () => {
      if (isDragging && isExpanded) { isDragging = false; savePosition(); }
    };
    document.addEventListener('mouseup', onDocMouseup);

    function applyPosition(left, top) {
      const w = host.offsetWidth || 60;
      const h = host.offsetHeight || 60;
      left = Math.max(0, Math.min(window.innerWidth - w, left));
      top = Math.max(0, Math.min(window.innerHeight - h, top));
      host.style.right = 'auto';
      host.style.left = left + 'px';
      host.style.top = top + 'px';
    }

    function savePosition() {
      chrome.storage.local.set({
        timerOverlayPos: { left: host.style.left, top: host.style.top }
      });
    }

    function restorePosition() {
      chrome.storage.local.get(['timerOverlayPos'], (result) => {
        if (result.timerOverlayPos && result.timerOverlayPos.left) {
          host.style.right = 'auto';
          host.style.left = result.timerOverlayPos.left;
          host.style.top = result.timerOverlayPos.top;
        }
      });
    }

    // ── 7. 타이머 초기화 ──
    const timer = new TimerCore();
    const audio = new AudioManager({ basePath: chrome.runtime.getURL('') });

    chrome.runtime.sendMessage({ target: 'background', type: 'ENSURE_OFFSCREEN' }).catch(() => {});

    // ── 8. 미니 위젯 업데이트 ──
    function updateMiniWidget(remainingMs, progress, formattedTime, colorPhase) {
      formattedTime = formattedTime || timer.getFormattedTime();
      if (progress === undefined) progress = timer.getProgress();
      colorPhase = colorPhase || timer.getColorPhase();

      $miniTime.textContent = formattedTime;
      $miniProgress.setAttribute('stroke-dashoffset', MINI_C * progress);

      $miniProgress.classList.remove('warning', 'danger');
      if (colorPhase === 'warning') $miniProgress.classList.add('warning');
      if (colorPhase === 'danger') $miniProgress.classList.add('danger');
    }

    // ── 9. UI 초기화 ──
    const ui = new TimerUI($timerContainer, timer, audio, {
      keyboardScope: shadow,
      onTick: (remainingMs, progress, formattedTime, colorPhase) => {
        updateMiniWidget(remainingMs, progress, formattedTime, colorPhase);
      },
      onStateChange: (state) => {
        updateMiniWidget();
        if (!_syncing) saveState();
      },
      onMinimize: () => collapse(),
      onPowerToggle: () => {
        chrome.storage.local.set({ timerEnabled: false });
      },
    });

    bindToolbarDrag();

    // ── 10. 상태 저장/복원 ──
    function saveState() {
      const activeTrackBtn = $timerContainer.querySelector('.music-dropdown__item.active');
      const data = {
        timerState: timer.serialize(),
        volume: audio.volume,
        musicTrack: activeTrackBtn ? activeTrackBtn.dataset.track : '',
        _sourceId: INSTANCE_ID,
      };
      chrome.storage.local.set({ timerData: data });
      chrome.runtime.sendMessage({
        target: 'background', type: 'TIMER_STATE_UPDATE', data: timer.serialize()
      }).catch(() => {});
    }

    async function restoreState() {
      const result = await chrome.storage.local.get(['timerData']);
      const saved = result.timerData || null;

      if (saved && saved.timerState) {
        _syncing = true;
        timer.deserialize(saved.timerState);
        ui.syncFromTimer();
        _syncing = false;

        if (saved.volume !== undefined) {
          audio.setVolume(saved.volume);
          const slider = $timerContainer.querySelector('#volume-slider');
          const label = $timerContainer.querySelector('#volume-value');
          if (slider) slider.value = Math.round(saved.volume * 100);
          if (label) label.textContent = Math.round(saved.volume * 100) + '%';
        }

        if (saved.musicTrack) {
          const btns = $timerContainer.querySelectorAll('.music-dropdown__item');
          btns.forEach(b => b.classList.remove('active'));
          const active = $timerContainer.querySelector(`.music-dropdown__item[data-track="${saved.musicTrack}"]`);
          if (active) {
            active.classList.add('active');
            if (timer.state === TIMER_CONSTANTS.STATE.RUNNING) {
              audio.playMusic(saved.musicTrack);
            }
          }
        }
      }

      updateMiniWidget();
    }

    restoreState();
    restorePosition();

    // ── 11. 주기적 상태 저장 ──
    const saveIntervalId = setInterval(() => saveState(), 1000);

    // ── 12. 멀티탭/팝업 동기화 ──
    const onStorageChanged = (changes, area) => {
      if (area !== 'local' || !changes.timerData) return;
      const newData = changes.timerData.newValue;
      if (!newData || !newData.timerState) return;
      if (newData._sourceId === INSTANCE_ID) return;

      _syncing = true;
      timer.deserialize(newData.timerState);
      if (newData.volume !== undefined) audio.setVolume(newData.volume);
      ui.syncFromTimer();
      updateMiniWidget();
      _syncing = false;

      if (newData.volume !== undefined) {
        const slider = $timerContainer.querySelector('#volume-slider');
        const label = $timerContainer.querySelector('#volume-value');
        if (slider) slider.value = Math.round(newData.volume * 100);
        if (label) label.textContent = Math.round(newData.volume * 100) + '%';
      }

      if (newData.musicTrack !== undefined) {
        const btns = $timerContainer.querySelectorAll('.music-dropdown__item');
        btns.forEach(b => b.classList.remove('active'));
        const trackBtn = $timerContainer.querySelector(`.music-dropdown__item[data-track="${newData.musicTrack}"]`);
        if (trackBtn) trackBtn.classList.add('active');
      }
    };
    chrome.storage.onChanged.addListener(onStorageChanged);

    // ── cleanup 함수 등록 ──
    cleanupFn = () => {
      clearInterval(saveIntervalId);
      timer._cancelLoop();
      audio.stopMusic();
      chrome.storage.onChanged.removeListener(onStorageChanged);
      document.removeEventListener('mousedown', onDocMousedown);
      document.removeEventListener('mousemove', onDocMousemove);
      document.removeEventListener('mouseup', onDocMouseup);
      host.remove();
    };
  }
})();
