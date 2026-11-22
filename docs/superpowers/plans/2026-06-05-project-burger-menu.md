# Project Burger Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a centered header burger button on project subpages that reveals after the hero and opens a dropdown menu of other projects, styled identically to `project-footer`.

**Architecture:** Burger lives in the persistent `.nav`; the menu panel + backdrop are built per-project inside `#project-view` and torn down in `hideProject()`. A single shared row renderer feeds both the footer and the menu so they stay pixel-identical. Open/close is a small state machine with scroll lock via Lenis.

**Tech Stack:** Vanilla JS ES modules, CSS custom properties, GSAP (already loaded), Lenis (already loaded). No build, no test framework — verification is manual in a browser via `npx serve .`.

> **Testing note:** This project has no unit-test harness (static CDN site). Each task is verified by serving the site and observing behavior in the browser + devtools console. Keep the dev server running across tasks.

---

## File Structure

- `js/project-page.js` — extract shared row renderer; build menu panel + backdrop; burger reveal on scroll; open/close state machine; cleanup in `hideProject()`. (Primary logic.)
- `index.html` — add burger `<button>` inside `.nav`.
- `css/project-page.css` — burger icon + X morph, reveal state, dropdown panel, backdrop. Reuses existing `project-footer__*` row styles.

---

## Task 0: Start dev server (one-time)

- [ ] **Step 1: Serve the site**

Run (PowerShell, background or separate terminal):
```
npx serve . -l 8080
```
Open `http://localhost:8080`, navigate into any project (click a Work entry).
Expected: project subpage loads with hero + content + footer. Leave this running for every later task.

---

## Task 1: Extract shared project-row renderer (refactor, no behavior change)

**Files:**
- Modify: `js/project-page.js`

- [ ] **Step 1: Add a `renderProjectRows` helper**

In `js/project-page.js`, add this function just above `render` (after `getAllProjects`, around line 33):

```javascript
// Shared row markup for footer + burger menu. Excludes currentId.
function renderProjectRows(projects, currentId) {
  const arrowSvg = `<svg class="project-footer__arrow" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.5 18H28.5M28.5 18L19.5 9M28.5 18L19.5 27" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  return projects
    .filter(p => p.id !== currentId)
    .map(p => {
      const meta = [p.role, p.period].filter(Boolean).join('  / ');
      return `
    <a class="project-footer__row" href="#/work/${p.id}">
      <div class="project-footer__row-bg">
        ${p.hero ? `<img src="${p.hero}" alt="" loading="lazy" />` : ''}
      </div>
      <div class="project-footer__title-group">
        <span class="project-footer__title">${p.title}</span>
        ${meta ? `<span class="project-footer__role">${meta}</span>` : ''}
      </div>
      ${arrowSvg}
    </a>`;
    })
    .join('');
}
```

- [ ] **Step 2: Use the helper in `render`**

In `render` (currently lines 56–74), replace the `footerProjects` + `arrowSvg` + `footerRows` block with:

```javascript
  const allProjects = await getAllProjects();
  const footerRows = renderProjectRows(allProjects, project.id);
```

Leave the `<nav class="project-footer">${footerRows}</nav>` usage unchanged.

- [ ] **Step 3: Verify in browser**

Reload a project page. Expected: footer rows render exactly as before (same titles, hover bg image, arrow). Console: no errors.

- [ ] **Step 4: Commit**

```
git add js/project-page.js
git commit -m "refactor: share project-row renderer"
```

---

## Task 2: Add burger button to the header

**Files:**
- Modify: `index.html` (the `.nav`, lines 34–40)
- Modify: `css/project-page.css`

- [ ] **Step 1: Add the button markup**

In `index.html`, inside `<nav class="nav">`, add the burger between `.nav__back` and `.nav__cta` (after line 38, before line 39):

```html
    <button class="nav__burger" hidden aria-label="Open menu" aria-expanded="false" aria-controls="project-menu">
      <span class="nav__burger-box" aria-hidden="true">
        <span class="nav__burger-line"></span>
        <span class="nav__burger-line"></span>
      </span>
    </button>
```

- [ ] **Step 2: Add burger CSS (hidden + centered + icon)**

Append to `css/project-page.css`:

```css
/* ── Header burger (project subpage) ────────────────── */

