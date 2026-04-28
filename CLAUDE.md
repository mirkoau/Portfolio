# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# portfoolio — Mirko's Portfolio

## Context
Senior UX Designer @ Remedy Entertainment. Personal portfolio site.
Design delivered from Figma. Implementation guided by `PLAN.md` (phased, phases 1–8 complete).

## Site Goals
- Simple, premium aesthetic
- Smooth organic microinteractions
- Fast, lightweight, no bloat

## Development
No build step. Serve with any static server:
```
npx serve .
# or VS Code Live Server
# or python -m http.server 8080
```
All deps loaded via CDN (Three.js 0.160.1, GSAP 3.12.5 + ScrollTrigger, Lenis 1.0.42) — no `npm install` needed. PP Neue Montreal is self-hosted in `assets/fonts/`.

## Stack
- Pure HTML5 + CSS3 + Vanilla JS (ES modules)
- Three.js, GSAP, Lenis via CDN
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
- Short, direct responses
- No filler, no preamble
- Sacrifice grammar for concision
- Ask before adding deps or new files
- Prefer editing existing files over creating new ones
- No auto-commit unless asked

## Performance Rules
- No unused CSS/JS shipped
- Images: WebP, lazy loaded
- Animations: `will-change` only when needed, prefer `transform`/`opacity`
- Respect `prefers-reduced-motion`

## Architecture

### File Structure
```
index.html              — SPA shell, all sections + project-view container
css/style.css           — Global styles, tokens, main page sections
css/project-page.css    — Project detail page (hero zone + content zone)
css/gallery.css         — Overlay image gallery
js/main.js              — Orchestrator: init, routing, index/project toggle
js/hero.js              — Three.js liquid gradient shader + floating cards
js/scroll.js            — Lenis smooth scroll + hero snap + ScrollTrigger reveals
js/content.js           — Fetches data.json, renders work/personal/about sections
js/project-page.js      — Project detail: render, snap scroll, reveals, cleanup
js/page-transition.js   — FLIP animation between index ↔ project views
js/lets-talk.js         — Flying Contact button (nav ↔ about), project page exports
js/router.js            — Hash-based SPA routing (#/work/{id})
js/gallery.js           — Personal work overlay gallery
js/cursor.js            — Custom cursor (velocity-reactive)
content/data.json       — Main content: work entries, personal items, about
content/{id}.json       — Per-project detail data (sections, tags, hero)
```

### Key Patterns
- **Routing:** Hash-based (`#/work/alan-wake-2`). `router.js` parses, `main.js` toggles views.
- **Shader:** Three.js liquid gradient (simplex noise FBM + domain warping). Fixed canvas z-index:-2. `hero.hideCards()`/`showCards()` keeps shader running on project pages while hiding card meshes.
- **Scroll:** Lenis smooth scroll + hero snap (wheel/touch intercepted, snaps to next section). Both index and project pages use snap behavior.
- **Contact button:** Single flying `<a>` element. State machine: hidden → nav → about. `showForProject()`/`hideForProject()` exported for project pages.
- **FLIP transitions:** `page-transition.js` captures source card rect, clones image, animates to/from project hero.
- **Content sections (project page):** 4 types: `image-left`, `image-right`, `image-only`, `text-only`. Legacy types (`text`, `image`, `image-pair`) still supported.
- **Scroll reveals:** GSAP ScrollTrigger batch, `start: '20% bottom'`, staggered. Project page reveals are cleaned up in `hideProject()`.

### Design Tokens
Defined in `css/style.css :root`. LAB color space. Key tokens:
- Colors: `--color-bg`, `--color-blue`, `--color-orange`, `--color-teal`
- Typography: `--font-display` (Instrument Serif), `--font-body` (PP Neue Montreal)
- Spacing: 8px base (`--space-xs` through `--space-2xl`)
- Layout: `--gutter` (80/40/20px responsive), `--col-offset`, `--nav-height`
- Animation: `--ease-out`, `--ease-spring`, `--duration-fast/base/slow`

### Data Flow
1. `content.js` fetches `data.json` → renders work/personal/about into DOM
2. Click project → `captureSource()` + `navigate(#/work/{id})`
3. `main.js` hides index, calls `showProject(id, lenis)`
4. `project-page.js` fetches `content/{id}.json` → renders hero + content zones
5. Back → `transitionToIndex()` FLIP → `hideProject()` cleanup → `showIndex()`

## Status
Work subpage implemented: full-viewport hero with shader, info card with tags, 4 content section layouts, snap scroll, Contact button on content scroll. Tags also added to main page Work section.
