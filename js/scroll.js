export function initScroll() {
  if (typeof Lenis === 'undefined' || typeof gsap === 'undefined') return null;

  const lenis = new Lenis({
    duration: 1.2,
    easing: t => 1 - Math.pow(1 - t, 4),
    smooth: true,
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

  // ── Glass scroll-light ─────────────────────────────────
  // A fixed light sits at the top of the viewport. p: 0 = button
  // at top (about to exit), 0.5 = centered, 1 = at bottom (entering).
  //  • entering (p>0.5): top highlight + bottom shadow, shadow grows heavy.
  //  • centered  (p=0.5): exact static default look.
  //  • exiting   (p<0.5): light passes overhead — top highlight and
  //    bottom shadow slowly swap to the opposite edges.
  // Drives --hlt/--hlb (edge highlights), --idt/--idb (inner darks),
  // --sht/--shb (drop shadows). CSS fallbacks keep the static look.
  const VARS = ['--hlt', '--hlb', '--idt', '--idb', '--sht', '--shb', '--be'];

  function updateGlass() {
    const H = window.innerHeight;
    document.querySelectorAll('.btn-cta, .btn-secondary, .work__see-more').forEach(el => {
      // Header buttons are fixed — don't react (incl. flying Contact docked in nav).
      // Clear any inline vars so they fall back to the static default look.
      if (el.closest('.nav') || el.classList.contains('btn-cta--nav') || el.classList.contains('gallery-overlay__close')) {
        VARS.forEach(v => el.style.removeProperty(v));
        return;
      }
      const r = el.getBoundingClientRect();
      if (r.height === 0) return;
      const p = Math.min(1, Math.max(0, (r.top + r.height / 2) / H));

      let hlt, hlb, idt, idb, sht, shb;
      if (p >= 0.5) {
        const w = (p - 0.5) / 0.5;          // 0 centered .. 1 entering bottom
        hlt = Math.max(0, 0.42 - 0.70 * w); // no top highlight until ~20% in view, then ramps to center
        hlb = 0;
        idt = 0; idb = 1;
        sht = 0; shb = 1 + 2.4 * w;         // bottom shadow grows heavy
      } else {
        // Swap centered at ~80% travel (p≈0.20), eased with a smoothstep
        // so the flip still feels like a natural light shift.
        let s = (0.29 - p) / (0.29 - 0.11);
        s = Math.min(1, Math.max(0, s));
        const u = s * s * (3 - 2 * s);      // 0 above band .. 1 below band
        hlt = 0.42 * (1 - u);              // top highlight → bottom highlight
        hlb = 0.42 * u;
        idt = u; idb = 1 - u;              // inner dark edge follows
        sht = u; shb = 1 - u;              // bottom shadow → top shadow
      }
      el.style.setProperty('--hlt', hlt.toFixed(3));
      el.style.setProperty('--hlb', hlb.toFixed(3));
      el.style.setProperty('--idt', idt.toFixed(3));
      el.style.setProperty('--idb', idb.toFixed(3));
      el.style.setProperty('--sht', sht.toFixed(3));
      el.style.setProperty('--shb', shb.toFixed(3));
      // left/right edge brightness follows whichever edge is lit
      el.style.setProperty('--be', Math.min(1, Math.max(hlt, hlb) / 0.42).toFixed(3));
    });
  }
  lenis.on('scroll', updateGlass);
  window.addEventListener('resize', updateGlass);
  updateGlass();

  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  const START = isMobile ? '5% bottom' : '15% bottom';

  // ── Work entry headers — role + company anchors the section ─
  gsap.set('.work__entry-header', { y: 40, opacity: 0 });
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

  // ── Work projects — text rises, image scales in after ──
  gsap.set('.work__project-text', { y: 50, opacity: 0 });
  gsap.set('.work__project-image', { scale: 0.94, opacity: 0 });

  ScrollTrigger.batch('.work__project', {
    onEnter: batch => {
      batch.forEach((project, i) => {
        const delay = i * 0.15;
        const text = project.querySelector('.work__project-text');
        const img  = project.querySelector('.work__project-image');

        if (text) gsap.to(text, {
          y: 0, opacity: 1,
          duration: 0.8, delay,
          ease: 'power3.out',
        });
        if (img) gsap.to(img, {
          scale: 1, opacity: 1,
          duration: 1.0, delay: delay + 0.15,
          ease: 'power2.out',
        });
      });
    },
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
  gsap.set('.about__body', { y: 30, opacity: 0 });
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
