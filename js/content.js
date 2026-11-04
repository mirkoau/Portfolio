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
  renderOverview(data.overview);
  renderWork(data.work);
  renderApproach(data.approach);
  renderFreelance(data.freelance);
  renderAbout(data.about);
  return data;
}

export const caseStudies = () =>
  data.work.flatMap(c => c.projects.filter(p => !p.comingSoon));

// Capability matrix: projects × skills. A <table> so rows/cols stay navigable for AT.
function renderOverview({ skills, rows, tools, todo }) {
  const el = $('[data-overview]');
  el.innerHTML = `
    <div class="matrix__scroll">
      <table class="matrix">
        <caption class="sr-only">What I did on each project</caption>
        <thead>
          <tr>
            <td></td>
            ${skills.map((s, c) => `<th scope="col" data-col="${c}"><span>${s}</span></th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rows.map((r, ri) => `
            <tr data-row="${ri}">
              <th scope="row"><span class="matrix__name">${r.name}</span><span class="matrix__kind">${r.kind}</span></th>
              ${skills.map((_, c) => r.marks.includes(c)
                ? `<td data-col="${c}"><span class="matrix__dot" role="img" aria-label="Yes"></span></td>`
                : `<td data-col="${c}"><span class="sr-only">No</span></td>`).join('')}
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <p class="matrix__tools"><span>Tools</span> ${tools.join(', ')}</p>
    ${todoNote(todo)}`;

  // Crosshair highlight: hovered row + column
  const table = el.querySelector('.matrix');
  let lit = [];
  const clear = () => { lit.forEach(c => c.classList.remove('is-hl')); lit = []; };
  table.addEventListener('pointerover', (e) => {
    const cell = e.target.closest('td, th');
    clear();
    if (!cell) return;
    const row = cell.closest('tbody tr');
    const col = cell.dataset.col;
    lit = [
      ...(row ? row.cells : []),
      ...(col ? table.querySelectorAll(`[data-col="${col}"]`) : []),
    ];
    lit.forEach(c => c.classList.add('is-hl'));
  });
  table.addEventListener('pointerleave', clear);
}

export const frameMedia = (m) => `<span class="frame__media" data-vt="media">${img(m)}</span>`;

function projectCard(p) {
  const tag = p.comingSoon ? 'div' : 'a';
  const href = p.comingSoon ? '' : ` href="#/work/${p.id}" data-project="${p.id}" aria-label="${p.title} case study"`;
  const cta = p.comingSoon
    ? '<span class="project-card__cta project-card__cta--soon">Case study after launch</span>'
    : `<span class="project-card__cta">Read case study ${arrow()}</span>`;
  return `
    <${tag} class="project-card"${href} data-years="${yearsOf(p.period).join('-')}">
      <div class="frame">
        <span class="frame__label" aria-hidden="true"><span>${p.title}</span><span>${p.period}</span></span>
        ${frameMedia(p.cover)}
      </div>
      <div class="project-card__text">
        <h4 class="project-card__title">${p.title}</h4>
        <p class="project-card__role">${p.role}</p>
        <p class="project-card__summary">${p.summary}</p>
        <p class="project-card__scope">${p.did.join(', ')}</p>
        ${cta}
      </div>
    </${tag}>`;
}

const NOW = new Date().getFullYear();
const yearsOf = (period) => {
  const ys = (period.match(/\d{4}/g) || []).map(Number);
  return [ys[0], /present/i.test(period) ? NOW : (ys[1] ?? ys[0])];
};

function renderWork(work) {
  const all = work.flatMap(c => c.projects.flatMap(p => yearsOf(p.period)));
  const years = [];
  for (let y = Math.max(...all); y >= Math.min(...all); y--) years.push(y);

  $('[data-work]').innerHTML = `
    <ol class="timeline" aria-hidden="true">
      ${years.map(y => `<li data-year="${y}">${y}</li>`).join('')}
    </ol>
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
  initTimeline();
}

// Light up the year range of the project crossing the viewport middle
function initTimeline() {
  const ticks = [...document.querySelectorAll('.timeline [data-year]')];
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      const [from, to] = en.target.dataset.years.split('-').map(Number);
      ticks.forEach(t => {
        const y = Number(t.dataset.year);
        t.classList.toggle('is-on', y >= from && y <= to);
      });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  document.querySelectorAll('.project-card[data-years]').forEach(c => io.observe(c));
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
