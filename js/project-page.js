import { showForProject } from './lets-talk.js';
import { openGallery } from './gallery.js';

const container = document.getElementById('project-view');
let _currentId = null;
let _cleanup = null;
let _allProjects = null;

// Flatten all projects from data.json into [{id, title, hero}]
async function getAllProjects() {
  if (_allProjects) return _allProjects;
  const res = await fetch('content/data.json');
  const data = await res.json();
  const projects = [];
  for (const company of data.work) {
    for (const p of company.projects) {
      projects.push({ id: p.id, title: p.title || company.company });
    }
  }
  // Fetch hero images + role/period from per-project JSONs
  await Promise.all(projects.map(async (p) => {
    try {
      const r = await fetch(`content/${p.id}.json`);
      const d = await r.json();
      p.hero = d.hero?.src || '';
      p.heroAlt = d.hero?.alt || '';
      p.role = d.role || '';
      p.period = d.period || '';
    } catch { p.hero = ''; p.heroAlt = ''; p.role = ''; p.period = ''; }
  }));
  _allProjects = projects;
  return _allProjects;
}

export async function showProject(projectId, lenis) {
  // Clean up any lingering state from a previous project (covers rapid re-navigation)
  if (_cleanup) { _cleanup(); _cleanup = null; }

  _currentId = projectId;
  container.hidden = false;
  container.innerHTML = '<div class="project-page__loading"></div>';

  try {
    const res = await fetch(`content/${projectId}.json`);
    if (!res.ok) throw new Error(`${res.status}`);
    const project = await res.json();
    if (_currentId !== projectId) return;
    await render(project, lenis);
  } catch (err) {
    container.innerHTML = `<p class="project-page__error">Could not load project.</p>`;
    console.warn('[project-page]', err.message);
  }
}

