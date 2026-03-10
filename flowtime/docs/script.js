/* =========================================
   FlowTimer Landing — script.js
   ========================================= */

// ── 탭 전환 ──────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('tab-btn--active'));
    document.querySelectorAll('.install__panel').forEach(p => p.classList.add('install__panel--hidden'));
    btn.classList.add('tab-btn--active');
    document.getElementById('tab-' + btn.dataset.tab).classList.remove('install__panel--hidden');
  });
});

// ── 스크롤 reveal ─────────────────────────
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add('visible'), i * 80);
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// ── 타이머 목업 애니메이션 ────────────────
const CIRCUMFERENCE = 2 * Math.PI * 100; // r=100
const progressEl   = document.getElementById('mockProgress');
const timeEl       = document.getElementById('mockTime');
const playBtn      = document.getElementById('mockPlay');
const playIcon     = document.getElementById('mockPlayIcon');

const PAUSE_SVG = `<rect x="5" y="4" width="3" height="10" rx="1" fill="white"/><rect x="10" y="4" width="3" height="10" rx="1" fill="white"/>`;
const PLAY_SVG  = `<path d="M6 4l8 5-8 5V4z" fill="white"/>`;

let totalSec  = 5 * 60;
let remaining = 5 * 60;
let running   = false;
let intervalId = null;

function updateDisplay() {
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  timeEl.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;

  const progress  = remaining / totalSec;
  const offset    = CIRCUMFERENCE * (1 - progress);
  progressEl.style.strokeDasharray  = CIRCUMFERENCE;
  progressEl.style.strokeDashoffset = offset;

  // 색상 페이즈
  if (progress <= 0.1) {
    progressEl.style.stroke = '#e74c3c';
    progressEl.style.filter = 'drop-shadow(0 0 6px rgba(231,76,60,0.7))';
  } else if (progress <= 0.3) {
    progressEl.style.stroke = '#f5a623';
    progressEl.style.filter = 'drop-shadow(0 0 6px rgba(245,166,35,0.6))';
  } else {
    progressEl.style.stroke = '#7c5cfc';
    progressEl.style.filter = 'drop-shadow(0 0 6px rgba(124,92,252,0.6))';
  }
}

function startTimer() {
  running = true;
  playIcon.innerHTML = PAUSE_SVG;
  intervalId = setInterval(() => {
    if (remaining <= 0) {
      stopTimer();
      remaining = totalSec;
      updateDisplay();
      return;
    }
    remaining--;
    updateDisplay();
  }, 1000);
}

function stopTimer() {
  running = false;
  playIcon.innerHTML = PLAY_SVG;
  clearInterval(intervalId);
}

playBtn.addEventListener('click', () => {
  if (running) stopTimer();
  else startTimer();
});

// 초기 렌더
updateDisplay();
