export function initScroll() {
  if (typeof Lenis === 'undefined' || typeof gsap === 'undefined') return null;

  const lenis = new Lenis({
    duration: 1.2,
    easing: t => 1 - Math.pow(1 - t, 4),
    smooth: true,
    // Native touch scroll (no smoothTouch): lets the browser anchor content
    // when the mobile toolbar slides. Lenis-driven touch would fight that
    // anchor every frame → content jump. Hero card jitter is handled instead
    // by removing tilt + suppressing float while scrolling (hero.js).
    touchMultiplier: 2,
  });

  gsap.ticker.add(time => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // ── Scroll background — darkens shader behind content ──
  const bg = document.createElement('div');
  bg.className = 'scroll-bg';
  bg.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bg);

  const work = document.querySelector('.work');

  function updateBg() {
    document.body.classList.toggle('is-scrolled', lenis.scroll > 40);
    if (!work) return;
    const H       = window.innerHeight;
    const workTop = work.getBoundingClientRect().top;
    const t = Math.min(1, Math.max(0, (H - workTop) / (H * 0.5)));
    bg.style.opacity = t.toFixed(3);
  }

  lenis.on('scroll', updateBg);
  updateBg();

  // ── ScrollTrigger reveals ─────────────────────────────
  if (typeof ScrollTrigger === 'undefined') return lenis;

  gsap.registerPlugin(ScrollTrigger);
  // Don't refresh on the height-only resize from mobile browser chrome
  // (Firefox/Android bottom toolbar show/hide) — that refresh resyncs the
  // Lenis proxy and jumps the content. Only real (width) changes refresh.
  ScrollTrigger.config({ ignoreMobileResize: true });
  ScrollTrigger.scrollerProxy(document.body, {
    scrollTop(value) {
      if (arguments.length) lenis.scrollTo(value, { immediate: true });
      return lenis.scroll;
    },
    getBoundingClientRect() {
      return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
    },
  });
  lenis.on('scroll', ScrollTrigger.update);

  const noMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Hero snap — block Lenis from seeing wheel events while in hero ──
  const hero = document.querySelector('.hero');
  if (hero && work) {
    let inHero = true;
    let snapping = false;

    // Gallery overlay can open while still in the hero (portrait card). Its
    // own wheel/touch handlers must win — don't intercept or snap behind it.
    const galleryOverlay = document.getElementById('gallery-overlay');
    const overlayOpen = () => galleryOverlay && !galleryOverlay.hidden;

    // stopImmediatePropagation prevents ALL other handlers on window
    // (stopPropagation only blocks child-element handlers, not same-element)
    window.addEventListener('wheel', e => {
      if (overlayOpen()) return;
      if (!inHero || hero.offsetParent === null) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (snapping) return;
      if (e.deltaY > 0) {
        snapping = true;
        lenis.scrollTo(work, {
          duration: 1.2,
          easing: t => 1 - Math.pow(1 - t, 3),
          onComplete: () => { inHero = false; snapping = false; },
        });
      }
    }, { passive: false, capture: true });

    // Touch snap — desktop pointers only. Mobile scrolls hero freely.
    if (!matchMedia('(pointer: coarse)').matches) {
      let touchY0 = 0;
      window.addEventListener('touchstart', e => {
        if (overlayOpen()) return;
        if (inHero) touchY0 = e.touches[0].clientY;
      }, { passive: true, capture: true });
      window.addEventListener('touchmove', e => {
        if (overlayOpen()) return;
        if (!inHero || hero.offsetParent === null) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        if (snapping) return;
        if (touchY0 - e.touches[0].clientY > 20) {
          snapping = true;
          lenis.scrollTo(work, {
            duration: 1.2,
            easing: t => 1 - Math.pow(1 - t, 3),
            onComplete: () => { inHero = false; snapping = false; },
          });
        }
      }, { passive: false, capture: true });
    }

    // Scroll cue — click scrolls to work like the snap
    const scrollCue = document.querySelector('.hero__scroll-cue');
    if (scrollCue) {
      scrollCue.addEventListener('click', () => {
        if (snapping) return;
        snapping = true;
        lenis.scrollTo(work, {
          duration: 1.2,
          easing: t => 1 - Math.pow(1 - t, 3),
          onComplete: () => { inHero = false; snapping = false; },
        });
      });
    }

    // Sync inHero with actual scroll position — fixes false snap after
    // returning from project pages (scroll restored past hero zone)
    lenis.on('scroll', () => {
      if (inHero && !snapping && lenis.scroll >= hero.offsetHeight * 0.5) {
        inHero = false;
      }
      if (!inHero && lenis.scroll < 10) { inHero = true; snapping = false; }
    });
  }

  if (noMotion) return lenis;

  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  const START = isMobile ? '10% bottom' : '15% bottom';

  // ── Work entry headers — role + company anchors the section ─
  gsap.set('.work__entry-header', { y: 8, opacity: 0 });
  ScrollTrigger.batch('.work__entry-header', {
    onEnter: batch => gsap.to(batch, {
      y: 0, opacity: 1,
      duration: 0.9,
      ease: 'power3.out',
      stagger: 0.1,
    }),
    start: START,
    once: true,
  });

  // ── Work projects — image scales in, text rises ──
  // Image and text reveal on their OWN entry, not the project container's.
  // The text sits far below a tall image; triggering it on the container
  // (whose top is the image) animated the text while still below the fold,
  // so its reveal was never seen. Separate batches fix the trigger position.
  gsap.set('.work__project-text', { y: 10, opacity: 0 });
  gsap.set('.work__project-image', { scale: 0.94, opacity: 0 });

  ScrollTrigger.batch('.work__project-image', {
    onEnter: batch => gsap.to(batch, {
      scale: 1, opacity: 1,
      duration: 1.0,
      stagger: 0.15,
      ease: 'power2.out',
    }),
    start: START,
    once: true,
  });

  ScrollTrigger.batch('.work__project-text', {
    onEnter: batch => gsap.to(batch, {
      y: 0, opacity: 1,
      duration: 0.8,
      stagger: 0.15,
      ease: 'power3.out',
    }),
    start: START,
    once: true,
  });

  // ── Personal work grid ──────────────────────────────────
  gsap.set('.personal-work__item', { y: 40, opacity: 0 });
  ScrollTrigger.batch('.personal-work__item', {
    onEnter: batch => gsap.to(batch, {
      y: 0, opacity: 1,
      duration: 0.8,
      stagger: 0.12,
      ease: 'power3.out',
    }),
    start: START,
    once: true,
  });

  // ── About paragraphs — gentle, reading-paced ──────────
  gsap.set('.about__body', { y: 6, opacity: 0 });
  ScrollTrigger.batch('.about__body', {
    onEnter: batch => gsap.to(batch, {
      y: 0, opacity: 1,
      duration: 0.9,
      stagger: 0.18,
      ease: 'power2.out',
    }),
    start: START,
    once: true,
  });

  // ── About portrait — personal, slightly more dramatic ──
  gsap.set('.about__portrait', { scale: 0.9, opacity: 0 });
  ScrollTrigger.batch('.about__portrait', {
    onEnter: batch => gsap.to(batch, {
      scale: 1, opacity: 1,
      duration: 1.1,
      ease: 'power2.out',
    }),
    start: START,
    once: true,
  });

  // About CTA is invisible — the flying "Lets Talk" button
  // bounces to its position from nav via lets-talk.js

  // ── Footer — fade only, no movement ────────────────────
  gsap.set('.footer', { opacity: 0 });
  ScrollTrigger.batch('.footer', {
    onEnter: batch => gsap.to(batch, {
      opacity: 1,
      duration: 0.5,
      ease: 'power1.out',
    }),
    start: START,
    once: true,
  });

  return lenis;
}