.nav__burger {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%) translateY(-8px);
  pointer-events: all;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  background: none;
  border: none;
  cursor: pointer;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.4s var(--ease-out),
              transform 0.4s var(--ease-out),
              visibility 0.4s var(--ease-out);
}

.nav__burger[hidden] { display: none; }

/* Revealed after scrolling past the hero */
.nav__burger--visible {
  opacity: 1;
  visibility: visible;
  transform: translate(-50%, -50%) translateY(0);
}

.nav__burger-box {
  position: relative;
  display: block;
  width: 24px;
  height: 12px;
}

.nav__burger-line {
  position: absolute;
  left: 0;
  width: 100%;
  height: 1.5px;
  background: var(--color-blue);
  border-radius: 2px;
  transition: transform 0.3s var(--ease-out), opacity 0.2s var(--ease-out);
}

.nav__burger-line:nth-child(1) { top: 0; }
.nav__burger-line:nth-child(2) { bottom: 0; }

/* X morph when open */
.nav__burger--open .nav__burger-line:nth-child(1) {
  transform: translateY(5.25px) rotate(45deg);
}
.nav__burger--open .nav__burger-line:nth-child(2) {
  transform: translateY(-5.25px) rotate(-45deg);
}
```

> Note: `.nav` already has `padding: 0 60px` and `position: fixed`; `left: 50%` centers the burger against the full nav width. `.nav__cta { margin-left: auto }` keeps Contact on the right regardless.

- [ ] **Step 3: Temporarily force-show to verify look**

In devtools console on a project page, run:
```
document.querySelector('.nav__burger').hidden = false;
document.querySelector('.nav__burger').classList.add('nav__burger--visible');
```
Expected: two-line burger appears centered in the header, blue. Then run:
```
document.querySelector('.nav__burger').classList.add('nav__burger--open');
```
Expected: lines morph into an X. Remove the class to confirm it morphs back.

- [ ] **Step 4: Commit**

```
git add index.html css/project-page.css
git commit -m "add header burger button + X morph"
```

---

## Task 3: Build the menu panel + backdrop DOM

**Files:**
- Modify: `js/project-page.js`
- Modify: `css/project-page.css`

- [ ] **Step 1: Inject panel markup in `render`**

In `js/project-page.js` `render`, the `container.innerHTML` currently ends with the `</article>` after the footer `<nav>` (line 99). Add the menu + backdrop **inside** the `.project-page` article, right after the `<nav class="project-footer">…</nav>` block and before `</article>`:

```html
      <div class="project-menu__backdrop" hidden></div>
      <nav class="project-menu" id="project-menu" aria-label="Projects" hidden>
        ${footerRows}
      </nav>
```

So the rendered article tail becomes:
```javascript
      <nav class="project-footer" aria-label="Other projects">
        ${footerRows}
      </nav>
      <div class="project-menu__backdrop" hidden></div>
      <nav class="project-menu" id="project-menu" aria-label="Projects" hidden>
        ${footerRows}
      </nav>
    </article>`;
```

- [ ] **Step 2: Add panel + backdrop CSS**

Append to `css/project-page.css`:

```css
/* ── Project menu (burger dropdown) ─────────────────── */

.project-menu__backdrop {
  position: fixed;
  inset: 0;
  z-index: 90;
  background: rgba(0, 0, 0, 0.4);
  opacity: 0;
  transition: opacity 0.4s var(--ease-out);
}

.project-menu__backdrop[hidden] { display: none; }

.project-menu__backdrop--open { opacity: 1; }

.project-menu {
  position: fixed;
  top: var(--nav-height);
  left: 0;
  right: 0;
  z-index: 95;
  max-height: calc(100vh - var(--nav-height));
  overflow-y: auto;
  background: var(--color-bg);
  border-bottom: 0.5px solid var(--color-blue);
  transform: translateY(-12px);
  opacity: 0;
  pointer-events: none;
  transition: transform 0.4s var(--ease-out), opacity 0.4s var(--ease-out);
}

.project-menu[hidden] { display: none; }

.project-menu--open {
  transform: translateY(0);
  opacity: 1;
  pointer-events: all;
}
```

