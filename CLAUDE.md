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

No runtime deps (Three.js/GSAP/Lenis from v1 removed). PP Neue Montreal is self-hosted in `assets/fonts/`. TODO notes in content JSON (`todo` fields) render only on localhost.

## Stack
- Pure HTML5 + CSS3 + Vanilla JS (ES modules)
- Native APIs: View Transitions, IntersectionObserver, ResizeObserver, `<dialog>`
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
js/content.js           — Fetches data.json, renders index sections; shared helpers (isDev, todoNote, frameMedia)
js/hero.js              — Hero headline line-mask reveal (keeps footnote markup)
js/project-page.js      — Case study: fetch/cache content/{id}.json, render, TOC spy, compare slider, pan, zoom
js/gallery.js           — <dialog> lightbox (freelance strip + case study images)
content/data.json       — work (companies → projects), approach, freelance, about
content/{id}.json       — Case study: meta, hero, sections[{stage, heading, body, pull?, media?, compare?}], results, todo
```

### Key Patterns
- **Hero:** type-led. Big headline sits low in a full-screen hero (whitespace above), two editorial footnote markers (¹ ²) whose notes sit right-aligned below; hovering a marker or note highlights the pair and draws a hairline (pure CSS `:has`). Facts row anchors the bottom. Rejected and removed (don't reintroduce): Figma bounding box/selection frame, canvas dot grid, game input prompts / hold-to-confirm, rotating hero images, per-letter animation.
- **Index sections:** sticky year timeline in Work (IO lights the visible card's `data-years` range), dark footer where the email itself is the copy button (underline + 'Click to copy' on hover). Nav Contact scrolls to footer (no hash; `#contact` would be parsed as a route).
- **Cards:** frame label (title + period) above image; hover = label tint + slight image zoom. No outlines/handles.
- **Case study structure:** stages Context → Challenge → Approach → Outcome, sticky TOC grouped by stage, Results block, next-project link.
- **Hero gradient:** hero.js paints a silk texture once on a canvas (4-colour ember mesh base + blurred bezier folds: multiply shadows, soft-light amber sheen, one screen specular glint; slightly random per load) → data URL in `--silk`. Each headline line shows its slice (background-clip:text), drifts (`--drift`), then a soft-edged ink wave (`--wave`) sweeps each line, cascading (~4.5s total). Plain markup restored on last line's `ink-wave` end. Parked idea to test later: mesh bloom *behind* the hero.
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
- Type: `--font` PP Neue Montreal only; scale `--text-sm` … `--text-display`
- Space: 8px base `--space-2xs` … `--space-2xl`; layout `--max 1280px`, `--gutter`, `--nav-height`
- Motion: `--ease-out`, `--ease-spring`, `--duration-fast/base/slow`

## Status
v2 redesign implemented. Open: confirm tools list + metrics (see TODO notes on localhost), convert large PNGs to WebP.
