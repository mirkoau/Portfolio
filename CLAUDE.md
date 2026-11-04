# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# portfoolio v2 — Mirko's Portfolio (product/corporate version)

## Context
Senior UX Designer @ Remedy Entertainment. v2 = product-centered, corporate redesign of the live portfolio (`../portfoolio`, mirkoaus.com). Audience: product/SaaS hiring managers. `PLAN.md` describes v1 and is historical.

**Git: `origin` is the LIVE site repo. Commit locally only — never push** until a separate remote is set up. This overrides the auto-push rule below.

## Site Goals
- Editorial + product-designer feel, NOT SaaS: square corners, no pills, big type, italic pull quotes, numbered figures. Tasteful motion: one hero moment, nothing gratuitous
- Smart microinteractions that answer user actions
- Fast, lightweight, zero runtime deps

## Development
No build step. Serve with any static server:
```
npx serve .
# or VS Code Live Server
# or python -m http.server 8080
```
**Caching gotcha:** `python -m http.server` sends no Cache-Control, so browsers heuristically cache ES modules and can mix a new `main.js` with a stale `router.js` etc. → import error → nothing JS-rendered (work, matrix, about, images). After JS edits, hard-reload (Ctrl+Shift+R), or use a server that sends `Cache-Control: no-cache`. Same risk for ~10 min after a GitHub Pages deploy (max-age=600) when module exports change.

Runtime dep: GSAP 3.15.1 (core + ScrollTrigger + ScrollSmoother, GreenSock standard no-charge license), self-hosted in `js/vendor/` as classic `defer` scripts loaded before `main.js` (no CDN, no CSP change). Font: Geist (Vercel, OFL; variable 100–900 + italic) self-hosted as WOFF2 in `assets/fonts/geist/` with OFL.txt. Headlines use a licensed serif (`'Serif'` family, variable 100–900, upright only, WOFF in `assets/fonts/serif/`) via `--font-display` on hero/section/case titles, case headings, pull quotes, card titles, results, approach titles, footer email; Geist stays for body/UI. Old PP Neue Montreal OTFs remain in `assets/fonts/pp-neue-montreal/` unused. TODO notes in content JSON (`todo` fields) render only on localhost.

## Stack
- Pure HTML5 + CSS3 + Vanilla JS (ES modules)
- GSAP (self-hosted) for scroll easing + reveals; native View Transitions, IntersectionObserver, ResizeObserver, `<dialog>`
- No framework, no bundler required

## Code Conventions
- **Files:** kebab-case (`about-section.js`, `hero.css`)
- **CSS:** Custom properties for all tokens; BEM-lite class naming (`.block__element--modifier`)
- **JS:** ES modules, no classes unless necessary, functional + composable
- **HTML:** Semantic elements, minimal nesting
- **Indent:** 2 spaces
- **Quotes:** double in HTML, single in JS/CSS

## Commit Style
Ultra-concise. Grammar optional. Examples:
- `add hero scroll anim`
- `fix nav mobile breakpoint`
- `perf: lazy load project imgs`

## Claude Interaction Style
- **Always load the `caveman` skill at the start of every conversation in this project.**
- Short, direct responses
- No filler, no preamble
- Sacrifice grammar for concision
- Ask before adding deps or new files
- Prefer editing existing files over creating new ones
- Auto-commit + push after substantial changes (concise message per Commit Style). Skip for tiny WIP edits or when explicitly told to hold.

## Code Intelligence

Prefer LSP over Grep/Glob/Read for code navigation:
- `goToDefinition` / `goToImplementation` to jump to source
- `findReferences` to see all usages across the codebase
- `workspaceSymbol` to find where something is defined
- `documentSymbol` to list all symbols in a file
- `hover` for type info without reading the file
- `incomingCalls` / `outgoingCalls` for call hierarchy

Before renaming or changing a function signature, use
`findReferences` to find all call sites first.

Use Grep/Glob only for text/pattern searches (comments,
strings, config values) where LSP doesn't help.

After writing or editing code, check LSP diagnostics before
moving on. Fix any type errors or missing imports immediately.

## Performance Rules
- No unused CSS/JS shipped
- Images: WebP, lazy loaded
- Animations: `will-change` only when needed, prefer `transform`/`opacity`
- Respect `prefers-reduced-motion`

## Architecture

### File Structure
```
index.html              — SPA shell: nav, hero (static), section containers, case-study view, lightbox, footer
css/style.css           — Tokens, base, nav, hero, overview, work, approach, freelance, about, footer, lightbox
css/project-page.css    — Case study page
js/main.js              — Orchestrator: init, email decode/copy, nav state, view transitions, routing
js/router.js            — Hash routing (#/work/{id}); everything else = index
js/motion.js            — GSAP layer: ScrollSmoother, scroll in/out reveals, scroll helpers, TOC pin
js/vendor/              — gsap.min.js, ScrollTrigger.min.js, ScrollSmoother.min.js, SplitText.min.js
js/content.js           — Fetches data.json, renders index sections; shared helpers (isDev, todoNote, frameMedia)
js/hero.js              — Hero headline line-mask reveal (keeps footnote markup)
js/project-page.js      — Case study: fetch/cache content/{id}.json, render, TOC spy, compare slider, pan, zoom
js/gallery.js           — <dialog> lightbox (freelance strip + case study images)
content/data.json       — work (companies → projects), approach, freelance, about
content/{id}.json       — Case study: meta, hero, sections[{stage, heading, body, pull?, media?, compare?}], results, todo
```

