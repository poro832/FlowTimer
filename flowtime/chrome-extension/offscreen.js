/**
 * Chrome Extension — Offscreen Document
 * 배경 음악: mp3 파일 재생
 * 알림음: Web Audio API 합성
 */

let musicAudio = null;
let currentVolume = 0.5;
let audioCtx = null;

function getCtx() {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.target !== 'offscreen') return;
  switch (msg.type) {
    case 'PLAY_MUSIC':   playMusic(msg.trackId, msg.volume); break;
    case 'STOP_MUSIC':   stopMusic(); break;
    case 'PAUSE_MUSIC':  pauseMusic(); break;
    case 'RESUME_MUSIC': resumeMusic(); break;
    case 'PLAY_SOUND':   playSound(msg.soundId, msg.volume); break;
    case 'SET_VOLUME':   setVolume(msg.volume); break;
  }
  sendResponse({ ok: true });
  return false;
});

function setVolume(vol) {
  currentVolume = vol;
  if (musicAudio) musicAudio.volume = currentVolume;
}

function playMusic(trackId, volume) {
  stopMusic();
  if (volume !== undefined) currentVolume = volume;

  const tracks = {
    focus: 'focus.mp3',
    dramatic: 'dramatic.mp3',
    upbeat: 'upbeat.mp3',
    energetic: 'energetic.mp3',
    lofi: 'lofi.mp3',
  };

  const file = tracks[trackId];
  if (!file) return;

  const url = chrome.runtime.getURL('shared/assets/music/' + file);
  musicAudio = new Audio(url);
  musicAudio.loop = true;
  musicAudio.volume = currentVolume;
  musicAudio.play().catch(() => {});
}

function pauseMusic() {
  if (musicAudio) musicAudio.pause();
}

function resumeMusic() {
  if (musicAudio) musicAudio.play().catch(() => {});
}

function stopMusic() {
  if (musicAudio) {
    musicAudio.pause();
    musicAudio.currentTime = 0;
    musicAudio = null;
  }
}

function playSound(soundId, volume) {
  if (volume !== undefined) currentVolume = volume;

  if (soundId === 'finish') {
    const url = chrome.runtime.getURL('shared/assets/sounds/finish.mp3');
    const audio = new Audio(url);
    audio.volume = currentVolume;
    audio.play().catch(() => {});
    return;
  }

  try {
    const ctx = getCtx();
    const g = ctx.createGain();
    g.gain.value = currentVolume * 0.5;
    g.connect(ctx.destination);
    switch (soundId) {
      case 'start':
        tone(ctx, g, 880, 0.1, 'sine');
        setTimeout(() => tone(ctx, g, 1100, 0.15, 'sine'), 120);
        break;
      case 'tick':
        tone(ctx, g, 600, 0.05, 'sine');
        break;
    }
  } catch(e) {}
}

function tone(ctx, gain, freq, dur, type) {
  const o = ctx.createOscillator();
  o.type = type; o.frequency.value = freq;
  o.connect(gain);
  o.start(ctx.currentTime); o.stop(ctx.currentTime + dur);
}
