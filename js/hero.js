// Hero: headline line reveal, filled with a painted silk texture that an ink wave clears.

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const clipText = CSS.supports('background-clip', 'text') || CSS.supports('-webkit-background-clip', 'text');

const EMBER = {
  oxblood: '#6e1813',
  vermilion: '#e2452b',
  amber: '#f2a541',
  blush: '#f6c9bc',
  shadow: 'rgba(92, 10, 6, 0.85)',
  sheen: 'rgba(255, 190, 120, 0.9)',
  specular: 'rgba(255, 244, 232, 0.95)',
};

// Paint a silk texture once: a 4-colour mesh base (radial blooms), then folds drawn
// as blurred bezier ribbons at varied angles. Shadows multiply (deep red, keeps
// saturation), sheen soft-lights in warm amber, one thin near-white specular glint.
function paintSilk(w, h) {
  const scale = Math.min(devicePixelRatio || 1, 1.5);
  const c = document.createElement('canvas');
  c.width = Math.round(w * scale);
  c.height = Math.round(h * scale);
  const ctx = c.getContext('2d');
  ctx.scale(scale, scale);
  const rnd = (a, b) => a + Math.random() * (b - a);

  // Mesh base
  ctx.fillStyle = EMBER.vermilion;
  ctx.fillRect(0, 0, w, h);
  const bloom = (x, y, r, color) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  };
  bloom(w * rnd(0.6, 0.85), h * rnd(0.1, 0.4), h * 1.1, EMBER.amber);
  bloom(w * rnd(0.05, 0.25), h * rnd(0.6, 1), h * 1.2, EMBER.oxblood);
  bloom(w * rnd(0.35, 0.55), h * rnd(0.4, 0.7), h * 0.7, EMBER.blush);
  bloom(w * rnd(0.9, 1), h * rnd(0.7, 1), h * 0.9, EMBER.oxblood);

  // A fold: one wide wave across the texture; tilt varies its direction
  const fold = (y, tilt, amp, thickness, color, blur, mode) => {
    ctx.save();
    ctx.globalCompositeOperation = mode;
    ctx.filter = `blur(${blur}px)`;
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-w * 0.1, y);
    ctx.bezierCurveTo(
      w * rnd(0.2, 0.4), y - amp * rnd(0.6, 1.8),
      w * rnd(0.55, 0.8), y + amp * rnd(0.6, 1.8),
      w * 1.1, y + tilt,
    );
    ctx.stroke();
    ctx.restore();
  };

  for (let k = 0; k < 4; k++) {
    fold(h * rnd(0, 1), h * rnd(-0.6, 0.6), h * 0.35, h * rnd(0.1, 0.18), EMBER.shadow, h * 0.06, 'multiply');
  }
  for (let k = 0; k < 3; k++) {
    fold(h * rnd(0.1, 0.9), h * rnd(-0.5, 0.5), h * 0.3, h * rnd(0.12, 0.2), EMBER.sheen, h * 0.07, 'soft-light');
  }
  fold(h * rnd(0.3, 0.6), h * rnd(-0.4, 0.4), h * 0.3, h * 0.02, EMBER.specular, h * 0.01, 'screen');

  return c.toDataURL('image/webp', 0.9);
}

// Each rendered line slides up from behind a mask. Lines are measured after fonts
// load, then the original markup is restored so wrapping stays live on resize.
async function revealLines(title) {
  if (reduceMotion.matches) return title.classList.add('is-ready');
  await document.fonts.ready;
  const html = title.innerHTML;

  // Words as HTML strings; inline elements (footnote markers) stick to the preceding word
  const words = [''];
  title.childNodes.forEach(n => {
    if (n.nodeType !== Node.TEXT_NODE) { words[words.length - 1] += n.outerHTML; return; }
    n.textContent.split(/(\s+)/).forEach(part => {
      if (!part) return;
      if (/^\s+$/.test(part)) { if (words.at(-1)) words.push(''); }
      else words[words.length - 1] += part;
    });
  });

  title.innerHTML = words.map(w => `<span class="word">${w}</span>`).join(' ');
  const lines = [];
  let top = null;
  title.querySelectorAll('.word').forEach(w => {
    if (w.offsetTop !== top) { lines.push({ top: w.offsetTop, words: [] }); top = w.offsetTop; }
    lines.at(-1).words.push(w.innerHTML);
  });

  // One continuous texture across all lines; each line shows its own vertical slice
  const { width, height } = title.getBoundingClientRect();
  if (clipText) {
    const texW = Math.ceil(width * 1.5); // extra width is what the drift travels through
    const texH = Math.ceil(height * 1.15);
    title.style.setProperty('--silk', `url(${paintSilk(texW, texH)})`);
    title.style.setProperty('--silk-w', `${texW}px`);
    title.style.setProperty('--silk-h', `${texH}px`);
    title.style.setProperty('--silk-travel', `${-(texW - width)}px`);
    title.classList.add('has-silk');
  }

  title.innerHTML = lines
    .map(({ top: y, words: ws }, i) =>
      `<span class="line"><span class="line__inner" style="--i:${i};--ty:${lines[0].top - y}px">${ws.join(' ')}</span></span>`)
    .join(' ');
  title.classList.add('is-ready');

  const last = title.querySelectorAll('.line__inner')[lines.length - 1];
  const finalAnim = clipText ? 'ink-wave' : 'line-up';
  last.addEventListener('animationend', function done(e) {
    if (e.animationName !== finalAnim) return;
    last.removeEventListener('animationend', done);
    title.innerHTML = html;
    title.classList.remove('has-silk');
    title.style.removeProperty('--silk');
  });
}

export function initHero() {
  const title = document.querySelector('.hero__title');
  if (title) revealLines(title);
}
