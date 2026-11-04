// Hand-drawn hover underline: on enter a random stroke (never the same twice in a row)
// draws in left→right; on leave it finishes by erasing forward, like a pen stroke ending.
// Original paths; technique after Osmo's "Draw Random Underline" (GSAP DrawSVGPlugin).
//
// Markup: [data-draw-line] marks the text to underline. The hover trigger is the closest
// [data-draw-trigger] ancestor (e.g. a whole card), else the element itself.

// viewBox 0 0 300 20, all drawn starting on the left
const PATHS = [
  'M2 12C60 8 118 14 178 10S268 8 298 11',                    // easy wave
  'M2 13C80 13 160 11 228 8C258 7 284 8 298 6',               // rising swoosh
  'M3 10C90 7 198 12 296 9C222 12 124 15 42 13',              // stroke + return flick
  'M2 11Q40 6 76 11T150 11T224 11T298 10',                    // light wobble
];

// Draw at the box's real pixel size (scale the 300×20 path), so the stroke stays even and
// DrawSVG can measure it (stretched SVGs + non-scaling strokes can't be measured)
const svg = (d, w, h) => {
  let n = 0;
  const scaled = d.replace(/-?\d*\.?\d+/g, (v) => (+v * (n++ % 2 ? h / 20 : w / 300)).toFixed(2));
  const stroke = Math.max(1.6, Math.min(h * 0.32, 3.2));
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true" focusable="false">` +
    `<path d="${scaled}" fill="none" stroke="currentColor" stroke-width="${stroke.toFixed(2)}" stroke-linecap="round"/></svg>`;
};

const { gsap, DrawSVGPlugin } = window;
const enabled = Boolean(gsap && DrawSVGPlugin);
if (enabled) gsap.registerPlugin(DrawSVGPlugin);

let last = -1;
const nextPath = () => {
  let k;
  do { k = Math.floor(Math.random() * PATHS.length); } while (k === last);
  last = k;
  return PATHS[k];
};

export function initDrawLines(root = document) {
  if (!enabled) return;
  root.querySelectorAll('[data-draw-line]').forEach((target) => {
    if (target.dataset.drawReady) return;
    target.dataset.drawReady = '';
    const box = document.createElement('span');
    box.className = 'draw-line';
    target.append(box);
    const trigger = target.closest('[data-draw-trigger]') || target;
    let tween = null;

    const enter = () => {
      tween?.kill();
      box.innerHTML = svg(nextPath(), box.offsetWidth, box.offsetHeight);
      const path = box.firstChild.firstChild;
      gsap.set(path, { drawSVG: '0%' });
      tween = gsap.to(path, { drawSVG: '100%', duration: 0.5, ease: 'power2.inOut' });
    };
    const leave = () => {
      const path = box.firstChild?.firstChild;
      if (!path) return;
      tween?.kill();
      tween = gsap.to(path, {
        drawSVG: '100% 100%', duration: 0.45, ease: 'power2.inOut',
        onComplete: () => { box.innerHTML = ''; },
      });
    };
    trigger.addEventListener('mouseenter', enter);
    trigger.addEventListener('mouseleave', leave);
    trigger.addEventListener('focusin', enter);
    trigger.addEventListener('focusout', leave);
  });
}
