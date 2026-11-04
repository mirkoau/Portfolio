import { initContent } from './content.js';
import { initHero } from './hero.js';
import { initGallery, openLightbox } from './gallery.js';
import { initRouter, parseHash } from './router.js';
import { showProject, hideProject, loadProject, heroEl } from './project-page.js';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const NAV_SCROLLED_AT = 8;

// Deep link to a case study: start its fetch in parallel with data.json
const initial = parseHash(location.hash);
if (initial.view === 'project') loadProject(initial.projectId).catch(() => {});

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
  // Browser tried to jump to #about etc. before sections above it were rendered
  if (initial.view === 'index' && location.hash.length > 1) {
    document.getElementById(location.hash.slice(1))?.scrollIntoView();
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
  const onScroll = () => nav.classList.toggle('is-scrolled', scrollY > NAV_SCROLLED_AT);
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
  document.querySelector('[data-freelance]').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-freelance-idx]');
    if (btn) openLightbox(items, Number(btn.dataset.freelanceIdx));
  });
}

// Brand link on index: route is unchanged, so the router won't act
document.querySelector('[data-home]').addEventListener('click', (e) => {
  if (document.body.classList.contains('is-project')) return;
  e.preventDefault();
  window.scrollTo({ top: 0 });
});

// #contact would be parsed as a route change; scroll instead, from any view
document.querySelector('[data-to-contact]').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('contact').scrollIntoView();
  document.querySelector('[data-copy-email]').focus({ preventScroll: true });
});

document.addEventListener('pointerover', (e) => {
  const card = e.target.closest?.('[data-project]');
  if (card) loadProject(card.dataset.project).catch(() => {});
});

// ── Views + view transitions ────────────────────────────
// The clicked card's image morphs into the case study hero (and back).
let indexScroll = 0;
let morphEl = null;
let pendingSource = null;

const jump = (y) => window.scrollTo({ top: y, behavior: 'instant' });

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

function toProject(id, sourceEl) {
  const fromProject = document.body.classList.contains('is-project');
  setMorph(sourceEl);
  return transition(async () => {
    if (!(await showProject(id))) return; // route changed mid-fetch
    if (!fromProject) indexScroll = scrollY;
    document.body.classList.add('is-project');
    setMorph(heroEl());
    jump(0);
  });
}

function toIndex(fromId) {
  setMorph(heroEl());
  return transition(() => {
    hideProject();
    document.body.classList.remove('is-project');
    jump(indexScroll);
    // After "next case study" hops, the card for fromId may be far from indexScroll
    const card = fromId && cardMedia(fromId);
    if (!card) return setMorph(null);
    const r = card.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) card.scrollIntoView({ block: 'center', behavior: 'instant' });
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
  if (route.view === 'project') {
    toProject(route.projectId, pendingSource);
    pendingSource = null;
  } else if (prev?.view === 'project') {
    toIndex(prev.projectId);
  }
});
