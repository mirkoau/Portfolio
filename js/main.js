import { initContent } from './content.js';
import { initHero } from './hero.js';
import { initGallery, openLightbox } from './gallery.js';
import { initRouter } from './router.js';
import { showProject, hideProject, loadProject } from './project-page.js';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const live = document.querySelector('[data-live]');
const nav = document.querySelector('[data-nav]');
let email = '';

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
}

// ── Email: obfuscated in markup, decoded at runtime ─────
function decodeEmails() {
  document.querySelectorAll('[data-c][data-d]').forEach(a => {
    email = `${atob(a.dataset.c)}@${atob(a.dataset.d)}`;
    a.href = `mailto:${email}`;
    a.removeAttribute('data-c');
    a.removeAttribute('data-d');
  });
}

function initCopyEmail() {
  const btn = document.querySelector('[data-copy-email]');
  if (!btn) return;
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

// ── Nav: hairline once scrolled; active link per section ─
function initNavState() {
  const onScroll = () => nav.classList.toggle('is-scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

function initNavSpy() {
  const links = [...document.querySelectorAll('.nav__link')];
  const byId = new Map(links.map(a => [a.getAttribute('href').slice(1), a]));
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      const link = byId.get(en.target.id);
      if (link) link.classList.toggle('is-active', en.isIntersecting);
    });
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

// ── Prefetch case study JSON on intent ──────────────────
document.addEventListener('pointerover', (e) => {
  const card = e.target.closest?.('[data-project]');
  if (card) loadProject(card.dataset.project).catch(() => {});
});

// ── Views + view transitions ────────────────────────────
// Clicked card's image morphs into the case study hero (and back).
let indexScroll = 0;
let lastProjectId = null;

const jump = (y) => window.scrollTo({ top: y, behavior: 'instant' });

function setMorph(el) {
  document.querySelectorAll('[style*="view-transition-name"]').forEach(n => {
    n.style.removeProperty('view-transition-name');
  });
  if (el) el.style.viewTransitionName = 'project-media';
}

function transition(update) {
  if (!document.startViewTransition || reduceMotion.matches) {
    return Promise.resolve(update());
  }
  const vt = document.startViewTransition(update);
  vt.finished.finally(() => setMorph(null));
  return vt.updateCallbackDone;
}

const cardMedia = (id) =>
  document.querySelector(`#index-view [data-project="${id}"] [data-vt="media"]`);

async function toProject(id, fromProject, sourceEl) {
  setMorph(sourceEl);
  await transition(async () => {
    if (!fromProject) indexScroll = scrollY;
    document.body.classList.add('is-project');
    await showProject(id);
    setMorph(document.querySelector('.case__hero'));
    jump(0);
  });
  lastProjectId = id;
}

async function toIndex() {
  setMorph(document.querySelector('.case__hero'));
  const id = lastProjectId;
  await transition(() => {
    hideProject();
    document.body.classList.remove('is-project');
    jump(indexScroll);
    setMorph(id ? cardMedia(id) : null);
  });
  lastProjectId = null;
}

// Brand link on index: back to top (route unchanged, so router skips it)
document.querySelector('[data-home]').addEventListener('click', (e) => {
  if (document.body.classList.contains('is-project')) return;
  e.preventDefault();
  window.scrollTo({ top: 0 });
});

// Remember which element was clicked so the morph starts from it
let pendingSource = null;
document.addEventListener('click', (e) => {
  const card = e.target.closest('[data-project]');
  pendingSource = card ? card.querySelector('[data-vt="media"]') : null;
});

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

initRouter((route, prev) => {
  if (route.view === 'project') {
    toProject(route.projectId, prev?.view === 'project', pendingSource);
    pendingSource = null;
  } else if (prev?.view === 'project') {
    toIndex();
  }
});
