// Fetches content/data.json and renders index sections.
// Content is first-party JSON, so plain template strings are fine here.

const isDev = ['localhost', '127.0.0.1', ''].includes(location.hostname);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

// Mouse drag scrolls el sideways (touch already pans natively), optionally gliding on after
// release. Pointer capture sends the click after a drag to el itself, so it never opens a
// child. While dragging/gliding el has .is-free (no snapping). Returns stop() for the glide.
export function dragScroll(el, { glide = false } = {}) {
  let raf = 0;
  let drag = null;
  const stop = () => {
    cancelAnimationFrame(raf);
    el.classList.remove('is-free');
  };
  el.addEventListener('dragstart', (e) => e.preventDefault()); // no native image drag
  // Pressing here must not start a text selection that the drag then sweeps across the page
  // (pointerdown can't cancel it; mousedown can, and clicks still fire). Clears an old one too.
  el.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    getSelection()?.removeAllRanges();
  });

  el.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    stop();
    drag?.abort(); // a release outside the window never sent pointerup
    drag = new AbortController();
    const on = (type, fn) => el.addEventListener(type, fn, { signal: drag.signal });
    const x0 = e.clientX;
    const s0 = el.scrollLeft;
    let moved = false;
    let v = 0; // px/ms
    let lastX = x0;
    let lastT = e.timeStamp;

    on('pointermove', (ev) => {
      // Released outside el before capture started: pointerup never reached el
      if (!(ev.buttons & 1)) return end(ev);
      if (!moved) {
        if (Math.abs(ev.clientX - x0) < 4) return; // still a click
        moved = true;
        el.setPointerCapture(e.pointerId);
        el.classList.add('is-dragging', 'is-free');
      }
      el.scrollLeft = s0 - (ev.clientX - x0);
      const dt = ev.timeStamp - lastT;
      if (dt > 0) v = 0.8 * ((lastX - ev.clientX) / dt) + 0.2 * v;
      lastX = ev.clientX;
      lastT = ev.timeStamp;
    });
    const end = (ev) => {
      drag.abort();
      if (!moved) return;
      el.classList.remove('is-dragging');
      if (!glide || ev.timeStamp - lastT > 80 || reduceMotion.matches) return stop();
      const max = el.scrollWidth - el.clientWidth;
      let pos = el.scrollLeft; // float: scrollLeft rounds, so small steps would stall
      let t = 0;
      const step = (now) => {
        const dt = t ? now - t : 16;
        t = now;
        v *= Math.pow(0.95, dt / 16);
        pos = Math.min(Math.max(pos + v * dt, 0), max);
        el.scrollLeft = pos;
        if (Math.abs(v) > 0.02 && pos > 0 && pos < max) raf = requestAnimationFrame(step);
        else stop();
      };
      raf = requestAnimationFrame(step);
    };
    on('pointerup', end);
    on('pointercancel', end);
    on('lostpointercapture', end);
  });
  return stop;
}

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
  renderToolkit(data.toolkit);
  renderFreelance(data.freelance);
  renderAbout(data.about);
  return data;
}

// Empty if data.json failed: the case study still renders, just without a next link
export const caseStudies = () =>
  data?.work.flatMap(c => c.projects.filter(p => !p.comingSoon)) ?? [];

export const frameMedia = (m) => `<span class="frame__media" data-vt="media">${img(m)}</span>`;

function projectCard(p) {
  const tag = p.comingSoon ? 'div' : 'a';
  const href = p.comingSoon ? '' : ` href="#/work/${p.id}" data-project="${p.id}" aria-label="${p.title} case study"`;
  const cta = p.comingSoon
    ? '<span class="project-card__cta project-card__cta--soon">Case study coming soon</span>'
    : `<span class="project-card__cta"><span class="project-card__cta-label" data-draw-line>Read case study</span> ${arrow()}</span>`;
  return `
    <${tag} class="project-card"${href}${p.comingSoon ? '' : ' data-draw-trigger'}>
      <div class="frame">${frameMedia(p.cover)}</div>
      <div class="project-card__text">
        <p class="project-card__meta">${p.role}, ${p.period}</p>
        <h4 class="project-card__title">${p.title}</h4>
        <p class="project-card__summary">${p.summary}</p>
        ${cta}
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
          : `<span>${pr.label}</span>`}${pr.note
          ? `<span class="approach__note">${pr.note}</span>` : ''}</li>`).join('')}</ul>
      </div>
    </div>`).join('');
}

// Tools as big serif words, brand logo(s) after the name; skills flow the same way, small
function renderToolkit({ tools, skills }) {
  const logo = id => `<img class="toolkit__logo" src="assets/logos/${id}.svg" alt="" width="24" height="24">`;
  const item = t => typeof t === 'string' ? t
    : `${t.name}<span class="toolkit__logos">${t.logos.map(logo).join('')}</span>`;
  const list = (cls, label, items) =>
    `<ul class="${cls}" aria-label="${label}">${items.map(t => `<li>${item(t)}</li>`).join('')}</ul>`;
  $('[data-toolkit]').innerHTML = list('toolkit__tools', 'Tools', tools) + list('toolkit__skills', 'Skills', skills);
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
