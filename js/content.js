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

function renderOverview({ columns }) {
  $('[data-overview]').innerHTML = columns.map(col => `
    <div class="overview__col">
      <h3 class="overview__col-title">${col.title}</h3>
      <ul class="overview__list">
        ${col.items.map(i => `
          <li class="overview__item">
            <span class="overview__name">${i.name}</span>
            <span class="overview__detail">${i.detail}</span>
          </li>`).join('')}
      </ul>
      ${todoNote(col.todo)}
    </div>`).join('');
}

export const frameMedia = (m) => `<span class="frame__media" data-vt="media">${img(m)}</span>`;

const corners = '<span class="frame__corner"></span>'.repeat(4);

function projectCard(p) {
  const tag = p.comingSoon ? 'div' : 'a';
  const href = p.comingSoon ? '' : ` href="#/work/${p.id}" data-project="${p.id}" aria-label="${p.title} case study"`;
  const cta = p.comingSoon
    ? '<span class="project-card__cta project-card__cta--soon">Case study after launch</span>'
    : `<span class="project-card__cta">Read case study ${arrow()}</span>`;
  return `
    <${tag} class="project-card"${href}>
      <div class="frame">
        <span class="frame__label" aria-hidden="true"><span>${p.title}</span><span>${p.period}</span></span>
        ${frameMedia(p.cover)}
        ${corners}
      </div>
      <div class="project-card__text">
        <h4 class="project-card__title">${p.title}</h4>
        <p class="project-card__role">${p.role}</p>
        <p class="project-card__summary">${p.summary}</p>
        <ul class="tags">${p.did.map(d => `<li class="tag">${d}</li>`).join('')}</ul>
        ${cta}
      </div>
    </${tag}>`;
}

function renderWork(work) {
  $('[data-work]').innerHTML = work.map(c => `
    <article class="work__company" id="${c.id}">
      <header class="work__company-head">
        <h3 class="work__company-name">${c.company}</h3>
        <p class="work__company-period">${c.period}</p>
        <p class="work__company-about">${c.about}</p>
      </header>
      <div class="work__projects">${c.projects.map(projectCard).join('')}</div>
    </article>`).join('');
}

function renderApproach(items) {
  $('[data-approach]').innerHTML = items.map(i => `
    <div class="approach__item">
      <h3 class="approach__title">${i.title}</h3>
      <p class="approach__body">${i.body}</p>
    </div>`).join('');
}

function renderFreelance({ intro, items }) {
  $('[data-freelance-intro]').textContent = intro;
  $('[data-freelance]').innerHTML = items.map((item, i) => `
    <button class="freelance__item" type="button" data-freelance-idx="${i}" aria-label="Open ${item.alt}">
      ${img({ src: item.src, alt: '' })}
    </button>`).join('');
}

function renderAbout({ body, portrait }) {
  $('[data-about]').innerHTML = body.map(p => `<p>${p}</p>`).join('');
  $('[data-portrait]').innerHTML =
    img(portrait);
}
