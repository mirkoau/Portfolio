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
  // Fetch hero images from per-project JSONs
  await Promise.all(projects.map(async (p) => {
    try {
      const r = await fetch(`content/${p.id}.json`);
      const d = await r.json();
      p.hero = d.hero?.src || '';
      p.heroAlt = d.hero?.alt || '';
    } catch { p.hero = ''; p.heroAlt = ''; }
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

async function render(project, lenis) {
  const tags = (project.tags || [])
    .map(t => `<span class="work__tag">${t}</span>`).join('');

  const allProjects = await getAllProjects();
  const footerProjects = allProjects.filter(p => p.id !== project.id);

  const arrowSvg = `<svg class="project-footer__arrow" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.5 18H28.5M28.5 18L19.5 9M28.5 18L19.5 27" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  const footerRows = footerProjects.map(p => `
    <a class="project-footer__row" href="#/work/${p.id}">
      <div class="project-footer__row-bg">
        ${p.hero ? `<img src="${p.hero}" alt="" loading="lazy" />` : ''}
      </div>
      <span class="project-footer__title">${p.title}</span>
      ${arrowSvg}
    </a>`).join('');

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
            ${project.intro ? `<p class="project-page__info-intro">${project.intro}</p>` : ''}
          </div>
          ${tags ? `<div class="work__project-tags">${tags}</div>` : ''}
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
    </article>`;

  // Snap scroll + reveals + contact button
  const cleanSnap = initProjectSnap(lenis);
  const cleanReveals = initProjectReveals();
  showForProject();

  _cleanup = () => {
    if (cleanSnap) cleanSnap();
    if (cleanReveals) cleanReveals();
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

// ── Snap scroll on project hero ───────────────────────

function initProjectSnap(lenis) {
  const heroEl = container.querySelector('.project-page__hero');
  const contentEl = container.querySelector('.project-page__content');
  if (!heroEl || !contentEl || !lenis) return null;

  const noMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let inHero = true;
  let snapping = false;

  const onWheel = (e) => {
    if (!inHero) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (snapping) return;
    if (e.deltaY > 0) {
      snapping = true;
      if (noMotion) {
        lenis.scrollTo(contentEl, { immediate: true });
        inHero = false;
        snapping = false;
      } else {
        lenis.scrollTo(contentEl, {
          duration: 1.2,
          easing: t => 1 - Math.pow(1 - t, 3),
          onComplete: () => { inHero = false; snapping = false; },
        });
      }
    }
  };

  let touchY0 = 0;
  const onTouchStart = (e) => {
    if (inHero) touchY0 = e.touches[0].clientY;
  };
  const onTouchMove = (e) => {
    if (!inHero) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (snapping) return;
    if (touchY0 - e.touches[0].clientY > 20) {
      snapping = true;
      if (noMotion) {
        lenis.scrollTo(contentEl, { immediate: true });
        inHero = false;
        snapping = false;
      } else {
        lenis.scrollTo(contentEl, {
          duration: 1.2,
          easing: t => 1 - Math.pow(1 - t, 3),
          onComplete: () => { inHero = false; snapping = false; },
        });
      }
    }
  };

  const onScroll = () => {
    if (inHero && !snapping && lenis.scroll >= heroEl.offsetHeight * 0.5) {
      inHero = false;
    }
    if (!inHero && lenis.scroll < 10) { inHero = true; snapping = false; }
  };

  window.addEventListener('wheel', onWheel, { passive: false, capture: true });
  window.addEventListener('touchstart', onTouchStart, { passive: true, capture: true });
  window.addEventListener('touchmove', onTouchMove, { passive: false, capture: true });
  lenis.on('scroll', onScroll);

  return () => {
    window.removeEventListener('wheel', onWheel, { capture: true });
    window.removeEventListener('touchstart', onTouchStart, { capture: true });
    window.removeEventListener('touchmove', onTouchMove, { capture: true });
    lenis.off('scroll', onScroll);
  };
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


// ── Public: hide project ──────────────────────────────

export function hideProject() {
  _currentId = null;
  if (_cleanup) { _cleanup(); _cleanup = null; }
  container.hidden = true;
  container.innerHTML = '';
}
