// Case study view: fetch content/{id}.json, render, wire interactions.

import { caseStudies, todoNote, arrow, frameMedia } from './content.js';
import { openLightbox } from './gallery.js';

const view = document.getElementById('project-view');
const cache = new Map();
let cleanup = [];

// Fetch + memoize; also used to prefetch on card hover
export function loadProject(id) {
  if (!cache.has(id)) {
    cache.set(id, fetch(`content/${id}.json`).then(r => {
      if (!r.ok) throw new Error(`${id} ${r.status}`);
      return r.json();
    }).catch(err => { cache.delete(id); throw err; }));
  }
  return cache.get(id);
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function figure(m, i) {
  if (m.wide) {
    return `
      <figure class="case__figure">
        <div class="case__pan" data-pan tabindex="0" aria-label="${m.alt}, scrollable">
          <img src="${m.src}" alt="${m.alt}" loading="lazy" decoding="async" />
        </div>
        ${m.caption ? `<figcaption>${m.caption}</figcaption>` : ''}
      </figure>`;
  }
  return `
    <figure class="case__figure">
      <button class="case__zoom" type="button" data-zoom="${i}" aria-label="Enlarge: ${m.alt}">
        <img src="${m.src}" alt="${m.alt}" loading="lazy" decoding="async" />
      </button>
      ${m.caption ? `<figcaption>${m.caption}</figcaption>` : ''}
    </figure>`;
}

function compare({ before, after }) {
  return `
    <div class="compare" data-compare>
      <img src="${before.src}" alt="${before.alt}" loading="lazy" decoding="async" />
      <img class="compare__after" src="${after.src}" alt="${after.alt}" loading="lazy" decoding="async" />
      <span class="compare__divider" aria-hidden="true"></span>
      <span class="compare__tag compare__tag--before" aria-hidden="true">Before</span>
      <span class="compare__tag compare__tag--after" aria-hidden="true">After</span>
      <input class="compare__range" type="range" min="0" max="100" value="50" aria-label="Compare before and after" />
    </div>`;
}

function render(p) {
  // Flat list of zoomable images → one lightbox sequence for the page
  const zoomables = [];
  const ids = new Map(p.sections.map(s => [s, slug(s.heading)]));
  const sections = p.sections.map(s => {
    const id = ids.get(s);
    const media = (s.media || []).map(m => {
      if (m.wide) return figure(m);
      zoomables.push(m);
      return figure(m, zoomables.length - 1);
    });
    return `
      <section class="case__section" id="${id}" aria-labelledby="${id}-h">
        <p class="case__stage">${s.stage}</p>
        <h2 class="case__heading" id="${id}-h">${s.heading}</h2>
        <div class="case__text">${s.body.map(b => `<p>${b}</p>`).join('')}</div>
        ${s.pull ? `<p class="case__pull">${s.pull}</p>` : ''}
        ${media.length ? `<div class="case__media case__media--n${media.length}">${media.join('')}</div>` : ''}
        ${s.compare ? compare(s.compare) : ''}
      </section>`;
  }).join('');

  // TOC grouped by stage (stages repeat across consecutive sections)
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
      <a class="case__back" href="#/" data-back>${arrow('left')} All work</a>
      <header class="case__head">
        <p class="case__company">${p.company}, ${p.period}</p>
        <h1 class="case__title">${p.title}</h1>
        <p class="case__summary">${p.summary}</p>
      </header>
      <dl class="case__meta">
        ${p.meta.map(m => `<div><dt>${m.label}</dt><dd>${m.value}</dd></div>`).join('')}
      </dl>
      <div class="case__hero" data-vt="media">
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
            ${(p.todo || []).map(todoNote).join('')}
          </section>
        </div>
      </div>
      ${next ? `
      <a class="case__next" href="#/work/${next.id}" data-project="${next.id}">
        <div>
          <p class="case__next-label">Next case study</p>
          <p class="case__next-title">${next.title}</p>
        </div>
        ${frameMedia(next.cover)}
      </a>` : ''}
    </article>`;

  document.title = `${p.title} | Mirko Aus`;
  wire(zoomables);
}

function wire(zoomables) {
  view.querySelectorAll('[data-zoom]').forEach(btn => {
    btn.addEventListener('click', () => openLightbox(zoomables, Number(btn.dataset.zoom)));
  });

  // Before/after: range input drives --pos (keyboard accessible)
  view.querySelectorAll('[data-compare]').forEach(el => {
    const range = el.querySelector('input');
    range.addEventListener('input', () => el.style.setProperty('--pos', `${range.value}%`));
  });

  // Wide flow: drag to pan with mouse (touch scrolls natively)
  view.querySelectorAll('[data-pan]').forEach(el => {
    let x0 = 0, s0 = 0, down = false;
    el.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') return;
      down = true; x0 = e.clientX; s0 = el.scrollLeft;
      el.classList.add('is-dragging');
    });
    el.addEventListener('pointermove', (e) => { if (down) el.scrollLeft = s0 - (e.clientX - x0); });
    const end = () => { down = false; el.classList.remove('is-dragging'); };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointerleave', end);
    el.addEventListener('dragstart', (e) => e.preventDefault());
  });

  // TOC: in-page links scroll without touching the route hash
  const toc = view.querySelector('.case__toc');
  toc.addEventListener('click', (e) => {
    const a = e.target.closest('[data-toc]');
    if (!a) return;
    e.preventDefault();
    document.getElementById(a.dataset.toc).scrollIntoView({ block: 'start' });
  });

  // TOC: highlight the section crossing the upper third of the viewport
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

export async function showProject(id) {
  hideProject();
  view.hidden = false;
  try {
    render(await loadProject(id));
  } catch {
    view.innerHTML = `
      <div class="case case__error">
        <h1 class="case__title">Case study not found</h1>
        <p>This project doesn't have a case study yet.</p>
        <a class="btn btn--primary" href="#/">Back to all work</a>
      </div>`;
  }
}

export function hideProject() {
  cleanup.forEach(fn => fn());
  cleanup = [];
  view.hidden = true;
  view.innerHTML = '';
  document.title = 'Mirko Aus — Product & UX Designer';
}
