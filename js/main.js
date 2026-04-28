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

initCursor();
const lenis = initScroll();
initLetsTalk(lenis);
const heroBg = initHeroBg();
const hero = initHero(heroBg);
initGallery(lenis);

// Index sections to toggle when routing (nav stays visible on both views)
const indexContent = document.querySelectorAll('.hero, .work, .personal-work, .about, .footer, .bottom-blur, .scroll-bg');
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
  indexContent.forEach(el => el.style.display = 'none');
  navBack.hidden = false;
  window.scrollTo(0, 0);
  if (lenis) lenis.scrollTo(0, { immediate: true });
  if (hero && hero.hideCards) hero.hideCards();
}

function showIndex() {
  indexContent.forEach(el => el.style.display = '');
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
