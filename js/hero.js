// Hero selection frame: drag (or arrow-key) the handles to resize the
// headline box. Text reflows live; W × H tag reads out the frame size.
// CSS clamps the width (see .hero__frame), so JS only sets the target.

const KEY_STEP = 16;

export function initHero() {
  const frame = document.querySelector('[data-frame]');
  if (!frame) return;
  const sizeTag = frame.querySelector('[data-frame-size]');
  const slider = frame.querySelector('[role="slider"]');

  const setW = (w) => frame.style.setProperty('--frame-w', `${Math.round(w)}px`);
  const reset = () => frame.style.removeProperty('--frame-w');

  new ResizeObserver(([entry]) => {
    const { inlineSize: w, blockSize: h } = entry.borderBoxSize[0];
    sizeTag.textContent = `${Math.round(w)} × ${Math.round(h)}`;
    slider.setAttribute('aria-valuenow', Math.round(w));
    const parent = frame.parentElement;
    const pad = parseFloat(getComputedStyle(parent).paddingLeft);
    slider.setAttribute('aria-valuemax', Math.round(parent.clientWidth - pad * 2));
  }).observe(frame);

  frame.querySelectorAll('[data-handle]').forEach(h => {
    const dir = Number(h.dataset.handle);

    h.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      h.setPointerCapture(e.pointerId);
      const startX = e.clientX;
      const startW = frame.offsetWidth;
      frame.classList.add('is-resizing');

      const drag = new AbortController();
      const { signal } = drag;
      const up = () => {
        frame.classList.remove('is-resizing');
        drag.abort();
      };
      h.addEventListener('pointermove', (ev) => setW(startW + dir * (ev.clientX - startX)), { signal });
      h.addEventListener('pointerup', up, { signal });
      h.addEventListener('pointercancel', up, { signal });
    });

    h.addEventListener('dblclick', reset);
  });

  // offsetWidth (not --frame-w) as base: CSS clamp may have capped the value
  slider.addEventListener('keydown', (e) => {
    const step = e.shiftKey ? KEY_STEP * 4 : KEY_STEP;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') setW(frame.offsetWidth + step);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') setW(frame.offsetWidth - step);
    else if (e.key === 'Escape' || e.key === 'Home') reset();
    else return;
    e.preventDefault();
  });
}
