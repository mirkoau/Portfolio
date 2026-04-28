# portfoolio — Implementation Plan

## Dependencies
- **GSAP** — animations, staggered reveals, Lets Talk transition
- **Lenis** — smooth scroll
- **Three.js** — hero 3D cards
- Google Fonts: **Instrument Serif** (regular, italic), **Public Sans**, **Inter**

---

## Phase 1 — Foundation ✅
*Structure, tokens, fonts, reset*

- [x] Project file structure (`index.html`, `css/`, `js/`, `assets/`)
- [x] Google Fonts `<link>` in `<head>`
- [x] `css/tokens.css` — all custom properties: colors, type scale, spacing
- [x] `css/reset.css` — minimal modern reset
- [x] `css/base.css` — body, selection, scrollbar
- [x] Bare `index.html` with all section scaffolding (`<nav>`, `<section id="hero">`, `<section id="work">`, `<section id="personal-work">`, `<section id="about">`)

---

## Phase 2 — Layout & Static Content ✅
*All sections built, placeholder images, no animation*

- [x] Nav: sticky, top-right "Lets Talk" yellow button only
- [x] Hero: "MIRKO AUS" heading + tagline, 5 placeholder image cards positioned per design
- [x] Vertical sticky labels ("Work", "Personal Work", "Me") — CSS `position: sticky`
- [x] Work section: timeline entries (Remedy, Cleveron, Evocon) with text + placeholder images
- [x] Personal Work: 2×2 image grid with placeholders
- [x] About/Me: bio text, portrait placeholder, large "Lets Talk" button
- [x] `prefers-reduced-motion` media query stubbed in from the start

---

## Phase 3 — Typography & Visual Finish ✅
*Colors, spacing, type rendering, section accents*

- [x] Section-specific color accents (blue → Work, teal → Personal Work, orange → Me)
- [x] "MIRKO AUS": CSS gradient reveal on load + slow looping gradient shimmer
- [x] All body copy, heading hierarchy, spacing locked in
- [x] Placeholder images styled with correct aspect ratios and border-radius

---

## Phase 4 — Page Load Reveal & Custom Cursor ✅
*First interactions*

- [x] GSAP staggered fade-in on load: nav → hero text → hero cards
- [x] Custom cursor: 12px–36px dot, `mix-blend-mode: difference`
- [x] Cursor size driven by mouse velocity (rolling delta average per frame)
- [x] Smooth size via `lerp` each frame (scale() — compositor only, no layout)
- [x] Hide default cursor globally

---

## Phase 5 — Smooth Scroll & Sticky Behaviors ✅
*Lenis + sticky label polish*

- [x] Lenis initialised, connected to GSAP ticker
- [x] Vertical labels verified sticky across full scroll range of their section
- [x] Scroll position tracking set up (needed for Phase 6)

---

## Phase 6 — "Lets Talk" Button Transition ✅
*The centrepiece microinteraction — clone FLIP, elastic bounce, bidirectional*

- [x] Track when About section's "Lets Talk" enters viewport
- [x] Clone technique: about button cloned, scaled down to nav size, flies to about position
- [x] About button hidden until nav button lands, then swap visibility
- [x] Reverse on scroll up
- [x] Bounce easing (`elastic.out(1, 0.65)`)
- [x] Both buttons share `.btn-cta` structure so clone is seamless

---

## Phase 7 — Three.js Hero Cards ✅
*The visual showpiece*

- [x] Three.js scene: 5 textured planes matching CSS layout positions
- [x] Continuous organic float per card (sin-wave, unique amp/freq/phase per card)
- [x] Depth layering: cards at different Z values
- [x] Mouse proximity push repulsion + spring return to float target
- [x] Hover UV tilt (rotX/rotY) + scale pop
- [x] Drag + throw physics with velocity history
- [x] Placeholder textures until real images arrive
- [x] prefers-reduced-motion: float/push/tilt disabled
- [x] Resize handler rebulids geometry + camera

---

## Phase 8 — JSON Data Layer ✅
*Single source of truth for all content; image affordance UI*

- [x] `content/data.json` — schema: work entries → projects → gallery[], personalWork.items[], about
- [x] `js/content.js` — fetch → render work / personal work / about; graceful static HTML fallback
- [x] `index.html` — section-mains emptied; about__cta moved to section-aside
- [x] `js/main.js` — `await initContent()` before all other inits
- [x] `css/style.css` — `.work__project-image` as `<button>`; hover scale+dim; press scale-down; gallery-icon (grid SVG mask, blur pill) fades on hover
- [x] `[data-gallery-trigger]` + `[data-project-id]` attributes wired for Phase 9

---

## Phase 9 — Gallery Overlay
*Full-screen image viewer, triggered from work section cards*

**Trigger & data flow**
- [ ] `js/gallery.js` — `import { contentReady, data } from './content.js'`; no second fetch
- [ ] Click on `[data-gallery-trigger]` → resolve project from `[data-project-id]` → call `openOverlay({ company, project })`
- [ ] `project.gallery[]` → `{ src, alt, caption }` per slide

**Overlay structure**
- [ ] Full-screen fixed backdrop (dark, frosted or solid)
- [ ] Header: company name + project title (if not null)
- [ ] Main image: centered, max constrained, aspect-ratio preserved
- [ ] Caption text below image
- [ ] Prev / Next navigation (arrow buttons or keyboard ←/→)
- [ ] Slide counter (e.g. "2 / 4")
- [ ] Close: X button + ESC key
- [ ] Single-image projects: no nav arrows shown

**Animation**
- [ ] Overlay open: fade-in + scale up from card position (FLIP or simple scale from center)
- [ ] Image transitions: crossfade or slide between gallery items
- [ ] Close: reverse of open
- [ ] `prefers-reduced-motion`: instant show/hide, no transitions

**Accessibility**
- [ ] `role="dialog"` + `aria-modal="true"` + `aria-label`
- [ ] Focus trapped inside overlay while open
- [ ] Focus returns to trigger button on close
- [ ] `<img>` alt text from data

**CSS** (`css/gallery.css`, new file)
- [ ] Overlay z-index above everything (1000+)
- [ ] Image sizing: `max-height: 80vh`, `max-width: 90vw`, object-fit contain
- [ ] Caption: small, muted, centered
- [ ] Nav arrows: pill buttons, abs positioned left/right

---

## Phase 10 — Responsive / Mobile
*Single breakpoint: ≤768px — done last*

- [ ] Single-column reflow, scaled typography
- [ ] Vertical labels hidden or repositioned
- [ ] Hero cards → horizontal auto-scrolling carousel (CSS animation, smooth loop)
- [ ] Three.js disabled on mobile
- [ ] Lets Talk transition: nav button fades out, About button fades in (no FLIP on mobile)
- [ ] Touch-friendly tap targets
- [ ] Gallery overlay: full-screen, swipe left/right between images

---

## Notes
- Each phase is independently shippable
- Phases 1–3 require no JS
- Three.js (Phase 7) is isolated — won't break page if disabled
- Lets Talk mailto: mirko.aus@proton.me
