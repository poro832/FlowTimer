/**
 * FlowTimer — Electron Renderer
 * shared 코드를 사용하여 타이머 UI 구성
 * btn-minimize → 닫기(X), btn-theme → 테마 선택
 */

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('timer-container');

  const basePath = window.electronAPI ? window.electronAPI.basePath : '';
  const timer = new TimerCore();
  const audio = new AudioManager({ basePath });
  const ui = new TimerUI(container, timer, audio, {
    hidePowerButton: true,
    onMinimize: () => {
      if (window.electronAPI) window.electronAPI.close();
      else window.close();
    },
    onThemeChange: (themeId) => {
      localStorage.setItem('flowtimer-theme', themeId);
    },
  });

  // 저장된 테마 복원
  ui.applyTheme(localStorage.getItem('flowtimer-theme') || 'dark');

  // ── btn-minimize: X(닫기) 아이콘으로 교체 ──
  const btnMinimize = container.querySelector('#btn-minimize');
  if (btnMinimize) {
    btnMinimize.title = '닫기';
    btnMinimize.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
      </svg>`;
  }

  // ── 패널 열림 시 타이머 원 드래그 비활성화 ──
  const timerWrapper = container.querySelector('.timer-face-wrapper');
  const panels = ['#music-dropdown', '#volume-popover', '#theme-dropdown']
    .map(sel => container.querySelector(sel)).filter(Boolean);
  if (timerWrapper && panels.length) {
    const updateDrag = () => {
      const open = panels.some(el => el.classList.contains('open'));
      timerWrapper.classList.toggle('panel-open', open);
    };
    const obs = new MutationObserver(updateDrag);
    panels.forEach(el => obs.observe(el, { attributes: true, attributeFilter: ['class'] }));
  }
});