### Key Patterns
- **Scroll (js/motion.js):** ScrollSmoother on `#smooth-wrapper > #smooth-content` (smooth 0.8s, wheel only, touch native). Nav, lightbox stay outside (nav is `position: fixed`). Always scroll via `getScrollY / scrollToY / scrollToEl` (handles smoother or native); in-page `#anchor` clicks are intercepted and eased; route swaps call `refresh()` before jumping. `position: sticky` can't work inside the smoother, so the case TOC uses `pin()` (`html.has-smoother .case__toc` drops sticky). Reveals: `reveal(root)` registers ScrollTrigger.batch on REVEAL selectors (rise/fade 6px in 0.5s, ease out past the top in 0.35s, reverse on the way back); `prune()` kills triggers of removed nodes. Reduced motion or missing GSAP → native scroll, no reveals.
- **Layout:** the whole folio is one `.sheet` (max content + gutters, hairline side borders) on a darker `--canvas` surround; footer is a dark block inside it. Project cards are real cards: hairline frame on `--surface`, metadata strip (role / years), body = image + text; hover darkens the frame, dims other cards, nudges the title.
- **Hero:** dateline ('Folio 2026' / 'Updated <month>': keep current) + headline only, whitespace-led, flex column space-between. Rejected and removed (don't reintroduce): Figma bounding box, dot grid, game input prompts, rotating hero images, per-letter animation, 4-col facts grid, byline + 'Selected work' index block, footnote markers/notes, Work year timeline.
- **Index sections:** Work = company groups with project cards; hovering a card dims the others (text + images) and nudges its title (CSS `:has`). Dark footer where the email itself is the copy button. Nav Contact scrolls to footer (no hash; `#contact` would be parsed as a route).
- **Cards:** frame label (title + period) above image; hover = label tint + slight image zoom. No outlines/handles.
- **Case study structure:** stages Context → Challenge → Approach → Outcome, pinned TOC grouped by stage, Results block, next-project link.
- **Hero headline reveal (hero.js `revealHeadline`):** GSAP SplitText (words + chars), restrained staged scramble, horizontal only: 1–2 words get their 2–3 letter chunks shuffled (resolve first, expo.out 0.65s), ≤3 words nudged sideways 0.12–0.3em (expo.out 0.8s), 1 (sometimes 2) far word slides in along its own line from the open side, starting at 35% opacity (power4.inOut 1s, lands last). First word ('I') and 1-letter words never move. Scrambled state holds 0.45s. No end jitter: glyph positions of the unsplit text are measured first (Range rects) and every split letter lands on its kerned spot (SplitText loses kerning, up to ~32px drift otherwise), so `split.revert()` is pixel-identical. Ember mesh is parked behind `MESH = false`.
- **Hero gradient (parked):** a true mesh gradient (WebGL2, hero.js `startMesh`): 4×4 ember colour vertices, Catmull-Rom interpolated, vertices drifting via a smooth warp field. Canvas sits over the headline with `mix-blend-mode: lighten` inside an isolated `.hero` (paper bg), so colour only shows on the dark letters; all channels capped ≤0.95 so paper never tints. After ~1.7s the shader sweeps ink in (soft front, top line first, sine ease, 2.6s), then the canvas removes itself. No WebGL2 / reduced motion → plain ink. Parked idea: mesh bloom *behind* the hero.
- **Nav:** transparent + backdrop blur only (no fill); `.is-on-dark` flips to light text when the footer is under it (IO band at top).
- **Motion:** hero headline lines rise from masks (hero.js `revealLines`, measured after fonts load, original markup restored after; title is a flex column while revealing so collapsed margins don't shift spacing), then notes + facts rise; section titles reveal via scroll-driven CSS (`animation-timeline: view()`, progressive). No per-letter effects (user found them cheap). All off under reduced motion.
- **Video:** former GIFs are MP4 + `-poster.webp` (`video`/`poster` fields in JSON). `media()` helper in content.js; IO plays only on-screen loops, never with reduced motion. Lightbox handles video.
- **Fonts:** WOFF (book, medium, italic) built from the OTFs with fontTools. WOFF2 needs `brotli` (not installed).
- **Media:** `media` array renders count-aware grid (n1–n4). `wide: true` = horizontal pan strip. `compare: {before, after}` = range-driven slider.
- **Transitions:** View Transitions API morphs clicked card image → case hero (`view-transition-name: project-media`) and back. Falls back to instant swap; skipped on reduced motion.
- **Prefetch:** case JSON fetched on card hover.
- **Email:** base64 `data-c`/`data-d` decoded at runtime; copy button with confirmation + live region.

### Design Tokens (`css/style.css :root`)
- Color: `--paper`, `--surface`, `--ink`, `--ink-2/-3`, `--line`. Accent = Ember: `--accent #e2452b` (fills, rules, large text), `--accent-ink #b8321c` (small text, AA). Gradient palette `--ember-oxblood/-amber/-blush`. No blue (user: "feels Facebook").
- Type: `--font` Geist (body/UI), `--font-display` 'Serif' (headlines); scale `--text-sm` … `--text-display`
- Space: 8px base `--space-2xs` … `--space-2xl`; layout `--max 1280px`, `--gutter`, `--nav-height`
- Motion: `--ease-out`, `--ease-spring`, `--duration-fast/base/slow`

## Status
v2 redesign implemented. Open: confirm tools list + metrics (see TODO notes on localhost), convert large PNGs to WebP.
