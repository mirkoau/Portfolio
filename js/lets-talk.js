// One fixed button physically travels between nav and about positions.
// nav__cta and about__cta are invisible layout anchors only.

let _showForProject = null;

export function showForProject() { if (_showForProject) _showForProject(); }

export function initLetsTalk(lenis) {
  if (typeof gsap === 'undefined') return;

  const navAnchor      = document.querySelector('.nav__cta');
  const aboutAnchor    = document.querySelector('.about__cta');
  const workSection    = document.querySelector('.work');
  const linkedinBtn    = document.querySelector('.about__linkedin');
  if (!navAnchor || !aboutAnchor || !workSection) return;

  // Silence anchors — position references only, never interactive
  navAnchor.style.animation     = 'none';
  navAnchor.style.opacity       = '0';
  navAnchor.style.pointerEvents = 'none';
  aboutAnchor.style.opacity       = '0';
  aboutAnchor.style.pointerEvents = 'none';

  // ── Single flying button ──────────────────────────────
  const btn = document.createElement('a');
  btn.href        = navAnchor.href;
  btn.className   = 'btn-cta';
  btn.innerHTML = 'Contact<span class="btn-emoji" aria-hidden="true">✉</span>';
  btn.setAttribute('aria-label', 'Contact Mirko via email');
  btn.style.cssText = 'position:fixed;margin:0;z-index:200;opacity:0;';
  document.body.appendChild(btn);

  // ── Anchor snapshot helpers ───────────────────────────
  function computedPx(el, prop) {
    return parseFloat(getComputedStyle(el)[prop]);
  }
  function navTarget() {
    const r = navAnchor.getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height, fontSize: computedPx(navAnchor, 'fontSize'), borderRadius: computedPx(navAnchor, 'borderRadius') };
  }
  function aboutTarget() {
    const r = aboutAnchor.getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height, fontSize: computedPx(aboutAnchor, 'fontSize'), borderRadius: computedPx(aboutAnchor, 'borderRadius') };
  }

  // Seed at nav position while invisible
  const n0 = navTarget();
  gsap.set(btn, { left: n0.left, top: n0.top, width: n0.width, height: n0.height, fontSize: n0.fontSize, borderRadius: n0.borderRadius });

  // ── State ─────────────────────────────────────────────
  let state = 'hidden';  // hidden | nav | about
  let tween = null;
  let handedOff = false; // true once parked on the static about anchor

  // ── Scroll tracking (active while state === 'about') ──
  let tracking = false;
  const setL = gsap.quickSetter(btn, 'left', 'px');
  const setT = gsap.quickSetter(btn, 'top',  'px');

  function trackAbout() {
    if (!tracking) return;
    const r = aboutAnchor.getBoundingClientRect();
    const p = clampPos({ left: r.left, top: r.top });
    setL(p.left);
    setT(p.top);
  }

  // ── Appear at nav ─────────────────────────────────────
  function appear() {
    if (state !== 'hidden') return;
    state = 'nav';
    btn.classList.add('btn-cta--nav');
    // Re-sync to nav in case layout shifted since init
    const n = navTarget();
    gsap.set(btn, { left: n.left, top: n.top, width: n.width, height: n.height });
    gsap.fromTo(btn,
      { opacity: 0, y: -10 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', clearProps: 'y' }
    );
  }

  // ── Arc flight ────────────────────────────────────────
  function fly(to) {
    if (state === 'hidden' || state === to) return;
    tracking = false;
    state    = to;
    if (to === 'nav') {
      btn.classList.add('btn-cta--nav');
      btn.classList.remove('btn-cta--about');
      if (handedOff) restoreFlying();  // fake takes over from the static anchor
      if (linkedinBtn) gsap.to(linkedinBtn, { opacity: 0, duration: 0.3, ease: 'power2.in' });
    } else {
      btn.classList.remove('btn-cta--nav');
      btn.classList.add('btn-cta--about');
    }
    if (tween) tween.kill();
    gsap.set(btn, { x: 0, y: 0 });

    const fromL  = parseFloat(gsap.getProperty(btn, 'left'));
    const fromT  = parseFloat(gsap.getProperty(btn, 'top'));
    const fromW  = parseFloat(gsap.getProperty(btn, 'width'));
    const fromH  = parseFloat(gsap.getProperty(btn, 'height'));
    const fromFs = parseFloat(gsap.getProperty(btn, 'fontSize'));
    const fromBr = parseFloat(gsap.getProperty(btn, 'borderRadius'));

    const dest = to === 'about' ? aboutTarget() : navTarget();

    // Nadir: midpoint dips 110px below the lower of the two endpoints.
    // Button may pass off-screen — intentional.
    const arc  = clampPos({ left: (fromL + dest.left) / 2, top: Math.max(fromT, dest.top) + 110 });
    const arcX = arc.left;
    const arcY = arc.top;

    tween = gsap.timeline();

    // Phase 1: accelerate to arc nadir, interpolating size halfway
    tween.to(btn, {
      left: arcX, top: arcY,
      width:        (fromW  + dest.width)        / 2,
      height:       (fromH  + dest.height)       / 2,
      fontSize:     (fromFs + dest.fontSize)     / 2,
      borderRadius: (fromBr + dest.borderRadius) / 2,
      duration: 0.38,
      ease: 'power2.in',
    });

    if (to === 'about') {
      // Phase 2 — live-tracked elastic landing.
      // Tween a scalar t from 1→0 (elastic). Each frame:
      //   position = currentAnchor + initialOffset * t
      // As t → 0 the button converges on wherever the anchor currently is,
      // so no snap occurs even if the user scrolled during flight.
      const spring = { t: 1 };
      let offsetX = 0;
      let offsetY = 0;

      tween.add(gsap.to(spring, {
        t: 0,
        duration: 0.72,
        ease: 'elastic.out(0.9, 0.65)',
        onStart() {
          const r = aboutAnchor.getBoundingClientRect();
          offsetX = parseFloat(gsap.getProperty(btn, 'left')) - r.left;
          offsetY = parseFloat(gsap.getProperty(btn, 'top'))  - r.top;
        },
        onUpdate() {
          const r = aboutAnchor.getBoundingClientRect();
          const p = clampPos({
            left: r.left + offsetX * spring.t,
            top:  r.top  + offsetY * spring.t,
          });
          gsap.set(btn, { left: p.left, top: p.top });
        },
        onComplete() {
          tracking = false;
          showStatic();  // hand off to the in-flow anchor — kills scroll jitter
          if (linkedinBtn) gsap.to(linkedinBtn, { opacity: 1, duration: 0.4, ease: 'power2.out' });
        },
      }));

      // Size settles smoothly in parallel with phase 2
      tween.to(btn, {
        width: dest.width, height: dest.height,
        fontSize: dest.fontSize, borderRadius: dest.borderRadius,
        duration: 0.52,
        ease: 'power2.out',
      }, '<');

    } else {
      // Nav anchor is fixed — plain elastic tween is fine
      tween.to(btn, {
        left: dest.left, top: dest.top,
        duration: 0.65,
        ease: 'elastic.out(0.6, 0.75)',
      });
      tween.to(btn, {
        width: dest.width, height: dest.height,
        fontSize: dest.fontSize, borderRadius: dest.borderRadius,
        duration: 0.52,
        ease: 'power2.out',
      }, '<');
    }
  }

  // ── Reduced motion check ─────────────────────────────
  const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isCoarse = matchMedia('(pointer: coarse)').matches;

  // ── Mobile arc clamp — keep button within the viewport ─
  const CLAMP_MARGIN = 16;
  function clampPos(pos) {
    if (!(isCoarse || window.innerWidth <= 768)) return pos;
    const w = btn.offsetWidth;
    const h = btn.offsetHeight;
    return {
      left: Math.max(CLAMP_MARGIN, Math.min(pos.left, window.innerWidth  - w - CLAMP_MARGIN)),
      top:  Math.max(CLAMP_MARGIN, Math.min(pos.top,  window.innerHeight - h - CLAMP_MARGIN)),
    };
  }


  // ── Mail emoji animation ─────────────────────────────
  // Factory so both the flying button and the static about anchor (the
  // duplicate it hands off to) share identical mail-send micro-anims.
  // querySelectorAll each time so the masked top-layer fill copy stays in sync.
  function makeMailAnim(el) {
    const emojis = () => el.querySelectorAll('.btn-emoji');
    let tl = null;
    return {
      play() {
        const els = emojis();
        if (!els.length || prefersReduced) return;
        if (tl) tl.kill();
        tl = gsap.timeline();
        // Lift + tilt like it's being sent
        tl.to(els, { y: -6, x: 4, rotation: -12, scale: 1.2, duration: 0.3, ease: 'power2.out' });
        // Little wiggle at the peak
        tl.to(els, { rotation: 8, duration: 0.15, ease: 'power1.inOut' });
        tl.to(els, { rotation: -6, duration: 0.12, ease: 'power1.inOut' });
        // Settle back with elastic bounce
        tl.to(els, { y: 0, x: 0, rotation: 0, scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
      },
      reset() {
        const els = emojis();
        if (!els.length || prefersReduced) return;
        if (tl) tl.kill();
        gsap.to(els, { y: 0, x: 0, rotation: 0, scale: 1, duration: 0.4, ease: 'power2.out' });
      },
    };
  }

  const flyMail   = makeMailAnim(btn);
  const anchorMail = makeMailAnim(aboutAnchor);
  const playMailAnim  = flyMail.play;
  const resetMailAnim = flyMail.reset;

  // ── Hover & press feedback ────────────────────────────
  let isNav = () => btn.classList.contains('btn-cta--nav');

  btn.addEventListener('mouseenter', () => {
    if (tween?.isActive() || prefersReduced) return;
    playMailAnim();
    if (isNav()) {
      gsap.to(btn, { scale: 1.05, duration: 0.35, ease: 'power2.out' });
    } else {
      gsap.to(btn, { scale: 1.08, duration: 0.4, ease: 'power2.out' });
    }
  });

  btn.addEventListener('mouseleave', () => {
    if (prefersReduced) return;
    resetMailAnim();
    if (isNav()) {
      gsap.to(btn, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
    } else {
      gsap.to(btn, { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    }
  });

  btn.addEventListener('mousedown', () => {
    if (prefersReduced) return;
    gsap.to(btn, { scale: 0.92, duration: 0.1, ease: 'power2.in' });
  });

  btn.addEventListener('mouseup', () => {
    if (prefersReduced) return;
    gsap.to(btn, { scale: 1.06, duration: 0.4, ease: 'elastic.out(1, 0.5)' });
  });

  btn.addEventListener('touchstart', () => {
    if (tween?.isActive() || prefersReduced) return;
    gsap.to(btn, { scale: 0.92, duration: 0.1, ease: 'power2.in' });
  }, { passive: true });

  btn.addEventListener('touchend', () => {
    if (prefersReduced) return;
    gsap.to(btn, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
  }, { passive: true });

  // ── Static anchor handoff ─────────────────────────────
  // While parked in the about section the fixed flying button jitters: it
  // chases the anchor one frame behind Lenis' smooth-scroll transform. So
  // once the landing finishes we hand off to the real in-flow anchor (a
  // duplicate that scrolls natively, zero lag) and hide the fake. On the way
  // back to nav we restore the fake at the anchor's current spot, then fly.
  function showStatic() {
    handedOff = true;
    gsap.set(aboutAnchor, { opacity: 1 });
    aboutAnchor.style.pointerEvents = 'auto';
    gsap.set(btn, { opacity: 0 });
    btn.style.pointerEvents = 'none';
  }
  function restoreFlying() {
    handedOff = false;
    const r = aboutAnchor.getBoundingClientRect();
    gsap.set(btn, {
      left: r.left, top: r.top, width: r.width, height: r.height,
      fontSize: computedPx(aboutAnchor, 'fontSize'),
      borderRadius: computedPx(aboutAnchor, 'borderRadius'),
      opacity: 1, x: 0, y: 0,
    });
    btn.style.pointerEvents = 'auto';
    gsap.set(aboutAnchor, { opacity: 0 });
    aboutAnchor.style.pointerEvents = 'none';
  }

  // Anchor mirrors the flying button's about-state hover/press feedback
  aboutAnchor.addEventListener('mouseenter', () => {
    if (prefersReduced) return;
    anchorMail.play();
    gsap.to(aboutAnchor, { scale: 1.08, duration: 0.4, ease: 'power2.out' });
  });
  aboutAnchor.addEventListener('mouseleave', () => {
    if (prefersReduced) return;
    anchorMail.reset();
    gsap.to(aboutAnchor, { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
  });
  aboutAnchor.addEventListener('mousedown', () => {
    if (prefersReduced) return;
    gsap.to(aboutAnchor, { scale: 0.92, duration: 0.1, ease: 'power2.in' });
  });
  aboutAnchor.addEventListener('mouseup', () => {
    if (prefersReduced) return;
    gsap.to(aboutAnchor, { scale: 1.06, duration: 0.4, ease: 'elastic.out(1, 0.5)' });
  });

  // ── Appear trigger: scrolled 80% into Work section ─────
  function checkWorkProgress() {
    if (state !== 'hidden') return;
    const r = workSection.getBoundingClientRect();
    const visible = Math.min(r.bottom, H) - Math.max(r.top, 0);
    if (visible / H >= 0.8) {
      appear();
      window.removeEventListener('scroll', checkWorkProgress);
      if (lenis) lenis.off('scroll', checkWorkProgress);
    }
  }
  const H = window.innerHeight;
  window.addEventListener('scroll', checkWorkProgress, { passive: true });
  if (lenis) lenis.on('scroll', checkWorkProgress);
  checkWorkProgress();

  // ── Scroll tracking hook ──────────────────────────────
  function onScroll() { trackAbout(); }
  if (lenis) lenis.on('scroll', onScroll);
  window.addEventListener('scroll', onScroll, { passive: true });

  // ── Flight trigger: about CTA enters / leaves viewport ─
  const aboutObserver = new IntersectionObserver(entries => {
    const e = entries[0];
    if (e.isIntersecting) {
      fly('about');
    } else {
      fly('nav');
    }
  }, { threshold: 0.05 });
  aboutObserver.observe(aboutAnchor);

  // ── Project page helpers ────────────────────────────
  // Keep button visible in nav position on subpages
  _showForProject = () => {
    if (state === 'hidden') {
      appear();
    } else if (state === 'about') {
      tracking = false;
      handedOff = false;
      state = 'nav';
      btn.classList.add('btn-cta--nav');
      btn.classList.remove('btn-cta--about');
      gsap.set(aboutAnchor, { opacity: 0 });        // drop the static duplicate
      aboutAnchor.style.pointerEvents = 'none';
      const n = navTarget();
      gsap.set(btn, { left: n.left, top: n.top, width: n.width, height: n.height, x: 0, y: 0, opacity: 1 });
      btn.style.pointerEvents = 'auto';
    }
    // nav state — already visible, nothing to do
  };

}
