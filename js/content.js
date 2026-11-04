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
  renderHeroIndex(data.work);
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

// Hero contents: every project as an editorial index row; hover shows its cover
function renderHeroIndex(work) {
  const list = $('[data-hero-index]');
  if (!list) return;
  list.innerHTML = work.flatMap(c => c.projects).map(p => {
    const cells = `<span class="index__title">${p.title}</span>
      <span class="index__role">${p.comingSoon ? 'Case study after launch' : p.role}</span>
      <span class="index__years">${p.period}</span>`;
    return p.comingSoon
      ? `<li><div class="index__row is-soon" data-cover="${p.cover.src}">${cells}</div></li>`
      : `<li><a class="index__row" href="#/work/${p.id}" data-project="${p.id}" data-cover="${p.cover.src}">${cells}</a></li>`;
  }).join('');
  initIndexPreview(list);
}

// Cover follows the pointer with a soft lag while hovering the index (hover devices only)
function initIndexPreview(list) {
  if (!matchMedia('(hover: hover)').matches) return;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const preview = document.createElement('div');
  preview.className = 'index-preview';
  preview.setAttribute('aria-hidden', 'true');
  const pic = new Image();
  pic.alt = '';
  preview.append(pic);
  document.body.append(preview);

  let x = 0, y = 0, tx = 0, ty = 0, raf = 0, active = false;
  // Docked just left of the index column, following the pointer vertically only, and
  // clamped between the byline's end and the list's end so it never covers text
  const about = document.querySelector('.hero__about');
  const target = (e) => {
    const l = list.getBoundingClientRect();
    const h = preview.offsetHeight;
    const minY = about ? about.getBoundingClientRect().bottom + 24 : l.top;
    tx = l.left - preview.offsetWidth - 40;
    ty = Math.min(Math.max(e.clientY - h / 2, minY), Math.max(l.bottom - h, minY));
  };
  const loop = () => {
    const k = still ? 1 : 0.16;
    x += (tx - x) * k;
    y += (ty - y) * k;
    preview.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    raf = active || Math.abs(tx - x) + Math.abs(ty - y) > 0.5 ? requestAnimationFrame(loop) : 0;
  };
  const hide = () => { active = false; preview.classList.remove('is-on'); };

  list.addEventListener('pointerover', (e) => {
    const row = e.target.closest('[data-cover]');
    if (!row) return;
    if (pic.getAttribute('src') !== row.dataset.cover) pic.src = row.dataset.cover;
    target(e);
    if (!active) { x = tx; y = ty; }
    active = true;
    preview.classList.add('is-on');
    if (!raf) raf = requestAnimationFrame(loop);
  });
  list.addEventListener('pointermove', target);
  list.addEventListener('pointerleave', hide);
  list.addEventListener('click', hide); // route change: don't leave it floating
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