> Rows reuse `.project-footer__row` styles unchanged. `z-index`: backdrop 90, menu 95, nav stays 100 so the burger sits above the panel.

- [ ] **Step 3: Verify panel renders**

Reload a project page. In console:
```
const m = document.querySelector('.project-menu'); m.hidden = false; m.classList.add('project-menu--open');
```
Expected: dropdown drops under the header showing other-project rows identical to the footer, scrollable if tall. Set `m.hidden = true` to hide again.

- [ ] **Step 4: Commit**

```
git add js/project-page.js css/project-page.css
git commit -m "add project menu panel + backdrop dom"
```

---

## Task 4: Open/close state machine + wiring

**Files:**
- Modify: `js/project-page.js`

- [ ] **Step 1: Add `initBurgerMenu` function**

In `js/project-page.js`, add this function above `hideProject` (after `initProjectReveals`, ~line 245):

```javascript
// ── Burger menu: reveal + open/close ──────────────────

function initBurgerMenu(lenis) {
  const burger   = document.querySelector('.nav__burger');
  const hero     = container.querySelector('.project-page__hero');
  const panel    = container.querySelector('.project-menu');
  const backdrop = container.querySelector('.project-menu__backdrop');
  if (!burger || !hero || !panel || !backdrop) return null;

  burger.hidden = false;
  let open = false;

  function setOpen(next) {
    if (next === open) return;
    open = next;
    burger.classList.toggle('nav__burger--open', open);
    burger.setAttribute('aria-expanded', String(open));
    if (open) {
      panel.hidden = false;
      backdrop.hidden = false;
      // next frame so transition runs from initial state
      requestAnimationFrame(() => {
        panel.classList.add('project-menu--open');
        backdrop.classList.add('project-menu__backdrop--open');
      });
      if (lenis) lenis.stop();
    } else {
      panel.classList.remove('project-menu--open');
      backdrop.classList.remove('project-menu__backdrop--open');
      if (lenis) lenis.start();
      // hide after transition so it leaves the a11y tree
      setTimeout(() => { if (!open) { panel.hidden = true; backdrop.hidden = true; } }, 400);
    }
  }

  const onBurger   = () => setOpen(!open);
  const onBackdrop = () => setOpen(false);
  const onRow      = () => setOpen(false);              // navigation happens via href
  const onKey      = (e) => { if (e.key === 'Escape' && open) { setOpen(false); burger.focus(); } };

  burger.addEventListener('click', onBurger);
  backdrop.addEventListener('click', onBackdrop);
  panel.querySelectorAll('.project-footer__row').forEach(r => r.addEventListener('click', onRow));
  document.addEventListener('keydown', onKey);

  // Reveal burger once scrolled past the hero
  function onScroll() {
    const past = hero.getBoundingClientRect().bottom <= 0;
    burger.classList.toggle('nav__burger--visible', past);
    if (!past && open) setOpen(false);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  if (lenis) lenis.on('scroll', onScroll);
  onScroll();

  return () => {
    setOpen(false);
    burger.removeEventListener('click', onBurger);
    backdrop.removeEventListener('click', onBackdrop);
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('scroll', onScroll);
    if (lenis) lenis.off('scroll', onScroll);
    burger.classList.remove('nav__burger--visible', 'nav__burger--open');
    burger.setAttribute('aria-expanded', 'false');
    burger.hidden = true;
    if (lenis) lenis.start();
  };
}
```

- [ ] **Step 2: Wire it into `render` cleanup**

In `render`, update the init + `_cleanup` block (currently lines 102–109) to:

```javascript
  // Reveals + contact button + burger menu
  const cleanReveals = initProjectReveals();
  const cleanFooterArrows = initFooterArrows();
  const cleanBurgerMenu = initBurgerMenu(lenis);
  showForProject();

  _cleanup = () => {
    if (cleanReveals) cleanReveals();
    if (cleanFooterArrows) cleanFooterArrows();
    if (cleanBurgerMenu) cleanBurgerMenu();
  };
```

- [ ] **Step 3: Verify full interaction**

