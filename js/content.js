// Fetches content/data.json and renders index sections.
// Content is first-party JSON, so plain template strings are fine here.

const isDev = ['localhost', '127.0.0.1', ''].includes(location.hostname);

export const todoNote = (text) =>
  isDev && text ? `<p class="todo">TODO: ${text}</p>` : '';

const ARROW_PATHS = { right: 'M4 9h10M10 5l4 4-4 4', left: 'M14 9H4M8 5L4 9l4 4' };

export const arrow = (dir = 'right') =>
  `<svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="${ARROW_PATHS[dir]}" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export const img = (m, attrs = '') =>
  `<img src="${m.src}" alt="${m.alt}" loading="lazy" decoding="async" ${attrs}/>`;

// Former GIFs: muted loops. preload=metadata so the box sizes from the video before playback.
export const media = (m, attrs = '') => m.video
  ? `<video muted loop playsinline preload="metadata" poster="${m.poster}" aria-label="${m.alt}" data-autoplay ${attrs}><source src="${m.video}" type="video/mp4" /></video>`
  : img(m, attrs);

// Loops play only while on screen; reduced-motion users keep the still poster
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const videoIO = new IntersectionObserver((entries) => entries.forEach(({ target: v, isIntersecting }) => {
  if (isIntersecting && !reduceMotion.matches) v.play().catch(() => {});
  else v.pause();
}), { rootMargin: '100px' });

export const observeVideos = (root) =>
  root.querySelectorAll('video[data-autoplay]').forEach(v => videoIO.observe(v));
export const unobserveVideos = (root) =>
  root.querySelectorAll('video[data-autoplay]').forEach(v => videoIO.unobserve(v));

const $ = (sel) => document.querySelector(sel);

let data = null;

export async function initContent() {
  const res = await fetch('content/data.json');
  if (!res.ok) throw new Error(`data.json ${res.status}`);
  data = await res.json();
  renderWork(data.work);
  renderApproach(data.approach);
  renderFreelance(data.freelance);
  renderAbout(data.about);
  return data;
}

export const caseStudies = () =>
  data.work.flatMap(c => c.projects.filter(p => !p.comingSoon));

export const frameMedia = (m) => `<span class="frame__media" data-vt="media">${img(m)}</span>`;

function projectCard(p) {
  const tag = p.comingSoon ? 'div' : 'a';
  const href = p.comingSoon ? '' : ` href="#/work/${p.id}" data-project="${p.id}" aria-label="${p.title} case study"`;
  const cta = p.comingSoon
    ? '<span class="project-card__cta project-card__cta--soon">Case study after launch</span>'
    : `<span class="project-card__cta">Read case study ${arrow()}</span>`;
  return `
    <${tag} class="project-card"${href}>
      <header class="project-card__head" aria-hidden="true"><span>${p.role}</span><span>${p.period}</span></header>
      <div class="project-card__body">
        <div class="frame">${frameMedia(p.cover)}</div>
        <div class="project-card__text">
          <h4 class="project-card__title">${p.title}</h4>
          <p class="project-card__summary">${p.summary}</p>
          <p class="project-card__scope">${p.did.join(', ')}</p>
          ${cta}
        </div>
      </div>
    </${tag}>`;
}

function renderWork(work) {
  $('[data-work]').innerHTML = `
    <div class="work__companies">
      ${work.map(c => `
        <article class="work__company" id="${c.id}">
          <header class="work__company-head">
            <h3 class="work__company-name">${c.company}</h3>
            <p class="work__company-meta">${c.period}. ${c.about}</p>
          </header>
          <div class="work__projects">${c.projects.map(projectCard).join('')}</div>
        </article>`).join('')}
    </div>`;
}

function renderApproach(items) {
  $('[data-approach]').innerHTML = items.map(i => `
    <div class="approach__row">
      <h3 class="approach__title">${i.title}</h3>
      <p class="approach__body">${i.body}</p>
      <div class="approach__proof">
        <p class="approach__proof-label">Seen in</p>
        <ul>${i.proof.map(pr => `<li>${pr.href
          ? `<a class="approach__link" href="${pr.href}">${pr.label}</a>`
          : `<span>${pr.label}</span>`}</li>`).join('')}</ul>
      </div>
    </div>`).join('');
}

function renderFreelance({ intro, items }) {
  $('[data-freelance-intro]').textContent = intro;
  const strip = $('[data-freelance]');
  strip.innerHTML = items.map((item, i) => `
    <button class="freelance__item" type="button" data-freelance-idx="${i}" aria-label="Open ${item.alt}">
      ${media({ ...item, alt: '' })}
    </button>`).join('');
  observeVideos(strip);
}

function renderAbout({ body, portrait }) {
  $('[data-about]').innerHTML = body.map(p => `<p>${p}</p>`).join('');
  $('[data-portrait]').innerHTML =
    img(portrait);
}
