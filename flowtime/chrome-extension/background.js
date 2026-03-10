/**
 * Chrome Extension — Background Service Worker
 * - chrome.alarms로 타이머 종료/경고 시점 감시
 * - chrome.storage로 상태 영속
 */

const ALARM_FINISH = 'timer-finish';
const ALARM_WARNING = 'timer-warning';

// ── 뱃지 상태 표시 ──
function updateBadge(enabled) {
  if (enabled) {
    chrome.action.setBadgeText({ text: 'ON' });
    chrome.action.setBadgeBackgroundColor({ color: '#7c5cfc' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

// storage 변경 감지 → 뱃지 업데이트
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes.timerEnabled) return;
  updateBadge(!!changes.timerEnabled.newValue);
});

// 시작 시 뱃지 복원
chrome.storage.local.get(['timerEnabled'], (result) => {
  updateBadge(!!result.timerEnabled);
});

// 메시지 수신
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.target === 'offscreen') {
    // offscreen으로 전달
    forwardToOffscreen(msg);
    sendResponse({ ok: true });
    return;
  }

  if (msg.target === 'background') {
    if (msg.type === 'ENSURE_OFFSCREEN') {
      ensureOffscreen().then(() => sendResponse({ ok: true }));
      return true; // async sendResponse
    }
    handleBackgroundMessage(msg);
    sendResponse({ ok: true });
    return;
  }

  return false;
});

function handleBackgroundMessage(msg) {
  if (msg.type === 'TIMER_STATE_UPDATE') {
    updateAlarms(msg.data);
  }
}

async function updateAlarms(timerState) {
  // 기존 알람 제거
  await chrome.alarms.clear(ALARM_FINISH);
  await chrome.alarms.clear(ALARM_WARNING);

  if (timerState.state !== 'running' || !timerState.endTime) return;

  const now = Date.now();
  const remaining = timerState.endTime - now;

  if (remaining <= 0) return;

  // 종료 알람
  chrome.alarms.create(ALARM_FINISH, {
    when: timerState.endTime
  });

  // 5초 전 경고 알람
  const warningTime = timerState.endTime - 5000;
  if (warningTime > now) {
    chrome.alarms.create(ALARM_WARNING, {
      when: warningTime
    });
  }
}

// 알람 발생 시
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_FINISH) {
    // 타이머 종료 → offscreen에서 종료음 재생
    await ensureOffscreen();
    forwardToOffscreen({ type: 'PLAY_SOUND', soundId: 'finish', volume: 0.5 });

    // 상태 업데이트
    const result = await chrome.storage.local.get(['timerData']);
    if (result.timerData && result.timerData.timerState) {
      result.timerData.timerState.state = 'finished';
      await chrome.storage.local.set({ timerData: result.timerData });
    }
  }

  if (alarm.name === ALARM_WARNING) {
    await ensureOffscreen();
    forwardToOffscreen({ type: 'PLAY_SOUND', soundId: 'tick', volume: 0.5 });
  }
});

async function ensureOffscreen() {
  try {
    const existing = await chrome.offscreen.hasDocument();
    if (!existing) {
      await chrome.offscreen.createDocument({
        url: 'chrome-extension/offscreen.html',
        reasons: ['AUDIO_PLAYBACK'],
        justification: 'Playing timer alert sounds'
      });
    }
  } catch (e) {
    // ignore
  }
}

async function forwardToOffscreen(msg) {
  try {
    await chrome.runtime.sendMessage({ ...msg, target: 'offscreen' });
  } catch (e) {
    // offscreen이 아직 준비 안 됐을 수 있음
  }
}

// 설치/업데이트 시 기존 탭에 content script 주입
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Presentation Timer extension installed');

  // 이미 열려있는 탭에 content script 주입
  try {
    const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] });
    for (const tab of tabs) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: [
            'shared/js/constants.js',
            'shared/js/timer-core.js',
            'shared/js/audio-manager.js',
            'shared/js/timer-ui.js',
            'chrome-extension/content-script.js'
          ]
        });
      } catch (e) {
        // chrome://, edge:// 등 주입 불가 페이지 무시
      }
    }
  } catch (e) {
    // tabs query 실패 시 무시
  }
});