Reload a project page.
- Expected: burger hidden while in hero. Scroll down past the hero → burger fades in centered.
- Click burger → panel drops down, backdrop dims, page scroll locked, burger shows X.
- Click backdrop → closes. Open again, press `Esc` → closes, focus returns to burger.
- Open, click a project row → navigates to that project (menu gone on new page).
- Scroll back up into hero with menu open → menu auto-closes and burger hides.
- Console: no errors.

- [ ] **Step 4: Commit**

```
git add js/project-page.js
git commit -m "wire burger menu open/close + scroll reveal"
```

---

## Task 5: Cleanup on back-navigation + reduced motion + a11y polish

**Files:**
- Modify: `js/project-page.js`
- Modify: `css/project-page.css`

- [ ] **Step 1: Confirm `hideProject` resets the burger**

`hideProject` (lines 250–255) calls `_cleanup()`, which now runs `cleanBurgerMenu()` — that re-hides the burger and restores Lenis. No code change needed, but verify in Step 3. If the burger persists visible after pressing Back, ensure `hideProject` runs `_cleanup` before clearing `innerHTML` (it already does at line 252).

- [ ] **Step 2: Respect reduced motion**

Append to `css/project-page.css`:

```css
@media (prefers-reduced-motion: reduce) {
  .nav__burger,
  .nav__burger-line,
  .project-menu,
  .project-menu__backdrop {
    transition: none;
  }
}
```

- [ ] **Step 3: Verify back-navigation + reduced motion**

- On a project page, scroll past hero (burger visible), press the header Back button.
  Expected: returns to index, burger hidden, page scroll works normally (Lenis restored).
- Re-enter a project, open menu, press Back while open.
  Expected: index restored, no leftover backdrop/lock, scroll works.
- In devtools, emulate `prefers-reduced-motion: reduce`, repeat open/close.
  Expected: menu + X appear/disappear instantly, no transition, still functional.

- [ ] **Step 4: Commit**

```
git add js/project-page.js css/project-page.css
git commit -m "burger menu: reduced-motion + cleanup verify"
```

---

## Task 6: Mobile + final pass

**Files:**
- Modify: `css/project-page.css` (only if needed)

- [ ] **Step 1: Check mobile widths**

Resize to ≤768px (devtools device toolbar). Open the menu.
Expected: burger still centered; panel rows use the existing `@media (max-width:768px)` footer row height (90px); panel scrolls if needed; backdrop covers screen.

- [ ] **Step 2: Adjust only if broken**

If the burger overlaps the back/Contact buttons on narrow screens, reduce its hit area or hide one control — add under the existing `@media (max-width: 768px)` block in `css/project-page.css`. Only add CSS if an actual overlap/visual bug is observed; otherwise skip.

- [ ] **Step 3: Final verification sweep**

Run through, in one session: enter project → scroll → reveal → open → row hover (bg image + arrow anim) → Esc → backdrop click → navigate via row → Back. Confirm console clean throughout.

- [ ] **Step 4: Commit (if any change in Step 2) + push**

```
git add -A
git commit -m "burger menu: mobile pass"
git push
```
If Step 2 made no change, just push prior commits:
```
git push
```

---

## Self-Review Notes

- **Spec coverage:** reveal-past-hero (Task 4 `onScroll`), centered burger (Task 2 CSS), X morph (Task 2), dropdown panel under header (Task 3), exact footer rows / current excluded (Task 1 `renderProjectRows` + Task 3), close on burger/backdrop/Esc/row + scroll lock (Task 4), per-project DOM + cleanup in `hideProject` (Task 3 + Task 5), a11y `aria-expanded`/`aria-controls`/focus return (Task 2 + Task 4), reduced motion (Task 5). All spec items mapped.
- **Naming consistency:** `renderProjectRows`, `initBurgerMenu`, classes `nav__burger`, `nav__burger--visible`, `nav__burger--open`, `project-menu`, `project-menu--open`, `project-menu__backdrop`, `project-menu__backdrop--open` used identically across HTML/CSS/JS tasks.
- **Lenis:** `lenis` is already a param of `render` and passed to `showProject`; `initBurgerMenu(lenis)` reuses it for scroll-lock and the scroll hook, mirroring `lets-talk.js`.
