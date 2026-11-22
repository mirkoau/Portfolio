// Case study view: fetch content/{id}.json, render, wire interactions.

import { caseStudies, frameMedia, img, media, observeVideos, unobserveVideos, dragScroll } from './content.js';
import { openLightbox } from './gallery.js';
import { pin, refresh } from './motion.js';

const view = document.getElementById('project-view');
const baseTitle = document.title;
const cache = new Map();
let cleanup = [];

export const heroEl = () => view.querySelector('.case__hero');

// Memoized; also used to prefetch on card hover
export function loadProject(id) {
  if (!cache.has(id)) {
    cache.set(id, fetch(`content/${id}.json`).then(r => {
      if (!r.ok) throw new Error(`${id} ${r.status}`);
      return r.json();
    }).catch(err => { cache.delete(id); throw err; }));
  }
  return cache.get(id);
}

// Prefixed so section ids can't collide with index ids (#work, #about) that stay in the DOM
const slug = (s) => 'cs-' + s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function figure(m, zoomIdx, num) {
  const wrap = m.wide
    ? `<div class="case__pan" data-pan tabindex="0" role="region" aria-label="${m.alt}, scrollable">${media(m)}</div>`
    : `<button class="case__zoom" type="button" data-zoom="${zoomIdx}" aria-label="Enlarge: ${m.alt}">${media(m)}</button>`;
  return `
    <figure class="case__figure">
      ${wrap}
      <figcaption><span class="case__fig">Fig. ${num}</span>${m.caption ? `<span>${m.caption}</span>` : ''}</figcaption>
    </figure>`;
}

function compare({ before, after }) {
  return `
    <div class="compare" data-compare>
      ${img(before)}
      ${img(after, 'class="compare__after"')}
      <span class="compare__divider" aria-hidden="true"></span>
      <span class="compare__tag compare__tag--before" aria-hidden="true">Before</span>
      <span class="compare__tag compare__tag--after" aria-hidden="true">After</span>
      <input class="compare__range" type="range" min="0" max="100" value="50" aria-label="Compare before and after" />
    </div>`;
}

function render(p) {
  // One lightbox sequence across all zoomable images on the page
  const zoomables = [];
  let figNum = 0;
  const ids = new Map(p.sections.map(s => [s, slug(s.heading)]));
  const sections = p.sections.map((s, i) => {
    const id = ids.get(s);
    // Stage label only on the first section of a run sharing that stage
    const stage = s.stage !== p.sections[i - 1]?.stage;
    const media = (s.media || []).map(m => {
      figNum++;
      if (m.wide) return figure(m, null, figNum);
      zoomables.push(m);
      return figure(m, zoomables.length - 1, figNum);
    });
    return `
      <section class="case__section" id="${id}" aria-labelledby="${id}-h">
        ${stage ? `<p class="case__stage">${s.stage}</p>` : ''}
        <h2 class="case__heading" id="${id}-h">${s.heading}</h2>
        <div class="case__text">${s.body.map(b => `<p>${b}</p>`).join('')}</div>
        ${s.pull ? `<p class="case__pull">${s.pull}</p>` : ''}
        ${media.length ? `<div class="case__media case__media--n${media.length}">${media.join('')}</div>` : ''}
        ${s.compare ? compare(s.compare) : ''}
      </section>`;
  }).join('');

  // Consecutive sections sharing a stage collapse into one TOC group
  const groups = [];
  p.sections.forEach(s => {
    const last = groups.at(-1);
    if (last && last.stage === s.stage) last.items.push(s);
    else groups.push({ stage: s.stage, items: [s] });
  });
  const toc = groups.map(g => `
    <p class="case__toc-stage">${g.stage}</p>
    <ol>${g.items.map(s => `<li><a href="#${ids.get(s)}" data-toc="${ids.get(s)}">${s.heading}</a></li>`).join('')}</ol>`).join('');

  const all = caseStudies();
  const next = all[(all.findIndex(c => c.id === p.id) + 1) % all.length];

  view.innerHTML = `
    <article class="case">
      <span class="case__dock" aria-hidden="true"></span>
      <div class="case__intro">
        <header class="case__head">
          <p class="case__company">${p.company}, ${p.period}</p>
          <h1 class="case__title">${p.title}</h1>
          <p class="case__summary">${p.summary}</p>
        </header>
        <dl class="case__inspect" aria-label="Project details">
          ${p.meta.map(m => `<div><dt>${m.label}</dt><dd>${m.value}</dd></div>`).join('')}
        </dl>
      </div>
      <span class="frame__label case__hero-label" aria-hidden="true"><span>${p.title}</span><span>${p.period}</span></span>
      <div class="case__hero">
        <img src="${p.hero.src}" alt="${p.hero.alt}" decoding="async" fetchpriority="high" />
      </div>
      <div class="case__body">
        <nav class="case__toc" aria-label="On this page">${toc}</nav>
        <div class="case__content">
          ${sections}
          <section class="case__results" aria-labelledby="results-h">
            <h2 class="case__results-title" id="results-h">Results</h2>
            <ul class="case__results-list">
              ${p.results.map(r => `<li class="case__result"><strong>${r.title}</strong><span>${r.detail}</span></li>`).join('')}
            </ul>
          </section>
        </div>
      </div>
      ${next ? `
      <a class="case__next" href="#/work/${next.id}" data-project="${next.id}" data-draw-trigger>
        <div>
          <p class="case__next-label">Next case study</p>
          <p class="section-title case__next-title"><span data-draw-line>${next.title}</span></p>
        </div>
        ${frameMedia(next.cover)}
      </a>` : ''}
    </article>`;

  document.title = `${p.title} | Mirko Aus`;
  wire(zoomables);
}

