# Shared Element Morph Transition — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Animate the work card image flying into the project hero on navigate, and back to the card on return, using GSAP Flip.

**Architecture:** A fixed-position clone bridges the two views. `captureSource()` creates the clone at click time (before index hides). `transitionToProject()` flies it into the hero. `transitionToIndex()` clones the hero and flies it back to the card. All wired via existing router callback in `main.js`.

**Tech Stack:** GSAP 3.12.5, GSAP Flip plugin (CDN), Vanilla JS ES modules

---

## File Map

| File | Change |
|------|--------|
| `index.html` | Add Flip plugin `<script>` after ScrollTrigger |
| `js/page-transition.js` | Full rewrite — clone creation + `Flip.fit()` transitions |
| `js/content.js` | Import `captureSource`, call it before `navigate()` in both click handlers |
| `js/project-page.js` | Import `transitionToProject`, set initial `opacity:0` inline on article/heroImg, call transition after render |
| `js/main.js` | Import `transitionToIndex` + `clearSource`, replace instant back with async transition |

---

## Task 1: Add GSAP Flip CDN

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add Flip script tag**

In `index.html`, after line 23 (`ScrollTrigger.min.js`), add:

```html
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/Flip.min.js"></script>
```

- [ ] **Step 2: Verify in browser**

Open `http://localhost:3000`. Open DevTools console. Run:
```js
Flip
```
Expected: `ƒ Flip()` (the Flip plugin object, not `undefined`)

---

## Task 2: Rewrite page-transition.js

**Files:**
- Modify: `js/page-transition.js`

- [ ] **Step 1: Replace entire file contents**

```js
let _triggerEl = null;
let _clone = null;

// Call this at click time, before navigate() and hideIndex().
// Creates a fixed clone of the card image while it's still in layout.
export function captureSource(triggerEl) {
  if (_clone) { _clone.remove(); _clone = null; }

  _triggerEl = triggerEl;
  const img = triggerEl.querySelector('img') || triggerEl;
  const rect = img.getBoundingClientRect();

  _clone = document.createElement('img');
  _clone.src = img.src;
  Object.assign(_clone.style, {
    position: 'fixed',
    zIndex: '2000',
    pointerEvents: 'none',
    objectFit: 'cover',
    margin: '0',
    left: rect.left + 'px',
    top: rect.top + 'px',
    width: rect.width + 'px',
    height: rect.height + 'px',
  });
  document.body.appendChild(_clone);
}

// Call after project HTML is rendered.
// heroImg must already be in the DOM at opacity:0.
export function transitionToProject(heroImg) {
  const noMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const article = heroImg.closest('article');

  if (noMotion || !_clone) {
    if (_clone) { _clone.remove(); _clone = null; }
    gsap.set(heroImg, { opacity: 1 });
    if (article) gsap.to(article, { opacity: 1, duration: 0.3 });
    return;
  }

  const clone = _clone;
  _clone = null;

  Flip.fit(clone, heroImg, {
    duration: 0.6,
    ease: 'expo.out',
    onComplete() {
      clone.remove();
      gsap.set(heroImg, { opacity: 1 });
    },
  });

  if (article) {
    gsap.to(article, { opacity: 1, duration: 0.4, delay: 0.25 });
  }
}

// Call when navigating back to index.
// restoreIndex() brings the card element back into the DOM for measurement.
// Returns a Promise that resolves when the clone lands on the card.
export function transitionToIndex(projectView, restoreIndex) {
  const noMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return new Promise(resolve => {
    if (noMotion || !_triggerEl) {
      resolve();
      return;
    }

    const heroImg = projectView.querySelector('.project-page__hero-img');
    if (!heroImg) { resolve(); return; }

    const heroRect = heroImg.getBoundingClientRect();

    const clone = document.createElement('img');
    clone.src = heroImg.src;
    Object.assign(clone.style, {
      position: 'fixed',
      zIndex: '2000',
      pointerEvents: 'none',
      objectFit: 'cover',
      margin: '0',
      left: heroRect.left + 'px',
      top: heroRect.top + 'px',
      width: heroRect.width + 'px',
      height: heroRect.height + 'px',
    });
    document.body.appendChild(clone);

    const article = projectView.querySelector('.project-page');
    if (article) gsap.to(article, { opacity: 0, duration: 0.25 });

    if (restoreIndex) restoreIndex();

    requestAnimationFrame(() => {
      const triggerImg = _triggerEl.querySelector('img') || _triggerEl;

      Flip.fit(clone, triggerImg, {
        duration: 0.5,
        ease: 'expo.inOut',
        onComplete() {
          clone.remove();
          resolve();
        },
      });
    });
  });
}

export function clearSource() {
  if (_clone) { _clone.remove(); _clone = null; }
  _triggerEl = null;
}
```

