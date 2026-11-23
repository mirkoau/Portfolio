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
  '.section-title', '.section-sub', '.work__company-head', '.stats__item',
  // cards: each part moves on its own; the card frame stays put
  '.project-card .frame', '.project-card__meta', '.project-card__title', '.project-card__summary',
  '.project-card__cta',
  '.approach__row', '.toolkit__tools', '.toolkit__skills', '.freelance__strip', '.freelance__bar', '.about__frame', '.about__text > *',
  '.footer__pitch', '.footer__email', '.footer__links', '.footer__copy',
  // case study (.case__hero arrives via the morph)
  '.case__head > *', '.case__inspect > div',
  '.case__section > *', '.case__results', '.case__next',
].join(', ');
// Reveal units that are mostly picture
const MEDIA = '.project-card .frame, .freelance__strip, .about__frame, .case__media, .compare, .case__next';

// Mobile (< 900px) is gentler: shorter travel over a thinner band, or tall units on a short
// screen spend most of their time half-faded and drifting
const small = matchMedia('(max-width: 899px)').matches;
const SHIFT = small ? 12 : 30;    // px of travel at the very edge
const EDGE = small ? 0.06 : 0.12; // share of the viewport over which a unit enters / leaves
const MOBILE_LEAD = 0.05; // mobile: entrance starts this share of the viewport before the unit enters

let smoother = null;

export function initMotion() {
  if (!enabled) return;
  gsap.registerPlugin(ScrollTrigger, ScrollSmoother);
  // iOS address bar show/hide resizes the viewport: don't recompute every trigger mid-scroll
  ScrollTrigger.config({ ignoreMobileResize: true });
  document.documentElement.classList.add('has-smoother');
  smoother = ScrollSmoother.create({
    wrapper: '#smooth-wrapper',
    content: '#smooth-content',
    smooth: 0.35,       // seconds to catch up: snappier, more direct
    smoothTouch: false, // touch keeps native momentum
    effects: false,
    wholePixels: true,  // round the content's translate: no sub-pixel text shimmer while it eases to rest
  });
}

// ── Scroll helpers (work with or without the smoother) ──
// Native fallback runs exactly when reduced motion is on, and an explicit JS 'smooth'
// beats CSS scroll-behavior, so jump instantly then.
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const behavior = (smooth) => (smooth && !reduceMotion.matches ? 'smooth' : 'instant');

export const getScrollY = () => (smoother ? smoother.scrollTop() : window.scrollY);

export const scrollToY = (y, smooth = false) => {
  if (smoother) smoother.scrollTo(y, smooth);
  else window.scrollTo({ top: y, behavior: behavior(smooth) });
};

// Layout position from offsetTop, which ignores transforms: rect-based measuring (smoother's
// own scrollTo(el)) picks up the content's mid-ease lag and reveal drift, and lands off target
const layoutTop = (el) => {
  let y = 0;
  for (let n = el; n; n = n.offsetParent) y += n.offsetTop;
  return y;
};

export const scrollToEl = (el, { smooth = true, center = false } = {}) => {
  if (!el) return;
  if (smoother) {
    const top = layoutTop(el);
    smoother.scrollTo(center ? top + el.offsetHeight / 2 - innerHeight / 2 : top - NAV_OFFSET, smooth);
  } else el.scrollIntoView({ behavior: behavior(smooth), block: center ? 'center' : 'start' });
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
  // Entrances are clamp()ed so units at the very end of the page still finish arriving at
  // max scroll (the footer's last lines stayed half-faded otherwise). Exits are NOT clamped:
  // a unit that can never reach the top edge must simply never leave.
  const inStart = 'clamp(top bottom)';
  const inEnd = `clamp(top ${(1 - EDGE) * 100}%)`;
  const outStart = `bottom ${EDGE * 100}%`;
  const outEnd = 'bottom top';
  els.forEach((el) => {
    el.dataset.reveal = '';
    // Already in view at scroll 0 (case study intro): nothing to enter. Its entrance range would
    // clamp to a zero-length span at scroll 0, which leaves it stuck hidden until you scroll.
    const pageTop = el.getBoundingClientRect().top + getScrollY();
    // Mobile: touch scroll runs on the compositor while scrubbed tweens update on the main
    // thread, so scroll-linked units trail and stutter (iPhone). Timed entrance instead, played
    // once the unit crosses the edge band (reversed if you scroll back); no exits.
    if (small) {
      if (pageTop < innerHeight * (1 - EDGE)) return;
      // Fires just BEFORE the unit enters (top still MOBILE_LEAD below the screen), so it's
      // mostly in place by the time it's seen; reverses only once it's back off screen
      // Big image blocks need longer than text: a whole-width picture fading in 240ms flashes
      const big = el.matches(MEDIA);
      gsap.fromTo(el, { y: SHIFT, autoAlpha: 0 }, {
        y: 0, autoAlpha: 1, duration: big ? 0.36 : 0.24, ease: big ? 'sine.out' : 'power2.out',
        scrollTrigger: { trigger: el, start: `top ${(1 + MOBILE_LEAD) * 100}%`, toggleActions: 'play none none reverse' },
      });
      return;
    }
    if (pageTop >= innerHeight * (1 - EDGE)) {
      gsap.fromTo(el, { y: SHIFT, autoAlpha: 0 }, {
        y: 0, autoAlpha: 1, ease: 'power1.out', snap: { y: 1 },
        scrollTrigger: { trigger: el, start: inStart, end: inEnd, scrub: true },
      });
    }
    gsap.fromTo(el, { y: 0, autoAlpha: 1 }, {
      y: -SHIFT, autoAlpha: 0, ease: 'power1.in', immediateRender: false, snap: { y: 1 },
      scrollTrigger: { trigger: el, start: outStart, end: outEnd, scrub: true },
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

// "All work": starts in the page (at the placeholder's spot) and travels up with it; when
// it reaches the nav row it docks there instead of sliding under the bar. In the last
// stretch before docking, the name slides right to make room. Scroll-driven both ways.
// Returns a cleanup that puts everything back.
export function dockBack(placeholder) {
  const back = document.querySelector('.nav__back');
  const brand = document.querySelector('.nav__brand');
  if (!enabled || !placeholder || !back || !brand) return () => {};
  const docked = back.getBoundingClientRect().top - (gsap.getProperty(back, 'y') || 0);
  const offset = Math.max(1, placeholder.getBoundingClientRect().top + getScrollY() - docked);
  // Name ends one gap to the right of the docked link (measured, not assumed)
  const b = back.getBoundingClientRect();
  const shift = b.left + b.width + 20 - (brand.getBoundingClientRect().left - (gsap.getProperty(brand, 'x') || 0));
  // The name makes room while the link crosses into the nav row, finishing just before it docks
  const lead = Math.min(56, offset);
  const done = Math.min(12, offset - lead);

  const tl = gsap.timeline({
    scrollTrigger: { start: 0, end: offset, scrub: true },
  });
  tl.fromTo(back, { y: offset }, { y: 0, ease: 'none', duration: offset }, 0)
    .fromTo(brand, { x: 0 }, { x: shift, ease: 'power2.inOut', duration: lead }, offset - lead - done);
  return () => {
    tl.scrollTrigger?.kill();
    tl.kill();
    gsap.set([back, brand], { clearProps: 'transform' });
  };
}

export const motionEnabled = () => enabled;
