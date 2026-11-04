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
  '.case__head > *', '.case__inspect', '.case__hero', '.case__section > *', '.case__results', '.case__next',
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
// Rise 12px and fade in on entry; ease out the same way past the top. Reverse on the way back.
const IN = { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.06, overwrite: true };
const out = (y) => ({ autoAlpha: 0, y, duration: 0.6, ease: 'power2.in', overwrite: true });

export function reveal(root = document) {
  if (!enabled) return;
  const els = [...root.querySelectorAll(REVEAL)].filter((el) => !el.dataset.reveal);
  if (!els.length) return;
  els.forEach((el) => { el.dataset.reveal = ''; });
  gsap.set(els, { autoAlpha: 0, y: 12 });
  ScrollTrigger.batch(els, {
    start: 'top 94%',
    end: 'bottom 6%',
    onEnter: (b) => gsap.to(b, IN),
    onEnterBack: (b) => gsap.to(b, IN),
    onLeave: (b) => gsap.to(b, out(-12)),
    onLeaveBack: (b) => gsap.to(b, out(12)),
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
