import { showForProject } from './lets-talk.js';

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

// Shared row markup for footer + burger menu. Excludes currentId.
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
              <p class="project-page__info-role">${project.role}  / ${project.period}</p>
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
        ${footerRows}
      </nav>
      <div class="project-menu__backdrop" hidden></div>
      <nav class="project-menu" id="project-menu" aria-label="Projects" hidden>
        ${footerRows}
      </nav>
    </article>`;

  // Reveals + contact button + burger menu
  const cleanReveals = initProjectReveals();
  const cleanFooterArrows = initFooterArrows();
  const cleanBurgerMenu = initBurgerMenu(lenis);
  showForProject();

  _cleanup = () => {
    if (cleanReveals) cleanReveals();
    if (cleanFooterArrows) cleanFooterArrows();
    if (cleanBurgerMenu) cleanBurgerMenu();
  };
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
        <img src="${section.src}" alt="${section.alt}" loading="lazy" />
        ${section.caption ? `<figcaption>${section.caption}</figcaption>` : ''}
      </figure>`;

    case 'text-only':
      return `<div class="project-page__section project-page__section--text-only">
        ${section.content.map(p => `<p>${p}</p>`).join('')}
      </div>`;

    // Legacy compat
    case 'text':
      return `<div class="project-page__section project-page__section--text-only">
        ${section.content.map(p => `<p>${p}</p>`).join('')}
      </div>`;

    case 'image':
      return `<figure class="project-page__section project-page__section--image-only">
        <img src="${section.src}" alt="${section.alt}" loading="lazy" />
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
    start: '20% bottom',
    once: true,
  });

  const batchTriggers = ScrollTrigger.getAll().filter(t => !before.has(t));

  ScrollTrigger.refresh();

  return () => {
    batchTriggers.forEach(t => t.kill());
  };
}


// ── Burger menu: reveal + open/close ──────────────────

function initBurgerMenu(lenis) {
  const burger   = document.querySelector('.nav__burger');
  const hero     = container.querySelector('.project-page__hero');
  const panel    = container.querySelector('.project-menu');
  const backdrop = container.querySelector('.project-menu__backdrop');
  if (!burger || !hero || !panel || !backdrop) return null;

  burger.hidden = false;
  let open = false;

  // Any scroll attempt while open closes the menu —
  // unless it's scrolling within an actually-scrollable panel
  const onScrollAttempt = (e) => {
    if (panel.contains(e.target) && panel.scrollHeight > panel.clientHeight) return;
    setOpen(false);
  };

  function setOpen(next) {
    if (next === open) return;
    open = next;
    burger.classList.toggle('nav__burger--open', open);
    burger.setAttribute('aria-expanded', String(open));
    if (open) {
      panel.hidden = false;
      backdrop.hidden = false;
      // next frame so transition runs from initial state
      requestAnimationFrame(() => {
        panel.classList.add('project-menu--open');
        backdrop.classList.add('project-menu__backdrop--open');
      });
      if (lenis) lenis.stop();
      window.addEventListener('wheel', onScrollAttempt, { passive: true });
      window.addEventListener('touchmove', onScrollAttempt, { passive: true });
    } else {
      panel.classList.remove('project-menu--open');
      backdrop.classList.remove('project-menu__backdrop--open');
      if (lenis) lenis.start();
      window.removeEventListener('wheel', onScrollAttempt);
      window.removeEventListener('touchmove', onScrollAttempt);
      // hide after transition so it leaves the a11y tree
      setTimeout(() => { if (!open) { panel.hidden = true; backdrop.hidden = true; } }, 400);
    }
  }

  const onBurger   = () => setOpen(!open);
  const onBackdrop = () => setOpen(false);
  const onRow      = () => setOpen(false);              // navigation happens via href
  const onKey      = (e) => { if (e.key === 'Escape' && open) { setOpen(false); burger.focus(); } };

  burger.addEventListener('click', onBurger);
  backdrop.addEventListener('click', onBackdrop);
  panel.querySelectorAll('.project-footer__row').forEach(r => r.addEventListener('click', onRow));
  document.addEventListener('keydown', onKey);

  // Reveal burger once scrolled past the hero
  function onScroll() {
    const past = hero.getBoundingClientRect().bottom <= 0;
    burger.classList.toggle('nav__burger--visible', past);
    if (!past && open) setOpen(false);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  if (lenis) lenis.on('scroll', onScroll);
  onScroll();

  return () => {
    setOpen(false);
    burger.removeEventListener('click', onBurger);
    backdrop.removeEventListener('click', onBackdrop);
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('scroll', onScroll);
    if (lenis) lenis.off('scroll', onScroll);
    burger.classList.remove('nav__burger--visible', 'nav__burger--open');
    burger.setAttribute('aria-expanded', 'false');
    burger.hidden = true;
    if (lenis) lenis.start();
  };
}

// ── Public: hide project ──────────────────────────────

export function hideProject() {
  _currentId = null;
  if (_cleanup) { _cleanup(); _cleanup = null; }
  container.hidden = true;
  container.innerHTML = '';
}
