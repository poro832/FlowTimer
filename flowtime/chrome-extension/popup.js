/**
 * FlowTimer — Popup Entry Point
 * 팝업 열릴 때 상태 복원, 닫힐 때 상태 저장
 * 툴바 전원 버튼으로 타이머 ON/OFF 제어
 */

const POPUP_ID = 'popup_' + Math.random().toString(36).slice(2, 10);

let timer;
let audio;
let ui;
let _syncing = false;

async function init() {
  const container = document.getElementById('timer-container');

  // ── 타이머 초기화 ──
  timer = new TimerCore();
  audio = new AudioManager({ basePath: chrome.runtime.getURL('') });

  ensureOffscreen();

  const saved = await loadState();
  if (saved && saved.timerState) {
    _syncing = true;
    timer.deserialize(saved.timerState);
    _syncing = false;
  }
  if (saved && saved.volume !== undefined) {
    audio.setVolume(saved.volume);
  }

  // UI 초기화
  ui = new TimerUI(container, timer, audio, {
    onStateChange: () => { if (!_syncing) saveState(); },
    onPowerToggle: () => {
      chrome.storage.local.get(['timerEnabled'], (result) => {
        const newState = !result.timerEnabled;
        chrome.storage.local.set({ timerEnabled: newState });
      });
    },
  });

  // 최소화 버튼 숨기기 (팝업에서는 불필요)
  const btnMin = container.querySelector('#btn-minimize');
  if (btnMin) btnMin.style.display = 'none';

  // ── timerEnabled 상태 반영 ──
  const { timerEnabled } = await chrome.storage.local.get(['timerEnabled']);
  updatePowerState(!!timerEnabled);

  if (saved && saved.timerState) {
    ui.syncFromTimer();

    if (saved.volume !== undefined) {
      const slider = container.querySelector('#volume-slider');
      const label = container.querySelector('#volume-value');
      if (slider) slider.value = Math.round(saved.volume * 100);
      if (label) label.textContent = Math.round(saved.volume * 100) + '%';
    }

    if (saved.musicTrack) {
      const btns = container.querySelectorAll('.music-dropdown__item');
      btns.forEach(b => b.classList.remove('active'));
      const active = container.querySelector(`.music-dropdown__item[data-track="${saved.musicTrack}"]`);
      if (active) {
        active.classList.add('active');
        if (timer.state === TIMER_CONSTANTS.STATE.RUNNING) {
          audio.playMusic(saved.musicTrack);
        }
      }
    }
  }

  // ── 주기적 상태 저장 ──
  setInterval(() => saveState(), 1000);

  window.addEventListener('beforeunload', () => saveState());

  // 오버레이와 동기화
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;

    // timerEnabled 변경 동기화
    if (changes.timerEnabled) {
      updatePowerState(!!changes.timerEnabled.newValue);
    }

    // timerData 변경 동기화
    if (changes.timerData) {
      const newData = changes.timerData.newValue;
      if (!newData || !newData.timerState) return;
      if (newData._sourceId === POPUP_ID) return;

      _syncing = true;
      timer.deserialize(newData.timerState);
      if (newData.volume !== undefined) audio.setVolume(newData.volume);
      ui.syncFromTimer();
      _syncing = false;

      if (newData.volume !== undefined) {
        const slider = container.querySelector('#volume-slider');
        const label = container.querySelector('#volume-value');
        if (slider) slider.value = Math.round(newData.volume * 100);
        if (label) label.textContent = Math.round(newData.volume * 100) + '%';
      }

      if (newData.musicTrack !== undefined) {
        const btns = container.querySelectorAll('.music-dropdown__item');
        btns.forEach(b => b.classList.remove('active'));
        const trackBtn = container.querySelector(`.music-dropdown__item[data-track="${newData.musicTrack}"]`);
        if (trackBtn) trackBtn.classList.add('active');
      }
    }
  });
}

function updatePowerState(enabled) {
  const container = document.getElementById('timer-container');
  const btnPower = container.querySelector('#btn-power');
  // timer-face만 비활성화 (전원 버튼은 항상 클릭 가능)
  const wrapper = container.querySelector('.timer-face-wrapper');
  if (wrapper) {
    wrapper.classList.toggle('disabled', !enabled);
  }
  if (btnPower) {
    btnPower.classList.toggle('active', enabled);
    btnPower.title = enabled ? '타이머 끄기' : '타이머 켜기';
  }
}

async function ensureOffscreen() {
  try {
    const existing = await chrome.offscreen.hasDocument();
    if (!existing) {
      await chrome.offscreen.createDocument({
        url: 'chrome-extension/offscreen.html',
        reasons: ['AUDIO_PLAYBACK'],
        justification: 'Playing timer alert sounds and background music'
      });
    }
  } catch (e) {}
}

async function loadState() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['timerData'], (result) => {
      resolve(result.timerData || null);
    });
  });
}

function saveState() {
  const activeTrackBtn = document.querySelector('.music-dropdown__item.active');
  const data = {
    timerState: timer.serialize(),
    volume: audio.volume,
    musicTrack: activeTrackBtn ? activeTrackBtn.dataset.track : '',
    _sourceId: POPUP_ID,
  };
  chrome.storage.local.set({ timerData: data });

  chrome.runtime.sendMessage({
    target: 'background',
    type: 'TIMER_STATE_UPDATE',
    data: timer.serialize()
  }).catch(() => {});
}

document.addEventListener('DOMContentLoaded', init);
