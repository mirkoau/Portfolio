import { navigate } from './router.js';

let data = null;
const contentReady = _init();

async function _init() {
  try {
    const res = await fetch('content/data.json');
    if (!res.ok) throw new Error(`${res.status}`);
    data = await res.json();
    renderWork(data.work);
    renderPersonalWork(data.personalWork);
    renderAbout(data.about);
  } catch (err) {
    console.warn('[content] static HTML fallback –', err.message);
  }
}

function buildProject(project, entry) {
  const cover = project.gallery[0];
  return `
    <div class="work__project" data-project-id="${project.id}">
      ${entry && project.title ? `<header class="work__entry-header"><div class="work__entry-heading"><p class="work__meta">${entry.company}</p><h2 class="work__role">${entry.role} — ${entry.period}</h2></div></header>` : ''}
      <button class="work__project-image" aria-label="View ${project.title || 'project'}" data-project-link="${project.id}">
        <img src="${cover.src}" alt="${cover.alt}" loading="lazy" />
      </button>
      <div class="work__project-text">
        <div class="work__project-header">
          ${entry && !project.title ? `<p class="work__meta">${entry.company}</p><h2 class="work__role">${entry.role} — ${entry.period}</h2>` : ''}
          ${project.title ? `<h3 class="work__project-title">${project.title}</h3>` : ''}
          ${project.role  ? `<p  class="work__project-role">${project.role}</p>`   : ''}
        </div>
        <div class="work__project-desc">
          ${project.body.map(p => `<p class="work__project-body">${p}</p>`).join('')}
          <span class="work__see-more" aria-hidden="true">See More <svg class="work__see-more-arrow" width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M4 9h10M10 5l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
        </div>
      </div>
    </div>`;
}

function buildEntry(entry) {
  return `
    <article class="work__entry" id="${entry.id}">
      ${entry.projects.map((project, i) => buildProject(project, i === 0 ? entry : null)).join('')}
    </article>`;
}

function renderWork(work) {
  const el = document.querySelector('#work .section-main');
  if (el) el.innerHTML = work.map(buildEntry).join('');
  initSeeMoreArrows();
  initSeeMoreInteractions();
  initProjectLinks();
}

function initProjectLinks() {
  document.querySelectorAll('[data-project-link]').forEach(btn => {
    const projectId = btn.dataset.projectLink;
    btn.addEventListener('click', () => {
      navigate(`#/work/${projectId}`);
    });
  });
  document.querySelectorAll('.work__project').forEach(project => {
    const seeMore = project.querySelector('.work__see-more');
    const btn = project.querySelector('[data-project-link]');
    if (!seeMore || !btn) return;
    seeMore.addEventListener('click', () => {
      navigate(`#/work/${btn.dataset.projectLink}`);
    });
  });
}

function initSeeMoreArrows() {
  if (typeof gsap === 'undefined') return;
  document.querySelectorAll('.work__project').forEach(project => {
    const arrow = project.querySelector('.work__see-more-arrow');
    if (!arrow) return;

    // Hover — arrow shoots right and snaps back from left
    const seeMore = project.querySelector('.work__see-more');
    if (!seeMore) return;

    seeMore.addEventListener('mouseenter', () => {
      gsap.timeline()
        .to(arrow, { x: 20, opacity: 0, duration: 0.25, ease: 'power3.in' })
        .set(arrow, { x: -12 })
        .to(arrow, { x: 0, opacity: 1, duration: 0.4, ease: 'power3.out' });
    });

    seeMore.addEventListener('mouseleave', () => {
      gsap.to(arrow, { x: 0, opacity: 1, duration: 0.3, ease: 'power2.out' });
    });
  });
}

function initSeeMoreInteractions() {
  if (typeof gsap === 'undefined') return;
  const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return;

  document.querySelectorAll('.work__see-more').forEach(el => {
    el.addEventListener('mouseenter', () => {
      gsap.to(el, { scale: 1.05, duration: 0.35, ease: 'power2.out' });
    });
    el.addEventListener('mouseleave', () => {
      gsap.to(el, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
    });
    el.addEventListener('mousedown', () => {
      gsap.to(el, { scale: 0.92, duration: 0.1, ease: 'power2.in' });
    });
    el.addEventListener('mouseup', () => {
      gsap.to(el, { scale: 1.06, duration: 0.4, ease: 'elastic.out(1, 0.5)' });
    });

  });
}

function renderPersonalWork(pw) {
  const el = document.querySelector('#personal-work .section-main');
  if (!el) return;
  el.innerHTML = `
    <div class="personal-work__grid">
      ${pw.items.map((item, i) => `
        <button class="personal-work__item" data-personal-trigger data-personal-idx="${i}" aria-label="View ${item.alt}">
          <span class="personal-work__media">
            <img src="${item.src}" alt="${item.alt}" loading="lazy" />
          </span>
        </button>`).join('')}
    </div>`;
}

function renderAbout(about) {
  const textEl     = document.querySelector('#about .about__text');
  const portraitEl = document.querySelector('#about .about__portrait');
  if (textEl)     textEl.innerHTML    = about.body.map(p => `<p class="about__body">${p}</p>`).join('');
  if (portraitEl) portraitEl.innerHTML =
    `<img src="${about.portrait.src}" alt="${about.portrait.alt}" loading="lazy" />`;
}

export async function initContent() { await contentReady; }
export { contentReady, data };
