import { initContent  } from './content.js';
import { initCursor   } from './cursor.js';
import { initScroll   } from './scroll.js';
import { initLetsTalk } from './lets-talk.js';
import { initHeroBg   } from './hero-bg.js';
import { initHero     } from './hero.js';
import { initGallery  } from './gallery.js';
import { initRouter, currentRoute, resetRoute } from './router.js';
import { showProject, hideProject } from './project-page.js';
import { curtainTransition } from './page-transition.js';

await initContent(); // DOM populated before observers attach

// initCursor(); // white dot cursor hidden
const lenis = initScroll();
initLetsTalk(lenis);
const heroBg = initHeroBg();
const hero = initHero(heroBg);
initGallery(lenis);

// ── Black load overlay fades out → reveals shader ──────
const loadOverlay = document.querySelector('.load-overlay');
if (loadOverlay) {
  if (typeof gsap !== 'undefined') {
    gsap.to(loadOverlay, {
      opacity: 0,
      duration: 1.2,
      ease: 'power2.inOut',
      onComplete() { loadOverlay.remove(); },
    });
  } else {
    loadOverlay.remove();
  }
}

// Index sections hidden via body.is-project-view class (see style.css)
// CSS-driven hide is robust against accidental inline style overrides.
const projectView = document.getElementById('project-view');
const navBack = document.querySelector('.nav__back');
let _scrollY = 0;

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
navBack.addEventListener('click', (e) => {
  e.preventDefault();
  curtainTransition(() => {
    hideProject();
    showIndex();
    history.replaceState(null, '', location.pathname);
    resetRoute();
  }, { reverse: true });
});

function hideIndex() {
  _scrollY = window.scrollY;
  document.body.classList.add('is-project-view');
  navBack.hidden = false;
  window.scrollTo(0, 0);
  if (lenis) lenis.scrollTo(0, { immediate: true });
  if (hero && hero.hideCards) hero.hideCards();
}

function showIndex() {
  document.body.classList.remove('is-project-view');
  navBack.hidden = true;
  window.scrollTo(0, _scrollY);
  if (lenis) lenis.scrollTo(_scrollY, { immediate: true });
  if (hero && hero.showCards) hero.showCards();
  if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
  if (lenis) lenis.start();
}

// ── Button cursor-fill ────────────────────────────────
// White ball grows from the pointer + masks the label to black.
// Delegated so dynamic buttons (see-more, project menu, flying Contact)
// are covered with no per-render wiring.
const FILL_SELECTOR =
  '.btn-cta, .btn-secondary, .work__see-more, .nav__burger, .project-menu__item';
const canHover = matchMedia('(hover: hover)').matches;

function enhanceBtn(btn) {
  if (btn.dataset.fill) return;
  btn.dataset.fill = '1';
  const fill = document.createElement('span');
  fill.className = 'btn-fill';
  fill.setAttribute('aria-hidden', 'true');
  fill.innerHTML = btn.innerHTML;
  // Force the cloned label/icons black — inline beats any component color
  // rule (e.g. .project-menu__label) regardless of selector specificity.
  fill.style.color = '#000';
  fill.querySelectorAll('*').forEach(el => { el.style.color = '#000'; });
  btn.append(fill);
}

if (canHover) {
  document.addEventListener('pointerover', (e) => {
    const btn = e.target.closest?.(FILL_SELECTOR);
    if (!btn || btn.contains(e.relatedTarget)) return; // ignore moves between inner nodes
    enhanceBtn(btn);
    const r = btn.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    // radius reaches the farthest corner → ball always fully fills
    const rad = Math.max(
      Math.hypot(x, y), Math.hypot(r.width - x, y),
      Math.hypot(x, r.height - y), Math.hypot(r.width - x, r.height - y),
    );
    btn.style.setProperty('--btn-mx', `${x}px`);
    btn.style.setProperty('--btn-my', `${y}px`);
    btn.style.setProperty('--btn-r', `${rad}px`);
  });

  document.addEventListener('pointerout', (e) => {
    const btn = e.target.closest?.(FILL_SELECTOR);
    if (!btn || btn.contains(e.relatedTarget)) return; // still inside
    const r = btn.getBoundingClientRect();
    btn.style.setProperty('--btn-mx', `${e.clientX - r.left}px`); // retract toward exit
    btn.style.setProperty('--btn-my', `${e.clientY - r.top}px`);
    btn.style.setProperty('--btn-r', '0px');
  });
}

initRouter((route, prev) => {
  if (route.view === 'project') {
    const fromProject = prev && prev.view === 'project';
    curtainTransition(() => {
      if (fromProject) {
        window.scrollTo(0, 0);
        if (lenis) lenis.scrollTo(0, { immediate: true });
      } else {
        hideIndex();
      }
      showProject(route.projectId, lenis);
    });
  } else if (prev && prev.view === 'project') {
    curtainTransition(() => {
      hideProject();
      showIndex();
    }, { reverse: true });
  }
});
