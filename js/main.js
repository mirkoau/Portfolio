import { initContent, dragScroll } from './content.js';
import { initHero } from './hero.js';
import { initGallery, openLightbox, dismissLightbox } from './gallery.js';
import { initRouter, parseHash } from './router.js';
import { showProject, hideProject, loadProject, heroEl } from './project-page.js';
import { initMotion, reveal, refresh, prune, settleVisible, dockBack, getScrollY, scrollToY, scrollToEl } from './motion.js';
import { initDrawLines } from './drawline.js';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const NAV_SCROLLED_AT = 8;

// Deep link to a case study: start its fetch in parallel with data.json
const initial = parseHash(location.hash);
if (initial.view === 'project') loadProject(initial.projectId).catch(() => {});

initMotion(); // before content renders, so reveals register against the smoother
initHero();
initGallery();
decodeEmails();
initCopyEmail();
initNavState();

let data = null;
try {
  data = await initContent();
} catch (err) {
  console.warn('[content]', err.message);
}

if (data) {
  initFreelance(data.freelance.items);
  initNavSpy();
  reveal();
  refresh();
  initDrawLines();
  // Browser tried to jump to #about etc. before sections above it were rendered
  if (initial.view === 'index' && location.hash.length > 1) {
    scrollToEl(document.getElementById(location.hash.slice(1)), { smooth: false });
  }
}

// ── Email: obfuscated in markup, decoded at runtime ─────
function decodeEmails() {
  document.querySelectorAll('[data-c][data-d]').forEach(a => {
    a.href = `mailto:${atob(a.dataset.c)}@${atob(a.dataset.d)}`;
    a.removeAttribute('data-c');
    a.removeAttribute('data-d');
  });
}

function initCopyEmail() {
  const btn = document.querySelector('[data-copy-email]');
  const live = document.querySelector('[data-live]');
  const email = document.querySelector('a[href^="mailto:"]')?.href.slice('mailto:'.length);
  if (!btn || !email) return;
  btn.querySelector('[data-email-text]').textContent = email;
  let timer;
  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(email);
    } catch {
      return; // clipboard blocked: mailto button remains
    }
    btn.classList.add('is-copied');
    live.textContent = `Copied ${email}`;
    clearTimeout(timer);
    timer = setTimeout(() => btn.classList.remove('is-copied'), 1800);
  });
}

// ── Nav ─────────────────────────────────────────────────
function initNavState() {
  const nav = document.querySelector('[data-nav]');
  const onScroll = () => nav.classList.toggle('is-scrolled', getScrollY() > NAV_SCROLLED_AT);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Footer under the nav band → light nav text (nav has no fill of its own)
  const footer = document.querySelector('.footer');
  new IntersectionObserver(([e]) => nav.classList.toggle('is-on-dark', e.isIntersecting), {
    rootMargin: '0px 0px -92% 0px', // a band about the nav's height at the top
  }).observe(footer);
}

function initNavSpy() {
  const links = [...document.querySelectorAll('.nav__link')];
  const byId = new Map(links.map(a => [a.getAttribute('href').slice(1), a]));
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => byId.get(en.target.id)?.classList.toggle('is-active', en.isIntersecting));
  }, { rootMargin: '-45% 0px -50% 0px' });
  byId.forEach((_, id) => {
    const el = document.getElementById(id);
    if (el) io.observe(el);
  });
}

function initFreelance(items) {
  const strip = document.querySelector('[data-freelance]');
  strip.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-freelance-idx]');
    if (btn) openLightbox(items, Number(btn.dataset.freelanceIdx), thumbOf);
  });
  // Thumbnail of item i for the lightbox morph; scrolls the strip so it's in view when closing
  const thumbOf = (i) => {
    const el = strip.querySelector(`[data-freelance-idx="${i}"]`);
    if (!el) return null;
    const s = strip.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    if (r.left < s.left) strip.scrollLeft -= s.left - r.left;
    else if (r.right > s.right) strip.scrollLeft += r.right - s.right;
    return el.querySelector('img, video');
  };
  const stopGlide = dragScroll(strip, { glide: true });
  initStripBar(strip, document.querySelector('[data-freelance-bar]'), stopGlide);
}

// Custom scrollbar for the strip: the strip bleeds to the screen edge, the bar only
// spans the content column. Thumb drag and track click both scroll the strip.
function initStripBar(strip, bar, stopGlide) {
  const thumb = bar.firstElementChild;
  let raf = 0;
  let thumbW = 0;
  let travel = 0; // px the thumb can move

  const maxScroll = () => strip.scrollWidth - strip.clientWidth;
  const sync = () => {
    raf = 0;
    const max = maxScroll();
    bar.hidden = max <= 1;
    if (bar.hidden) return;
    thumbW = Math.max(bar.clientWidth * (strip.clientWidth / strip.scrollWidth), 48);
    travel = bar.clientWidth - thumbW;
    bar.style.setProperty('--thumb-w', `${thumbW}px`);
    bar.style.setProperty('--thumb-x', `${(strip.scrollLeft / max) * travel}px`);
  };
  const queue = () => { if (!raf) raf = requestAnimationFrame(sync); };

  strip.addEventListener('scroll', queue, { passive: true });
  new ResizeObserver(queue).observe(strip);
  strip.addEventListener('load', queue, true); // images/videos change scrollWidth as they load
  strip.addEventListener('loadedmetadata', queue, true);
  sync();

  const scrollToThumbX = (x) => {
    strip.scrollLeft = (Math.min(Math.max(x, 0), travel) / travel) * maxScroll();
  };

  bar.addEventListener('mousedown', (e) => e.preventDefault()); // dragging the thumb must not select text
  bar.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    stopGlide();
    const r = bar.getBoundingClientRect();
    const t = thumb.getBoundingClientRect();
    const onThumb = e.clientX >= t.left && e.clientX <= t.right; // the hit area is taller than the thumb
    // Track click: centre the thumb under the pointer, then keep dragging from there
    const grab = onThumb ? e.clientX - t.left : thumbW / 2;
    if (!onThumb) scrollToThumbX(e.clientX - r.left - grab);

    bar.setPointerCapture(e.pointerId);
    bar.classList.add('is-dragging');
    strip.classList.add('is-free');
    const drag = new AbortController();
    const on = (type, fn) => bar.addEventListener(type, fn, { signal: drag.signal });
    const end = () => {
      bar.classList.remove('is-dragging');
      strip.classList.remove('is-free');
      drag.abort();
    };
    on('pointermove', (ev) => scrollToThumbX(ev.clientX - r.left - grab));
    on('pointerup', end);
    on('pointercancel', end);
  });
}