// Load every image of the project top to bottom, one after another (overrides loading="lazy"),
// so the page fills in reading order and the lightbox has everything ready.
// Images reserve 16:9 until loaded; a taller one grows the page, so re-measure scroll
// triggers after each, or every reveal below it fires at stale positions.
function loadInOrder() {
  let alive = true;
  cleanup.push(() => { alive = false; });
  (async () => {
    for (const im of view.querySelectorAll('.case__content img')) {
      if (!alive) return;
      const h = im.offsetHeight;
      im.loading = 'eager';
      await im.decode().catch(() => {});
      if (alive && im.offsetHeight !== h) refresh();
    }
  })();
}

function wire(zoomables) {
  observeVideos(view);
  cleanup.push(() => unobserveVideos(view));
  loadInOrder();

  // Thumbnail of image i, for the lightbox morph
  const thumbOf = (i) => view.querySelector(`[data-zoom="${i}"] :is(img, video)`);
  view.querySelectorAll('[data-zoom]').forEach(btn => {
    btn.addEventListener('click', () => openLightbox(zoomables, Number(btn.dataset.zoom), thumbOf));
  });

  // Range input (not a custom drag) so the slider is keyboard + AT accessible
  view.querySelectorAll('[data-compare]').forEach(el => {
    const range = el.querySelector('input');
    range.addEventListener('input', () => el.style.setProperty('--pos', `${range.value}%`));
  });

  view.querySelectorAll('[data-pan]').forEach((el) => dragScroll(el));

  // TOC clicks: main.js's in-page anchor handler scrolls + moves focus
  const toc = view.querySelector('.case__toc');
  cleanup.push(pin(toc, view.querySelector('.case__content')));

  const links = new Map([...toc.querySelectorAll('[data-toc]')].map(a => [a.dataset.toc, a]));
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      links.forEach(a => a.classList.remove('is-current'));
      links.get(en.target.id)?.classList.add('is-current');
    });
  }, { rootMargin: '-30% 0px -65% 0px' });
  view.querySelectorAll('.case__section').forEach(s => io.observe(s));
  cleanup.push(() => io.disconnect());
}

const NOT_FOUND = `
  <div class="case case__error">
    <h1 class="case__title">Case study not found</h1>
    <p>This project doesn't have a case study yet.</p>
    <a class="btn btn--primary" href="#/">Back to all work</a>
  </div>`;

// Synchronous: the caller fetches (loadProject) first. p = null → not found.
// Malformed JSON (missing fields, or #/work/data hitting the index data) → not found too.
export function showProject(p) {
  hideProject();
  view.hidden = false;
  if (!p) return void (view.innerHTML = NOT_FOUND);
  try {
    render(p);
  } catch (err) {
    console.warn('[case]', err.message);
    hideProject();
    view.hidden = false;
    view.innerHTML = NOT_FOUND;
  }
}

export function hideProject() {
  cleanup.forEach(fn => fn());
  cleanup = [];
  view.hidden = true;
  view.innerHTML = '';
  document.title = baseTitle;
}
