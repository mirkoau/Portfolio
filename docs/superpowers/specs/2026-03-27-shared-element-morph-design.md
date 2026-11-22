# Shared Element Morph Transition — Design Spec
_2026-03-27_

## Context

The portfolio currently has no animated transition between the main index and project subpages — it's an instant show/hide. A `page-transition.js` file exists with a clone-based FLIP approach but is completely unwired. This spec replaces that with a GSAP `Flip.fit()` powered shared element morph: the clicked work card image flies and morphs into the project hero, and flies back on return.

---

## Approach

Use `gsap/Flip` plugin (`Flip.fit()`), which animates one element to match another's position, size, and border-radius. A fixed-position clone bridges the two views since the card image and hero image are different DOM elements.

---

## Forward Transition (card → project)

1. User clicks a work card image (`[data-project-link]` button or `.work__see-more`)
2. **Before** `navigate()` is called: `captureSource(btn)` stores the trigger element. A fixed clone of the card image is created immediately and appended to `<body>`.
3. `navigate()` fires → `hideIndex()` hides index sections (clone stays visible, it's fixed on body)
4. `showProject()` fetches JSON and renders HTML. Hero image starts at `opacity: 0`. Project `<article>` starts at `opacity: 0`.
5. Once rendered, `transitionToProject(heroImg)` is called:
   - `Flip.fit(clone, heroImg, { duration: 0.6, ease: 'expo.out' })`
   - Simultaneously: fade project `<article>` opacity 0 → 1 over 0.4s with a 0.2s delay
   - `onComplete`: remove clone, set `heroImg` opacity to 1

---

## Back Transition (project → index)

1. User clicks back button → `history.back()`
2. `transitionToIndex(projectView, restoreIndex)` is called (returns a Promise):
   - Clone hero image at its current fixed rect, append to `<body>`
   - Fade out project `<article>` (opacity 1 → 0, 0.25s)
   - Call `restoreIndex()` — index sections become visible, card element re-enters DOM
   - `Flip.fit(clone, cardImg, { duration: 0.5, ease: 'expo.inOut' })`
   - `onComplete`: remove clone, resolve Promise
3. After Promise resolves: `hideProject()` clears container

---

## Files Changed

| File | Change |
|------|--------|
| `index.html` | Add GSAP Flip CDN before closing `</body>` |
| `js/page-transition.js` | Full rewrite: `captureSource`, `transitionToProject`, `transitionToIndex` using `Flip.fit()` |
| `js/content.js` | `initProjectLinks()` — call `captureSource(btn)` before `navigate()` |
| `js/main.js` | Wire `transitionToIndex` in router callback; coordinate Promise with `hideProject`/`showIndex` |
| `js/project-page.js` | After render: call `transitionToProject(heroImg)`; set `<article>` initial opacity to 0 |

---

## Key Details

- **Clone timing**: Clone is created at click time (before `hideIndex`), so card geometry is captured while card is still visible in layout.
- **Border-radius**: `Flip.fit()` handles border-radius interpolation automatically (card has `border-radius: var(--radius)`, hero has `border-radius: 0` or similar).
- **Reduced motion**: Both transitions fall back to simple opacity fade when `prefers-reduced-motion: reduce`.
- **Rapid navigation**: `_currentId` guard in `project-page.js` already handles stale fetches. Clone is removed on complete so no orphan elements.
- **See More button**: Also navigates — `captureSource` should capture the card image element (`.work__project-image img`), not the See More button itself.

---

## CDN Line to Add

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/Flip.min.js"></script>
```

---

## Verification

1. Serve with `npx serve .` from `portfoolio/`
2. Click a work card image → image should fly and expand into hero position, project content fades in
3. Click back → hero image should fly back and shrink into card position
4. Click "See More" button → same forward transition as clicking the image
5. Rapidly click back/forward — no orphan clones, no broken state
6. Test with OS reduced-motion enabled → plain fade, no flying elements
