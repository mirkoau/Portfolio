// GSAP layer: eased scrolling (ScrollSmoother) + hyperminimal scroll in/out reveals
// (ScrollTrigger). GSAP is self-hosted in js/vendor/ and loaded as globals before main.js.
// Everything degrades to native scrolling with no reveals if GSAP is missing or the user
// prefers reduced motion.

const { gsap, ScrollTrigger, ScrollSmoother } = window;
const enabled = Boolean(gsap && ScrollTrigger && ScrollSmoother)
  && !matchMedia('(prefers-reduced-motion: reduce)').matches;

const NAV_OFFSET = 88; // px: nav height + breathing room, where scroll targets land

// Elements that drift in/out. Hero has its own load sequence, so it's not listed.
const REVEAL = [
  '.section-title', '.section-sub', '.work__company-head', '.project-card',
  '.approach__row', '.freelance__strip', '.freelance__bar', '.about__frame', '.about__text > *',
  '.footer__pitch', '.footer__email', '.footer__links',
  '.case__head > *', '.case__inspect', '.case__section > *', '.case__results', '.case__next', // .case__hero arrives via the morph
].join(', ');

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
// Rise 6px and fade in on entry; ease out the same way past the top. Reverse on the way back.
const SHIFT = 6;
const IN = { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out', stagger: 0.04, overwrite: true };
const out = (y) => ({ autoAlpha: 0, y, duration: 0.35, ease: 'power1.in', overwrite: true });

export function reveal(root = document) {
  if (!enabled) return;
  const els = [...root.querySelectorAll(REVEAL)].filter((el) => !el.dataset.reveal);
  if (!els.length) return;
  els.forEach((el) => { el.dataset.reveal = ''; });
  gsap.set(els, { autoAlpha: 0, y: SHIFT });
  ScrollTrigger.batch(els, {
    start: 'top 94%',
    end: 'bottom 6%',
    onEnter: (b) => gsap.to(b, IN),
    onEnterBack: (b) => gsap.to(b, IN),
    onLeave: (b) => gsap.to(b, out(-SHIFT)),
    onLeaveBack: (b) => gsap.to(b, out(SHIFT)),
  });
}

// Page swaps: put everything already on screen straight into its revealed state, so the
// view transition captures final positions (a mid-reveal offset made the morph land a few
// px off and then snap). Later batch callbacks tween to the same values: no movement.
export function settleVisible(root = document) {
  if (!enabled) return;
  const vh = innerHeight;
  root.querySelectorAll('[data-reveal]').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.bottom <= 0 || r.top >= vh || (r.width === 0 && r.height === 0)) return;
    gsap.killTweensOf(el);
    gsap.set(el, { autoAlpha: 1, y: 0 });
  });
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
