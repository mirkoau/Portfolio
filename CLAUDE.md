# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# portfoolio v2 — Mirko's Portfolio (product/corporate version)

## Context
Senior UX Designer @ Remedy Entertainment. v2 = product-centered, corporate redesign of the live portfolio (`../portfoolio`, mirkoaus.com). Audience: product/SaaS hiring managers. `PLAN.md` describes v1 and is historical.

**Git: `origin` is the LIVE site repo. Commit locally only — never push** until a separate remote is set up. This overrides the auto-push rule below.

## Site Goals
- Light, editorial SaaS look; calm, credible, not templated
- Smart microinteractions that answer user actions
- Fast, lightweight, zero runtime deps

## Development
No build step. Serve with any static server:
```
npx serve .
# or VS Code Live Server
# or python -m http.server 8080
```
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
js/hero.js              — Resizable headline selection frame (drag/arrow keys, live W × H tag)
js/project-page.js      — Case study: fetch/cache content/{id}.json, render, TOC spy, compare slider, pan, zoom
js/gallery.js           — <dialog> lightbox (freelance strip + case study images)
content/data.json       — overview, work (companies → projects), approach, freelance, about
content/{id}.json       — Case study: meta, hero, sections[{stage, heading, body, pull?, media?, compare?}], results, todo
```

### Key Patterns
- **Design motif:** Figma selection frame. Hero headline frame is resizable; project cards show frame label + selection outline/handles on hover.
- **Case study structure:** stages Context → Challenge → Approach → Outcome, sticky TOC grouped by stage, Results block, next-project link.
- **Media:** `media` array renders count-aware grid (n1–n4). `wide: true` = horizontal pan strip. `compare: {before, after}` = range-driven slider.
- **Transitions:** View Transitions API morphs clicked card image → case hero (`view-transition-name: project-media`) and back. Falls back to instant swap; skipped on reduced motion.
- **Prefetch:** case JSON fetched on card hover.
- **Email:** base64 `data-c`/`data-d` decoded at runtime; copy button with confirmation + live region.

### Design Tokens (`css/style.css :root`)
- Color: `--paper #f4f5f7`, `--surface #fff`, `--ink #16181d`, `--ink-2/-3` secondary text, `--line`, `--select #1a6bff` (only accent; selection/focus/active)
- Type: `--font` PP Neue Montreal only; scale `--text-sm` … `--text-display`
- Space: 8px base `--space-2xs` … `--space-2xl`; layout `--max 1280px`, `--gutter`, `--nav-height`
- Motion: `--ease-out`, `--ease-spring`, `--duration-fast/base/slow`

## Status
v2 redesign implemented. Open: confirm tools list + metrics (see TODO notes on localhost), convert large PNGs to WebP.
