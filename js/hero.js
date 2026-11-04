// Hero selection frame: drag (or arrow-key) the handles to resize the
// headline box. Text reflows live; W × H tag reads out the frame size.
// CSS clamps the width (see .hero__frame), so JS only sets the target.

const KEY_STEP = 16;

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

// Each rendered line slides up from behind a mask. Lines are measured after fonts
// load, then the markup is restored to plain text so the frame can reflow it freely.
async function revealLines(title) {
  if (reduceMotion.matches) return title.classList.add('is-ready');
  await document.fonts.ready;
  const text = title.textContent.trim();
  title.innerHTML = text.split(' ').map(w => `<span class="word">${w}</span>`).join(' ');

  const lines = [];
  let top = null;
  title.querySelectorAll('.word').forEach(w => {
    if (w.offsetTop !== top) { lines.push([]); top = w.offsetTop; }
    lines.at(-1).push(w.textContent);
  });

  title.innerHTML = lines
    .map((ws, i) => `<span class="line"><span class="line__inner" style="--i:${i}">${ws.join(' ')}</span></span>`)
    .join(' ');
  title.classList.add('is-ready');

  const last = title.querySelectorAll('.line__inner')[lines.length - 1];
  last.addEventListener('animationend', () => { title.textContent = text; }, { once: true });
}

export function initHero() {
  const frame = document.querySelector('[data-frame]');
  if (!frame) return;
  const sizeTag = frame.querySelector('[data-frame-size]');
  revealLines(frame.querySelector('.hero__title'));
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
