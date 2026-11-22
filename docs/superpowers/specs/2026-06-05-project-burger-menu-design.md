# Project Burger Menu — Design

Date: 2026-06-05

## Goal

On a project subpage, show a burger button centered in the header. Reveal it
once the user scrolls past the project hero. Pressing it opens a dropdown menu —
styled exactly like the existing `project-footer` (other-project rows) — that
drops down just under the header.

## Behavior

### Reveal
- Burger `<button>` lives in the persistent `.nav` header, centered
  (`position: absolute; left: 50%; transform: translateX(-50%)`).
- Hidden by default. Only relevant on project pages.
- Reveals when the user scrolls **past `.project-page__hero`** (~50vh), using the
  same scroll-hook pattern as the flying Contact button
  (`lenis.on('scroll')` + `window` scroll fallback). Fades / slides in.
- Coexists in the header with: back button (left), burger (center),
  Contact CTA (right).

### Burger icon
- Two/three short lines, pure CSS (no new asset).
- Morphs to an **X** when the menu is open (CSS transform on the lines).

### Menu panel (dropdown)
- `position: fixed`, drops down from under the header. Fade + slide-down in.
- Dimmed backdrop behind the panel.
- Rows = **exact** `project-footer` row markup (bg image, big title, role/period
  meta, hover arrow + hover states). Full-size rows, identical look.
- Current project **excluded** from the list — identical set to `project-footer`.
- Panel scrolls internally if the row list exceeds available height.
- Closes on: burger pressed again, backdrop / outside click, `Esc`, or row click
  (which navigates to that project). Page scroll is locked while open.

## Architecture

### DOM / lifecycle
- **Burger button:** static in `index.html` inside `.nav`. `project-page.js`
  shows it (reveal class) and wires its click handler when a project mounts;
  hides it and removes the handler in `hideProject()`.
- **Menu panel + backdrop:** built per-project **inside the project container**,
  torn down in `hideProject()` cleanup. Natural lifecycle, simple cleanup.

### Shared renderer
- The other-project row markup is currently built inline as `footerRows` in
  `project-page.js`. Extract a single helper (e.g. `renderProjectRows(projects,
  currentId)`) and use it for **both** the footer and the menu, so the two stay
  pixel-identical by construction.

### State machine (menu)
- `closed` → `open` → `closed`. Open adds an `is-open` class on panel + burger,
  locks scroll; close reverses. All close triggers funnel through one
  `closeMenu()`.

## Files touched
- `index.html` — burger button in `.nav`; (menu container is created by JS in the
  project container).
- `js/project-page.js` — extract shared row renderer; build menu + backdrop;
  wire burger reveal on scroll; open/close state + Esc/outside/backdrop handlers;
  scroll lock; cleanup in `hideProject()`.
- `css/project-page.css` — burger icon + X morph; reveal state; dropdown panel +
  backdrop; reuse existing `project-footer__*` styles for rows.

## Accessibility
- Burger: `aria-label="Open menu"` / `aria-expanded` toggled; `aria-controls`
  pointing at panel id.
- Panel: `role` consistent with existing footer `<nav aria-label="Other
  projects">`. `Esc` closes. Focus returns to burger on close.
- Respect `prefers-reduced-motion` for the slide/fade (fall back to opacity or
  instant).

## Out of scope (YAGNI)
- No extra links (Work index, Contact) in the menu — projects only.
- No "active/current" row treatment — current project simply omitted.
- No persistent menu across view switches.
