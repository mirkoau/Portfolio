// GSAP layer: eased scrolling (ScrollSmoother) + hyperminimal scroll in/out reveals
// (ScrollTrigger). GSAP is self-hosted in js/vendor/ and loaded as globals before main.js.
// Everything degrades to native scrolling with no reveals if GSAP is missing or the user
// prefers reduced motion.

const { gsap, ScrollTrigger, ScrollSmoother } = window;
const enabled = Boolean(gsap && ScrollTrigger && ScrollSmoother)
  && !matchMedia('(prefers-reduced-motion: reduce)').matches;

const NAV_OFFSET = 88; // px: nav height + breathing room, where scroll targets land

// Units that move in/out with the scroll: leaf-level, never nested inside each other, so
// nothing double-moves. Strokes travel with the element that owns them (rules are borders
// on these units). Hero headline, dateline, fixed nav and pinned TOC are left out.
const REVEAL = [
  // index
  '.section-title', '.section-sub', '.work__company-head',
  // cards: each part moves on its own; the card frame stays put
  '.project-card__head', '.project-card .frame', '.project-card__title', '.project-card__summary',
  '.project-card__scope', '.project-card__cta',
  '.approach__row', '.freelance__strip', '.freelance__bar', '.about__frame', '.about__text > *',
  '.footer__pitch', '.footer__email', '.footer__links', '.footer__copy',
  // case study (.case__hero arrives via the morph)
  '.case__head > *', '.case__inspect > div',
  '.case__section > *', '.case__results', '.case__next',
].join(', ');

const SHIFT = 56;   // px of travel at the very edge
const EDGE = 0.18;  // share of the viewport over which a unit enters / leaves

let smoother = null;

export function initMotion() {
  if (!enabled) return;
  gsap.registerPlugin(ScrollTrigger, ScrollSmoother);
  document.documentElement.classList.add('has-smoother');
  smoother = ScrollSmoother.create({
    wrapper: '#smooth-wrapper',
    content: '#smooth-content',
    smooth: 0.8,        // seconds to catch up: eased, but still feels direct
    smoothTouch: false, // touch keeps native momentum
    effects: false,
  });
}

// ── Scroll helpers (work with or without the smoother) ──
export const getScrollY = () => (smoother ? smoother.scrollTop() : window.scrollY);

export const scrollToY = (y, smooth = false) => {
  if (smoother) smoother.scrollTo(y, smooth);
  else window.scrollTo({ top: y, behavior: smooth ? 'smooth' : 'instant' });
};

export const scrollToEl = (el, { smooth = true, center = false } = {}) => {
  if (!el) return;
  if (smoother) smoother.scrollTo(el, smooth, center ? 'center center' : `top ${NAV_OFFSET}px`);
  else el.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant', block: center ? 'center' : 'start' });
};

// Layout changed (route switch, content rendered): recompute heights + trigger positions
export const refresh = () => { if (enabled) ScrollTrigger.refresh(); };

// ── Scroll in / out ──
// Scroll-linked, not timed: a unit rises SHIFT px into place and fades in while it crosses
// the bottom EDGE of the viewport, and drifts SHIFT px up and fades out while it crosses
// the top EDGE. It moves exactly as much as you scroll, both directions.
export function reveal(root = document) {
  if (!enabled) return;
  const els = [...root.querySelectorAll(REVEAL)].filter((el) => !el.dataset.reveal);
  const inStart = 'top bottom';
  const inEnd = `top ${(1 - EDGE) * 100}%`;
  const outStart = `bottom ${EDGE * 100}%`;
  els.forEach((el) => {
    el.dataset.reveal = '';
    gsap.fromTo(el, { y: SHIFT, autoAlpha: 0 }, {
      y: 0, autoAlpha: 1, ease: 'power1.out',
      scrollTrigger: { trigger: el, start: inStart, end: inEnd, scrub: true },
    });
    gsap.fromTo(el, { y: 0, autoAlpha: 1 }, {
      y: -SHIFT, autoAlpha: 0, ease: 'power1.in', immediateRender: false,
      scrollTrigger: { trigger: el, start: outStart, end: 'bottom top', scrub: true },
    });
  });
}

// Page swaps: scroll-linked states are a function of scroll position, so after a jump
// force one synchronous update before the view transition captures. The morph then lands
// exactly where the live element sits (no snap afterwards).
export function settleVisible() {
  if (enabled) ScrollTrigger.update();
}

// Drop triggers whose elements were removed (case study torn down)
export function prune() {
  if (!enabled) return;
  ScrollTrigger.getAll().forEach((t) => { if (t.trigger && !t.trigger.isConnected) t.kill(); });
}

// position: sticky can't work inside the smoother's transformed content, so pin instead.
// Returns a cleanup function.
export function pin(el, within) {
  if (!enabled || !el) return () => {};
  const t = ScrollTrigger.create({
    trigger: el,
    start: `top ${NAV_OFFSET}px`,
    endTrigger: within,
    end: () => `bottom ${NAV_OFFSET + el.offsetHeight}px`,
    pin: true,
    pinSpacing: false,
  });
  return () => t.kill();
}

export const motionEnabled = () => enabled;
