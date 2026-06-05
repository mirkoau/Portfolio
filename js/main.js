import { initContent  } from './content.js';
import { initCursor   } from './cursor.js';
import { initScroll   } from './scroll.js';
import { initLetsTalk } from './lets-talk.js';
import { initHeroBg   } from './hero-bg.js';
import { initHero     } from './hero.js';
import { initGallery  } from './gallery.js';
import { initRouter, currentRoute, resetRoute } from './router.js';
import { showProject, hideProject } from './project-page.js';
import { wipeTransition } from './page-transition.js';

await initContent(); // DOM populated before observers attach

initCursor();
const lenis = initScroll();
initLetsTalk(lenis);
const heroBg = initHeroBg();
const hero = initHero(heroBg);
initGallery(lenis);

// Index sections hidden via body.is-project-view class (see style.css)
// CSS-driven hide is robust against accidental inline style overrides.
const projectView = document.getElementById('project-view');
const navBack = document.querySelector('.nav__back');
let _scrollY = 0;

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
navBack.addEventListener('click', (e) => {
  e.preventDefault();
  wipeTransition(
    () => { showIndex(); }, // index visible beneath the wiping project layer
    () => {
      hideProject();
      history.replaceState(null, '', location.pathname);
      resetRoute();
    },
    { reverse: true }
  );
});

// ── Back arrow animation (mirrors See More arrow) ────
const backArrow = navBack.querySelector('.nav__back-arrow');
if (backArrow && typeof gsap !== 'undefined') {
  navBack.addEventListener('mouseenter', () => {
    gsap.timeline()
      .to(backArrow, { x: -20, opacity: 0, duration: 0.25, ease: 'power3.in' })
      .set(backArrow, { x: 12 })
      .to(backArrow, { x: 0, opacity: 1, duration: 0.4, ease: 'power3.out' });
  });

  navBack.addEventListener('mouseleave', () => {
    gsap.to(backArrow, { x: 0, opacity: 1, duration: 0.3, ease: 'power2.out' });
  });
}

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

initRouter((route, prev) => {
  if (route.view === 'project') {
    const fromProject = prev && prev.view === 'project';
    wipeTransition(
      async () => {
        if (fromProject) {
          window.scrollTo(0, 0);
          if (lenis) lenis.scrollTo(0, { immediate: true });
        }
        await showProject(route.projectId, lenis); // render under cover
      },
      // hide index only once project fully covers it (else it vanishes unmasked)
      () => { if (!fromProject) hideIndex(); }
    );
  } else if (prev && prev.view === 'project') {
    wipeTransition(
      () => { showIndex(); },
      () => { hideProject(); },
      { reverse: true }
    );
  }
});
