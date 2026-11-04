// Hero selection frame: drag (or arrow-key) the handles to resize the
// headline box. Text reflows live; W × H tag reads out the frame size.

const MIN_W = 220;
const KEY_STEP = 16;

export function initHero() {
  const frame = document.querySelector('[data-frame]');
  if (!frame) return;
  const sizeTag = frame.querySelector('[data-frame-size]');
  const handles = frame.querySelectorAll('[data-handle]');

  // Frame bleeds 11px past the gutter on each side (negative margin + padding)
  const BLEED = 22;
  const maxW = () => {
    const parent = frame.parentElement;
    return parent.clientWidth - parseFloat(getComputedStyle(parent).paddingLeft) * 2 + BLEED;
  };
  const setW = (w) => {
    frame.style.setProperty('--frame-w', `${Math.round(Math.min(Math.max(w, MIN_W), maxW()))}px`);
  };

  new ResizeObserver(([entry]) => {
    const { inlineSize: w, blockSize: h } = entry.borderBoxSize[0];
    sizeTag.textContent = `${Math.round(w)} × ${Math.round(h)}`;
  }).observe(frame);

  handles.forEach(h => {
    const dir = Number(h.dataset.handle);

    h.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      h.setPointerCapture(e.pointerId);
      const startX = e.clientX;
      const startW = frame.offsetWidth;
      frame.classList.add('is-resizing');

      const move = (ev) => setW(startW + dir * (ev.clientX - startX));
      const up = () => {
        frame.classList.remove('is-resizing');
        h.removeEventListener('pointermove', move);
        h.removeEventListener('pointerup', up);
        h.removeEventListener('pointercancel', up);
      };
      h.addEventListener('pointermove', move);
      h.addEventListener('pointerup', up);
      h.addEventListener('pointercancel', up);
    });

    // Double-click resets to the designed width
    h.addEventListener('dblclick', () => frame.style.removeProperty('--frame-w'));

    h.addEventListener('keydown', (e) => {
      const step = e.shiftKey ? KEY_STEP * 4 : KEY_STEP;
      if (e.key === 'ArrowRight') setW(frame.offsetWidth + step);
      else if (e.key === 'ArrowLeft') setW(frame.offsetWidth - step);
      else if (e.key === 'Escape') frame.style.removeProperty('--frame-w');
      else return;
      e.preventDefault();
    });
  });

  // Keep a custom width inside the viewport on window resize
  addEventListener('resize', () => {
    if (frame.style.getPropertyValue('--frame-w')) setW(frame.offsetWidth);
  }, { passive: true });
}
