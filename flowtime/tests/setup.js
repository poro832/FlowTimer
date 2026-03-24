// timer-core.js가 TIMER_CONSTANTS를 글로벌로 참조하므로 미리 주입
const constants = require('../shared/js/constants');
global.TIMER_CONSTANTS = constants.TIMER_CONSTANTS;
global.MUSIC_TRACKS = constants.MUSIC_TRACKS;
global.SOUND_EFFECTS = constants.SOUND_EFFECTS;
global.THEMES = constants.THEMES;

// 브라우저 API 모킹
global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
global.cancelAnimationFrame = (id) => clearTimeout(id);
