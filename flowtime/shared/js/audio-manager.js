/**
 * AudioManager — 음악/알림음 재생 (플랫폼 분기)
 *
 * 배경 음악: mp3 파일 재생 (루프)
 * 알림음: Web Audio API 합성
 * Chrome 확장: offscreen document로 메시지 전달
 */
class AudioManager {
  constructor(options = {}) {
    this.platform = typeof PLATFORM !== 'undefined' ? PLATFORM : 'web';
    this.basePath = options.basePath || '';
    this.volume = options.volume || 0.5;

    this._musicAudio = null;
    this._currentTrackId = null;
    this._audioCtx = null;
  }

  _getAudioContext() {
    if (!this._audioCtx || this._audioCtx.state === 'closed') {
      this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this._audioCtx.state === 'suspended') {
      this._audioCtx.resume();
    }
    return this._audioCtx;
  }

  /** 볼륨 설정 (0~1) */
  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));

    if (this.platform === 'chrome') {
      this._sendToOffscreen({ type: 'SET_VOLUME', volume: this.volume });
    } else if (this._musicAudio) {
      this._musicAudio.volume = this.volume;
    }
  }

  /** 배경 음악 재생 (mp3) */
  playMusic(trackId) {
    if (this.platform === 'chrome') {
      this._sendToOffscreen({ type: 'PLAY_MUSIC', trackId, volume: this.volume });
      this._currentTrackId = trackId;
      return;
    }

    this.stopMusic();
    const track = MUSIC_TRACKS.find(t => t.id === trackId);
    if (!track) return;

    const src = this.basePath + 'shared/assets/music/' + track.file;
    this._musicAudio = new Audio(src);
    this._musicAudio.loop = true;
    this._musicAudio.volume = this.volume;
    this._musicAudio.play().catch(() => {});
    this._currentTrackId = trackId;
  }

  /** 배경 음악 중지 */
  stopMusic() {
    if (this.platform === 'chrome') {
      this._sendToOffscreen({ type: 'STOP_MUSIC' });
      this._currentTrackId = null;
      return;
    }

    if (this._musicAudio) {
      this._musicAudio.pause();
      this._musicAudio.currentTime = 0;
      this._musicAudio = null;
    }
    this._currentTrackId = null;
  }

  /** 배경 음악 일시정지 */
  pauseMusic() {
    if (this.platform === 'chrome') {
      this._sendToOffscreen({ type: 'PAUSE_MUSIC' });
      return;
    }
    if (this._musicAudio) {
      this._musicAudio.pause();
    }
  }

  /** 배경 음악 재개 */
  resumeMusic() {
    if (this.platform === 'chrome') {
      this._sendToOffscreen({ type: 'RESUME_MUSIC' });
      return;
    }
    if (this._musicAudio) {
      this._musicAudio.play().catch(() => {});
    }
  }

  /** 알림음 재생 (start, tick, finish) */
  playSound(soundId) {
    if (this.platform === 'chrome') {
      this._sendToOffscreen({ type: 'PLAY_SOUND', soundId, volume: this.volume });
      return;
    }
    this._playSynthSound(soundId);
  }

  _playSynthSound(soundId) {
    if (soundId === 'finish') {
      const src = this.basePath + 'shared/assets/sounds/finish.mp3';
      const audio = new Audio(src);
      audio.volume = this.volume;
      audio.play().catch(() => {});
      return;
    }

    try {
      const ctx = this._getAudioContext();
      const gainNode = ctx.createGain();
      gainNode.gain.value = this.volume * 0.5;
      gainNode.connect(ctx.destination);

      switch (soundId) {
        case 'start':
          this._playTone(ctx, gainNode, 880, 0.1, 'sine');
          setTimeout(() => this._playTone(ctx, gainNode, 1100, 0.15, 'sine'), 120);
          break;
        case 'tick':
          this._playTone(ctx, gainNode, 600, 0.05, 'sine');
          break;
      }
    } catch (e) {}
  }

  _playTone(ctx, gainNode, freq, duration, type) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    osc.connect(gainNode);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }

  /** Chrome 확장: offscreen document로 메시지 전달 */
  _sendToOffscreen(msg) {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ target: 'offscreen', ...msg }).catch(() => {});
    }
  }

  getCurrentTrack() {
    return this._currentTrackId;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AudioManager };
}
