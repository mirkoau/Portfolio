// Hero selection frame: drag (or arrow-key) the handles to resize the
// headline box. Text reflows live; W × H tag reads out the frame size.
// CSS clamps the width (see .hero__frame), so JS only sets the target.

const KEY_STEP = 16;

const rand = (max) => (Math.random() * 2 - 1) * max;

// Split into word (nowrap) + char spans; each char gets a random scatter offset.
// The visible text is aria-hidden; the heading keeps its plain text as its label.
export function splitChars(el, scatter = false) {
  const text = el.textContent.trim();
  let i = 0;
  const char = (ch) => {
    const vars = scatter
      ? `--i:${i};--x:${rand(0.12).toFixed(2)}em;--y:${(0.25 + Math.random() * 0.3).toFixed(2)}em;--r:${Math.round(rand(8))}deg`
      : `--i:${i}`;
    i++;
    return `<span class="char" style="${vars}">${ch}</span>`;
  };
  el.setAttribute('aria-label', text);
  el.innerHTML = text.split(' ')
    .map(w => `<span class="word" aria-hidden="true">${[...w].map(char).join('')}</span>`)
    .join(' ');
}

export function initHero() {
  const frame = document.querySelector('[data-frame]');
  if (!frame) return;
  const sizeTag = frame.querySelector('[data-frame-size]');
  const title = frame.querySelector('.hero__title');

  // Complex → simple: scattered letters settle into the headline
  splitChars(title, true);
  title.classList.add('is-split');
  requestAnimationFrame(() => requestAnimationFrame(() => title.classList.add('is-settled')));
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