---

## Task 3: Wire captureSource in content.js

**Files:**
- Modify: `js/content.js`

- [ ] **Step 1: Add import at top of file**

At the top of `js/content.js`, add import alongside existing `navigate` import:

```js
import { captureSource } from './page-transition.js';
```

- [ ] **Step 2: Call captureSource before navigate in initProjectLinks**

Replace the existing `initProjectLinks` function (currently lines ~57–73) with:

```js
function initProjectLinks() {
  document.querySelectorAll('[data-project-link]').forEach(btn => {
    const projectId = btn.dataset.projectLink;
    btn.addEventListener('click', () => {
      captureSource(btn);
      navigate(`#/work/${projectId}`);
    });
  });
  document.querySelectorAll('.work__project').forEach(project => {
    const seeMore = project.querySelector('.work__see-more');
    const btn = project.querySelector('[data-project-link]');
    if (!seeMore || !btn) return;
    seeMore.addEventListener('click', () => {
      captureSource(btn);
      navigate(`#/work/${btn.dataset.projectLink}`);
    });
  });
}
```

Note: `captureSource(btn)` receives the `.work__project-image` button (which contains the `<img>`), not the See More button — so `triggerEl.querySelector('img')` finds the correct image in both cases.

---

## Task 4: Wire transition in project-page.js

**Files:**
- Modify: `js/project-page.js`

- [ ] **Step 1: Add import at top of file**

At the top of `js/project-page.js`, alongside the existing `showForProject` import:

```js
import { transitionToProject } from './page-transition.js';
```

- [ ] **Step 2: Set initial opacity:0 on article and heroImg in render template**

In the `render()` function, find the `container.innerHTML = \`` assignment. Apply `style="opacity:0"` to the `<article>` and `<img class="project-page__hero-img">`:

```js
  container.innerHTML = `
    <article class="project-page" style="opacity:0">
      <section class="project-page__hero" aria-label="Project hero">
        <div class="project-page__hero-img-wrap">
          <img class="project-page__hero-img" src="${project.hero.src}" alt="${project.hero.alt}" style="opacity:0" />
        </div>
        ...rest of template unchanged...
```

- [ ] **Step 3: Call transitionToProject after render**

At the end of `render()`, after `showForProject()` and before `_cleanup = ...`, add:

```js
  const heroImg = container.querySelector('.project-page__hero-img');
  transitionToProject(heroImg);
```

Final order in `render()` tail:
```js
  const cleanSnap = initProjectSnap(lenis);
  const cleanReveals = initProjectReveals();
  showForProject();

  const heroImg = container.querySelector('.project-page__hero-img');
  transitionToProject(heroImg);

  _cleanup = () => {
    if (cleanSnap) cleanSnap();
    if (cleanReveals) cleanReveals();
  };
```

---

## Task 5: Wire back transition in main.js

**Files:**
- Modify: `js/main.js`

- [ ] **Step 1: Add imports**

At the top of `js/main.js`, add:

```js
import { transitionToIndex, clearSource } from './page-transition.js';
```

- [ ] **Step 2: Replace the router back-navigation branch**

Find the `initRouter` callback (currently near the bottom of the file). Replace:

```js
  } else if (prev && prev.view === 'project') {
    hideProject();
    showIndex();
  }
```

With:

```js
  } else if (prev && prev.view === 'project') {
    transitionToIndex(projectView, showIndex).then(() => {
      hideProject();
      clearSource();
    });
  }
```

- [ ] **Step 3: Verify forward transition in browser**

1. Open `http://localhost:3000`
2. Click a work card image
3. Expected: card image flies and expands to fill the project hero; project content fades in after ~0.25s
4. No flash of unstyled content before the animation

- [ ] **Step 4: Verify back transition in browser**

1. From a project page, click the back arrow
2. Expected: project content fades out, hero image shrinks and flies back to its card position on the main page

- [ ] **Step 5: Verify See More button**

1. On main page, click "See More →" on any project
2. Expected: same flying image transition as clicking the card directly

- [ ] **Step 6: Verify reduced motion**

1. In OS settings (Windows: Settings → Accessibility → Visual effects → Animation effects off) or DevTools (Rendering → Emulate CSS media: prefers-reduced-motion)
2. Navigate to a project
3. Expected: plain fade, no flying clone

- [ ] **Step 7: Verify rapid navigation**

1. Click into a project, immediately click back, immediately click into another project
2. Expected: no orphan fixed-position clones left in the DOM (inspect body for stray `<img>` elements)