// Footer row markup ("More Work"). Excludes currentId.
function renderProjectRows(projects, currentId) {
  const arrowSvg = `<svg class="project-footer__arrow" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.5 18H28.5M28.5 18L19.5 9M28.5 18L19.5 27" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  return projects
    .filter(p => p.id !== currentId)
    .map(p => {
      const meta = [p.role, p.period].filter(Boolean).join('  / ');
      return `
    <a class="project-footer__row" href="#/work/${p.id}">
      <div class="project-footer__row-bg">
        ${p.hero ? `<img src="${p.hero}" alt="" loading="lazy" />` : ''}
      </div>
      <div class="project-footer__title-group">
        <span class="project-footer__title">${p.title}</span>
        ${meta ? `<span class="project-footer__role">${meta}</span>` : ''}
      </div>
      ${arrowSvg}
    </a>`;
    })
    .join('');
}

// Burger menu rows — distinct from the footer: compact glass buttons in a row
// (the burger morphs into a glass panel of them). Last item is the X close.
function renderMenuRows(projects, currentId) {
  // --i drives the mobile stagger, set in visual top-to-bottom order
  // (close sits on top, then project rows, then Contact at the bottom)
  const items = projects.filter(p => p.id !== currentId);
  const rows = items.map((p, k) => `
    <a class="project-menu__item" href="#/work/${p.id}" style="--i:${k + 1}">
      <span class="project-menu__label">${p.title}</span>
    </a>`).join('');
  // Contact lives in the menu on mobile only (desktop uses the flying button)
  const contact = `
    <a class="project-menu__item project-menu__item--contact" href="mailto:mirko.aus@proton.me" aria-label="Send Mirko an email" style="--i:${items.length + 1}">
      <span class="project-menu__label">Contact</span>
    </a>`;
  const closeSvg = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L13 13M13 1L1 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
  const close = `
    <button class="project-menu__item project-menu__item--close" type="button" aria-label="Close menu" style="--i:0">
      <span class="project-menu__label">${closeSvg}</span>
    </button>`;
  return rows + contact + close;
}

async function render(project, lenis) {

  const allProjects = await getAllProjects();
  const footerRows = renderProjectRows(allProjects, project.id);

  container.innerHTML = `
    <article class="project-page">
      <section class="project-page__hero" aria-label="Project hero">
        <div class="project-page__hero-img-wrap">
          <img class="project-page__hero-img" src="${project.hero.src}" alt="${project.hero.alt}" />
        </div>
        <div class="project-page__info-card">
          <div class="project-page__info-header">
            <div class="project-page__info-title-group">
              <p class="project-page__info-title">${project.title}</p>
              <p class="project-page__info-role">${project.role} · ${project.period}</p>
            </div>
          </div>
        </div>
      </section>
      <div class="project-page__content">
        <div class="project-page__body">
          ${project.sections.map(renderSection).join('')}
        </div>
      </div>
      <nav class="project-footer" aria-label="Other projects">
        <span class="project-footer__label">More Work</span>
        ${footerRows}
      </nav>
      <div class="project-menu__backdrop" hidden></div>
      <nav class="project-menu" id="project-menu" aria-label="Projects" hidden>
        ${renderMenuRows(allProjects, project.id)}
      </nav>
    </article>`;

  // Reveals + contact button + burger menu + image gallery
  const cleanReveals = initProjectReveals();
  const cleanFooterArrows = initFooterArrows();
  const cleanBurgerMenu = initBurgerMenu(lenis);
  const cleanGallery = initProjectGallery();
  const cleanHeroParallax = initHeroParallax(lenis);
  showForProject();

  _cleanup = () => {
    if (cleanReveals) cleanReveals();
    if (cleanFooterArrows) cleanFooterArrows();
    if (cleanBurgerMenu) cleanBurgerMenu();
    if (cleanGallery) cleanGallery();
    if (cleanHeroParallax) cleanHeroParallax();
  };
}

// ── Hero image parallax — drifts slower than content as it scrolls away ──
// Mirrors the index hero feel: foreground leaves, background lags behind.

function initHeroParallax(lenis) {
  const noMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (noMotion) return null;

  const hero = container.querySelector('.project-page__hero');
  const img  = container.querySelector('.project-page__hero-img');
  if (!hero || !img) return null;

  const FACTOR = 0.4; // 0 = scrolls with content, 1 = fully fixed
  img.style.willChange = 'transform';

  function onScroll() {
    // Only animate while hero still touches the viewport
    if (hero.getBoundingClientRect().bottom <= 0) return;
    const y = (lenis ? lenis.scroll : window.scrollY) * FACTOR;
    img.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
  }

  if (lenis) lenis.on('scroll', onScroll);
  else window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  return () => {
    if (lenis) lenis.off('scroll', onScroll);
    else window.removeEventListener('scroll', onScroll);
    img.style.willChange = '';
    img.style.transform = '';
  };
}

// ── Content images → gallery overlay ──────────────────
// Every content image on the page becomes one filmstrip entry.

function initProjectGallery() {
  const figures = [...container.querySelectorAll(
    '.project-page__section-image, .project-page__section--image-only'
  )];
  if (!figures.length) return null;

  const list = figures.map(fig => {
    const img = fig.querySelector('img');
    const cap = fig.querySelector('figcaption');
    return {
      src: img.getAttribute('src'),
      alt: img.getAttribute('alt') || '',
      caption: cap ? cap.textContent : '',
    };
  });

  const handlers = [];
  figures.forEach((fig, i) => {
    fig.classList.add('is-zoomable');
    const onClick = () => openGallery(list, i, fig);
    fig.addEventListener('click', onClick);
    handlers.push({ fig, onClick });
  });

  return () => handlers.forEach(({ fig, onClick }) =>
    fig.removeEventListener('click', onClick));
}

// ── Footer arrow hover (mirrors See-More) ─────────────

function initFooterArrows() {
  if (typeof gsap === 'undefined') return null;
  const rows = container.querySelectorAll('.project-footer__row');
  if (!rows.length) return null;

  const handlers = [];

  rows.forEach(row => {
    const arrow = row.querySelector('.project-footer__arrow');
    if (!arrow) return;

    const onEnter = () => {
      gsap.killTweensOf(arrow);
      gsap.timeline()
        .to(arrow, { x: 24, opacity: 0, duration: 0.25, ease: 'power3.in' })
        .set(arrow, { x: -16 })
        .to(arrow, { x: 0, opacity: 1, duration: 0.4, ease: 'power3.out' });
    };

    const onLeave = () => {
      gsap.killTweensOf(arrow);
      gsap.to(arrow, { x: 0, opacity: 1, duration: 0.3, ease: 'power2.out' });
    };

    row.addEventListener('mouseenter', onEnter);
    row.addEventListener('mouseleave', onLeave);
    handlers.push({ row, onEnter, onLeave });
  });

  return () => {
    handlers.forEach(({ row, onEnter, onLeave }) => {
      row.removeEventListener('mouseenter', onEnter);
      row.removeEventListener('mouseleave', onLeave);
    });
  };
}

// ── Section renderer ──────────────────────────────────

function renderSection(section) {
  switch (section.type) {
    case 'image-left':
      return `<div class="project-page__section project-page__section--img-text-left">
        <div class="project-page__section-text">
          ${section.content.map(p => `<p>${p}</p>`).join('')}
        </div>
        <figure class="project-page__section-image">
          <img src="${section.src}" alt="${section.alt}" loading="lazy" />
        </figure>
      </div>`;

    case 'image-right':
      return `<div class="project-page__section project-page__section--img-text-right">
        <div class="project-page__section-text">
          ${section.content.map(p => `<p>${p}</p>`).join('')}
        </div>
        <figure class="project-page__section-image">
          <img src="${section.src}" alt="${section.alt}" loading="lazy" />
        </figure>
      </div>`;

    case 'image-only':
      return `<figure class="project-page__section project-page__section--image-only">
        <div class="project-page__image-frame">
          <img src="${section.src}" alt="${section.alt}" loading="lazy" />
        </div>
        ${section.caption ? `<figcaption>${section.caption}</figcaption>` : ''}
      </figure>`;

    case 'text-only':
      return `<div class="project-page__section project-page__section--text-only">
        ${section.content.map(p => `<p>${p}</p>`).join('')}
      </div>`;

    // Two images side-by-side, paragraph below the first (left) image
    case 'pair-text':
      return `<div class="project-page__section project-page__section--pair-text">
        <div class="project-page__pair-imgs">
          ${section.images.map(img => `
            <figure class="project-page__section-image">
              <img src="${img.src}" alt="${img.alt}" loading="lazy" />
            </figure>`).join('')}
        </div>
        <div class="project-page__pair-textblock">
          ${section.content.map(p => `<p>${p}</p>`).join('')}
        </div>
      </div>`;

    // Legacy compat
    case 'text':
      return `<div class="project-page__section project-page__section--text-only">
        ${section.content.map(p => `<p>${p}</p>`).join('')}
      </div>`;

    case 'image':
      return `<figure class="project-page__section project-page__section--image-only">
        <div class="project-page__image-frame">
          <img src="${section.src}" alt="${section.alt}" loading="lazy" />
        </div>
        ${section.caption ? `<figcaption>${section.caption}</figcaption>` : ''}
      </figure>`;

    case 'image-pair':
      return `<div class="project-page__section project-page__section--image-pair">
        ${section.images.map(img => `
          <figure>
            <img src="${img.src}" alt="${img.alt}" loading="lazy" />
            ${img.caption ? `<figcaption>${img.caption}</figcaption>` : ''}
          </figure>`).join('')}
      </div>`;

    // Three images side-by-side, no text
    case 'image-trio':
      return `<div class="project-page__section project-page__section--image-trio">
        ${section.images.map(img => `
          <figure>
            <img src="${img.src}" alt="${img.alt}" loading="lazy" />
            ${img.caption ? `<figcaption>${img.caption}</figcaption>` : ''}
          </figure>`).join('')}
      </div>`;

    default:
      return '';
  }
}

// ── Scroll reveals on content sections ────────────────

function initProjectReveals() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return null;
  const noMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (noMotion) return null;

  const sections = container.querySelectorAll('.project-page__section');
  if (!sections.length) return null;

  const isMobile = window.matchMedia('(max-width: 768px)').matches;

  gsap.set(sections, { y: 50, opacity: 0 });

  // Snapshot triggers before batch so we can diff after
  const before = new Set(ScrollTrigger.getAll());

  ScrollTrigger.batch(sections, {
    onEnter: batch => gsap.to(batch, {
      y: 0, opacity: 1,
      duration: 0.9,
      stagger: 0.12,
      ease: 'power3.out',
    }),
    start: isMobile ? '10% bottom' : 'top 95%',
    once: true,
  });

  const batchTriggers = ScrollTrigger.getAll().filter(t => !before.has(t));

  ScrollTrigger.refresh();

  // Content images are lazy + have no reserved height. At refresh they're
  // collapsed, so later sections' trigger positions cache too high and their
  // reveal fires off-screen. Re-refresh as each image loads to correct the
  // downstream positions before they're scrolled into view.
  const imgs = [...container.querySelectorAll('.project-page__content img')];
  let rafId = 0;
  const scheduleRefresh = () => {
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => ScrollTrigger.refresh());
  };
  const pending = imgs.filter(img => !img.complete);
  pending.forEach(img => img.addEventListener('load', scheduleRefresh));

  return () => {
    cancelAnimationFrame(rafId);
    pending.forEach(img => img.removeEventListener('load', scheduleRefresh));
    batchTriggers.forEach(t => t.kill());
  };
}


// ── Burger menu: reveal + open/close ──────────────────

function initBurgerMenu(lenis) {
  const burger   = document.querySelector('.nav__burger');
  const panel    = container.querySelector('.project-menu');
  const backdrop = container.querySelector('.project-menu__backdrop');
  if (!burger || !panel || !backdrop) return null;

  burger.hidden = false;
  let open = false;

  function setOpen(next) {
    if (next === open) return;
    open = next;
    burger.setAttribute('aria-expanded', String(open));
    if (open) {
      // burger fades out as the panel grows over it
      burger.classList.add('nav__burger--open');
      panel.hidden = false;
      backdrop.hidden = false;
      // force reflow so the closed state is committed as the transition's
      // starting point — a single rAF batches with the unhide and skips it
      void panel.offsetWidth;
      panel.classList.add('project-menu--open');
      backdrop.classList.add('project-menu__backdrop--open');
    } else {
      // reverse the morph: collapse the panel first, then bring the burger
      // back once the panel has shrunk into its spot — otherwise the burger
      // pops up in the middle of the still-collapsing panel
      panel.classList.remove('project-menu--open');
      backdrop.classList.remove('project-menu__backdrop--open');
      setTimeout(() => { if (!open) burger.classList.remove('nav__burger--open'); }, 280);
      // hide after the morph completes so it leaves the a11y tree
      setTimeout(() => { if (!open) { panel.hidden = true; backdrop.hidden = true; } }, 450);
    }
  }

  const onBurger   = () => setOpen(!open);
  const onBackdrop = () => setOpen(false);
  const onRow      = () => setOpen(false);              // navigation happens via href
  const onKey      = (e) => { if (e.key === 'Escape' && open) { setOpen(false); burger.focus(); } };
  const onScroll   = () => { if (open) setOpen(false); };  // close on any scroll intent

  burger.addEventListener('click', onBurger);
  backdrop.addEventListener('click', onBackdrop);
  panel.querySelectorAll('.project-menu__item').forEach(r => r.addEventListener('click', onRow));
  document.addEventListener('keydown', onKey);
  window.addEventListener('wheel', onScroll, { passive: true });
  window.addEventListener('touchmove', onScroll, { passive: true });
  if (lenis) lenis.on('scroll', onScroll);

  // Visible for the whole project page
  burger.classList.add('nav__burger--visible');

  return () => {
    setOpen(false);
    burger.removeEventListener('click', onBurger);
    backdrop.removeEventListener('click', onBackdrop);
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('wheel', onScroll);
    window.removeEventListener('touchmove', onScroll);
    if (lenis) lenis.off('scroll', onScroll);
    burger.classList.remove('nav__burger--visible', 'nav__burger--open');
    burger.setAttribute('aria-expanded', 'false');
    burger.hidden = true;
  };
}

// ── Public: hide project ──────────────────────────────

export function hideProject() {
  _currentId = null;
  if (_cleanup) { _cleanup(); _cleanup = null; }
  container.hidden = true;
  container.innerHTML = '';
}
