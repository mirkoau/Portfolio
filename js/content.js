import { navigate } from './router.js';
import { HOVER, LEAVE, PRESS, RELEASE } from './lets-talk.js';

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
  const soon  = project.comingSoon;
  const image = soon
    ? `<div class="work__project-image work__project-image--soon"><img src="${cover.src}" alt="${cover.alt}" loading="lazy" /></div>`
    : `<button class="work__project-image" aria-label="View ${project.title || 'project'}" data-project-link="${project.id}"><img src="${cover.src}" alt="${cover.alt}" loading="lazy" /></button>`;
  const cta = soon
    ? `<span class="work__coming-soon">Coming Soon <svg class="work__coming-soon-x" aria-hidden="true" width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M5 5l8 8M13 5l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></span>`
    : `<span class="work__see-more" aria-hidden="true">See More <svg class="work__see-more-arrow" width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M4 9h10M10 5l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;
  return `
    <div class="work__project" data-project-id="${project.id}">
      ${entry && project.title ? `<header class="work__entry-header"><div class="work__entry-heading"><p class="work__meta">${entry.company}</p><h2 class="work__role">${entry.role} · ${entry.period}</h2></div></header>` : ''}
      ${image}
      <div class="work__project-text">
        <div class="work__project-header">
          ${entry && !project.title ? `<p class="work__meta">${entry.company}</p><h2 class="work__role">${entry.role} · ${entry.period}</h2>` : ''}
          ${project.title ? `<h3 class="work__project-title">${project.title}</h3>` : ''}
          ${project.role  ? `<p  class="work__project-role">${project.role}</p>`   : ''}
        </div>
        <div class="work__project-desc">
          ${project.body.map(p => `<p class="work__project-body">${p}</p>`).join('')}
          ${cta}
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
  if (!el) return;
  el.innerHTML = work.map(buildEntry).join('');
  initSeeMoreInteractions();
  initProjectLinks(el);
}

// Cover image + See More both open the project (Coming Soon has neither)
function initProjectLinks(root) {
  root.addEventListener('click', e => {
    const project = e.target.closest('.work__project');
    if (!project || !e.target.closest('[data-project-link], .work__see-more')) return;
    const btn = project.querySelector('[data-project-link]');
    if (btn) navigate(`#/work/${btn.dataset.projectLink}`);
  });
}

function initSeeMoreInteractions() {
  if (typeof gsap === 'undefined') return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  document.querySelectorAll('.work__see-more').forEach(el => {
    el.addEventListener('mouseenter', () => gsap.to(el, HOVER.nav));
    el.addEventListener('mouseleave', () => gsap.to(el, LEAVE.nav));
    el.addEventListener('mousedown',  () => gsap.to(el, PRESS));
    el.addEventListener('mouseup',    () => gsap.to(el, RELEASE));
  });

  // Coming Soon — size change on hover only (not clickable, no fill, no press)
  document.querySelectorAll('.work__coming-soon').forEach(el => {
    el.addEventListener('mouseenter', () => gsap.to(el, HOVER.nav));
    el.addEventListener('mouseleave', () => gsap.to(el, LEAVE.nav));
  });
}

function renderPersonalWork(pw) {
  const el = document.querySelector('#personal-work .section-main');
  if (!el) return;
  el.innerHTML = `
    ${pw.intro ? `<p class="personal-work__intro">${pw.intro}</p>` : ''}
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