// Brand link on index: route is unchanged, so the router won't act
document.querySelector('[data-home]').addEventListener('click', (e) => {
  if (document.body.classList.contains('is-project')) return;
  e.preventDefault();
  scrollToY(0, true);
});

// In-page anchors (#work, #about, skip link, case TOC) scroll through the eased scroller
// without touching location.hash (it holds the route). Route links (#/work/…) are left to
// the router. preventDefault also cancels the browser's focus move, so do it by hand:
// keyboard users land on the target (skip link must actually skip).
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]:not([href^="#/"])');
  if (!a || a.matches('[data-to-contact]')) return;
  const target = document.getElementById(a.getAttribute('href').slice(1));
  if (!target) return;
  e.preventDefault();
  scrollToEl(target);
  if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
});

// #contact would be parsed as a route change; scroll instead, from any view
document.querySelector('[data-to-contact]').addEventListener('click', (e) => {
  e.preventDefault();
  scrollToEl(document.getElementById('contact'));
  document.querySelector('[data-copy-email]').focus({ preventScroll: true });
});

document.addEventListener('pointerover', (e) => {
  const card = e.target.closest?.('[data-project]');
  if (card) loadProject(card.dataset.project).catch(() => {});
});

// ── Views + view transitions ────────────────────────────
// The clicked card's image morphs into the case study hero (and back).
let indexScroll = 0;
let undock = () => {};
let morphEl = null;
let pendingSource = null;

// Views swap synchronously: re-measure before jumping so the smoother knows the new height
const jump = (y) => { refresh(); scrollToY(y); };

const cardMedia = (id) =>
  document.querySelector(`#index-view [data-project="${id}"] [data-vt="media"]`);

function setMorph(el) {
  morphEl?.style.removeProperty('view-transition-name');
  morphEl = el;
  if (el) el.style.viewTransitionName = 'project-media';
}

function transition(update) {
  if (!document.startViewTransition || reduceMotion.matches) {
    return Promise.resolve(update());
  }
  const vt = document.startViewTransition(update);
  vt.ready.catch(() => {}); // rejects when a newer transition skips this one; expected on fast back
  vt.finished.finally(() => setMorph(null));
  return vt.updateCallbackDone;
}

// Fetch first, then transition: a view transition freezes rendering until its update
// callback finishes, so no network wait may happen inside it.
async function toProject(id, sourceEl) {
  const fromProject = document.body.classList.contains('is-project');
  // Before the fetch: Back during a slow load must still return to this spot
  if (!fromProject) indexScroll = getScrollY();
  const p = await loadProject(id).catch((err) => {
    console.warn('[case]', err.message);
    return null;
  });
  if (location.hash !== `#/work/${id}`) return; // route changed mid-fetch
  setMorph(sourceEl);
  return transition(() => {
    showProject(p);
    document.body.classList.add('is-project');
    prune();
    undock();
    setMorph(heroEl());
    jump(0);
    undock = dockBack(document.querySelector('.case__dock'));
    reveal(document.getElementById('project-view'));
    initDrawLines(document.getElementById('project-view'));
    settleVisible(document.getElementById('project-view'));
  });
}

function toIndex(fromId) {
  setMorph(heroEl());
  return transition(() => {
    undock();
    undock = () => {};
    hideProject();
    document.body.classList.remove('is-project');
    prune();
    jump(indexScroll);
    // After "next case study" hops, the card for fromId may be far from indexScroll
    const card = fromId && cardMedia(fromId);
    if (!card) return setMorph(null);
    const r = card.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) scrollToEl(card, { smooth: false, center: true });
    settleVisible(document.getElementById('index-view'));
    setMorph(card);
  });
}

document.addEventListener('click', (e) => {
  const plain = e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
  const card = plain && e.target.closest('[data-project]');
  pendingSource = card ? card.querySelector('[data-vt="media"]') : null;
});

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

initRouter((route, prev) => {
  dismissLightbox(); // history nav (Back, Alt+Left) doesn't close a modal; it belongs to the old view
  if (route.view === 'project') {
    toProject(route.projectId, pendingSource);
    pendingSource = null;
  } else if (prev?.view === 'project') {
    toIndex(prev.projectId);
  }
});
