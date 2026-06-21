// Three.js hero cards (name + tagline are DOM text — see .hero__intro)
// Desktop: organic float, mouse-contact kick, drag + throw
// Mobile:  organic float, device motion → chaotic card physics

import { navigate } from './router.js';
import { openGallery } from './gallery.js';
import { data } from './content.js';

export function initHero(bg) {
  if (!bg) return null;
  let paused = false;

  const { camera, scene, canvas } = bg;

  const isCoarse = matchMedia('(pointer: coarse)').matches;

  document.querySelectorAll('.hero__card').forEach(el => (el.style.display = 'none'));

  // Name + tagline are DOM text (.hero__intro) — kept OUT of the WebGL scene so
  // the shader's reduced DPR never softens them. We only blur/hide the element.
  // Scroll cue blurs alongside it on hold (both are DOM, above the canvas).
  const heroIntro = document.querySelector('.hero__intro');
  const heroCue   = document.querySelector('.hero__scroll-cue');

  let { W, H, Hb } = bg.getSize();   // H = design height (cards), Hb = buffer/camera height

  // ── Card layouts (matched to Figma 124:41) ─────────
  const CARDS_DESKTOP = [
    { left: 0.078, top: 0.658, w: 0.216, h: 258, z:   2, amp: 17, freq: 0.61, phase: 0.8 },  // dashboard bottom-left
    { left: 0.175, top: 0.220, w: 0.550, h: 594, z:  -5, amp: 20, freq: 0.42, phase: 0.0 },  // alan wake center (behind text)
    { left: 0.198, top: 0.085, w: 0.300, h: 340, z:  20, amp: 18, freq: 0.55, phase: 1.2 },  // firebreak top-left
    { left: 0.572, top: 0.503, w: 0.277, h: 336, z:   3, amp: 19, freq: 0.47, phase: 3.7 },  // website right
    { left: 0.654, top: 0.102, w: 0.143, h: 392, z:   1, amp: 22, freq: 0.35, phase: 2.5 },  // portrait top-right
  ];

  // sx/sy = scroll-scatter vector (fraction of W/H) — where card flies off to.
  const CARDS_MOBILE = [
    { left: 0.04, top: 0.62, w: 0.50, h: 160, z:   2, amp: 18, freq: 0.61, phase: 0.8, sx: -1.4, sy:  1.0 },  // evocon → bottom-left
    { left: 0.05, top: 0.22, w: 0.80, h: 340, z:  -5, amp: 22, freq: 0.42, phase: 0.0, sx: -1.6, sy:  0.7 },  // alan wake → left, bottomish
    { left: 0.10, top: 0.10, w: 0.46, h: 210, z:  20, amp: 20, freq: 0.55, phase: 1.2, sx: -1.2, sy: -1.2 },  // fbc → top-left
    { left: 0.50, top: 0.52, w: 0.46, h: 200, z:   3, amp: 21, freq: 0.47, phase: 3.7, sx:  1.7, sy:  0.1 },  // cleveron → right
    { left: 0.55, top: 0.08, w: 0.28, h: 240, z:   1, amp: 26, freq: 0.35, phase: 2.5, sx:  1.3, sy: -1.4 },  // portrait → top-right
  ];

  let CARDS = W <= 768 ? CARDS_MOBILE : CARDS_DESKTOP;

  const imgs = Array.from(document.querySelectorAll('.hero__card img'));

  function baseX(d) { return (d.left + d.w / 2) * W - W / 2; }
  // Top-anchored: y=0 at viewport top, negative downward (px-from-top).
  function baseY(d, h) { return -(d.top * H + h / 2); }

  // Build meshes — geometry updated once image loads to match aspect ratio
  const meshes = CARDS.map((d, i) => {
    const pw   = d.w * W;
    const tex  = new THREE.Texture();
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(pw, d.h),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true })
    );
    mesh.userData = {
      px: baseX(d), py: baseY(d, d.h),
      vx: 0, vy: 0,
      floatBlend: 0,
      scatter: 0,
      aspect: null,
    };
    mesh.position.set(mesh.userData.px, mesh.userData.py, d.z);
    scene.add(mesh);

    // Load image, derive height from natural aspect ratio
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      tex.image = img;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
      const aspect = img.naturalWidth / img.naturalHeight;
      mesh.userData.aspect = aspect;
      const h = pw / aspect;
      mesh.geometry.dispose();
      mesh.geometry = new THREE.PlaneGeometry(pw, h);
      mesh.userData.py = baseY(d, h);
      mesh.position.y = mesh.userData.py;
    };
    img.src = imgs[i]?.src || 'assets/images/placeholder.svg';

    return mesh;
  });

  // ── Mouse state (desktop only) ──────────────────────
  let rawX = W / 2, rawY = H / 2;
  let accDX = 0, accDY = 0;

  function toNDC(cx, cy) {
    // y over Hb — the camera frustum spans the full buffer (lvh+overscan).
    return new THREE.Vector2((cx / W) * 2 - 1, -((cy / Hb) * 2 - 1));
  }
  function toWorld(cx, cy) {
    return { x: cx - W / 2, y: -cy };   // top-anchored: y=0 at viewport top
  }

  // ── Drag + kick (desktop only) ─────────────────────
  const ray = new THREE.Raycaster();
  let drag = null;
  let prevHitSet = new Set();

  // ── Hold-to-navigate (desktop) ──────────────────────
  // Hold a linked card: 0.2s → blur everything else, held card stays sharp.
  // 2s → navigate to project. Release before 2s cancels.
  const PROJECT_LINKS = ['evocon-main', 'alan-wake-2', 'fbc-firebreak', 'cleveron-main', null];

  // Portrait card (top-right) → opens its image in the Personal Work gallery
  const PORTRAIT_INDEX = 4;
  function openPortraitGallery(mesh) {
    const items = data?.personalWork?.items;
    if (!items?.length) return;
    const heroSrc = imgs[PORTRAIT_INDEX]?.getAttribute('src');
    const idx = Math.max(0, items.findIndex(it => it.src === heroSrc));
    const list = items.map(it => ({ src: it.src, alt: it.alt, caption: it.caption }));

    // FLIP trigger: a throwaway img sat at the mesh's current screen rect
    const w = mesh.geometry.parameters.width;
    const h = mesh.geometry.parameters.height;
    const trig = document.createElement('div');
    trig.style.cssText =
      `position:fixed;left:${mesh.position.x + W / 2 - w / 2}px;` +
      `top:${-mesh.position.y - h / 2}px;width:${w}px;height:${h}px;` +
      'pointer-events:none;opacity:0;';
    const im = document.createElement('img');
    im.src = imgs[PORTRAIT_INDEX].src;
    im.style.cssText = 'width:100%;height:100%;object-fit:cover;';
    trig.appendChild(im);
    document.body.appendChild(trig);
    openGallery(list, idx, trig);
    setTimeout(() => trig.remove(), 1200);
  }
  let hold = null;
  function noScroll(e) { e.preventDefault(); }

  // One DOM img per card, sat at the canvas layer (z-2). Clones are appended
  // back-to-front so their natural paint order reproduces the WebGL depth — the
  // held card keeps its distance instead of popping above the rest.
  function makeCloneEl(src) {
    const im = document.createElement('img');
    im.src = src;
    im.alt = '';
    im.className = 'hero__hold-clone';
    im.style.cssText =
      'position:fixed;z-index:-2;pointer-events:none;object-fit:cover;' +
      'will-change:transform,filter;transition:filter 1.2s linear;filter:blur(0px);';
    document.body.appendChild(im);
    return im;
  }

  const cloneCardImg = mesh => makeCloneEl(imgs[meshes.indexOf(mesh)]?.src || '');

  function positionClone(im, m) {
    const w = m.geometry.parameters.width;
    const h = m.geometry.parameters.height;
    im.style.width  = w + 'px';
    im.style.height = h + 'px';
    im.style.left   = (m.position.x + W / 2 - w / 2) + 'px';
    im.style.top    = (-m.position.y - h / 2) + 'px';
  }

  function updateHoldClones() {
    if (!hold?.clones) return;
    hold.clones.forEach(c => positionClone(c.im, c.mesh));
  }

  function beginHoldBlur() {
    if (!hold) return;
    // Shader + cards live in the canvas — blur it as the backdrop. The DOM
    // name/tagline blur alongside it (own transition) now that they're not meshes.
    if (!noMotion) {
      canvas.style.transition = 'filter 1.2s linear';
      canvas.style.filter = 'blur(24px)';
      // DOM layers above the canvas (name/tagline + scroll cue) blur with it.
      // Keep opacity in the transition so the cue's scroll fade-out survives.
      [heroIntro, heroCue].forEach(el => {
        if (el) { el.style.transition = 'filter 1.2s linear, opacity 0.4s var(--ease-out)'; el.style.filter = 'blur(24px)'; }
      });
    }
    const order = meshes.map((mesh, i) => ({ mesh, z: CARDS[i].z }));
    order.sort((a, b) => a.z - b.z);
    hold.clones = order.map(({ mesh }) => {
      const im = cloneCardImg(mesh);
      positionClone(im, mesh);
      return { im, mesh, held: mesh === hold.mesh };
    });
    meshes.forEach(m => (m.visible = false));
    // Next frame: ramp every clone except the held one to full blur.
    requestAnimationFrame(() => {
      if (!hold?.clones || noMotion) return;
      hold.clones.forEach(c => { if (!c.held) c.im.style.filter = 'blur(24px)'; });
    });
  }

  function clearHoldVisuals() {
    canvas.style.transition = 'filter 0.3s ease';
    canvas.style.filter = '';
    [heroIntro, heroCue].forEach(el => {
      if (el) { el.style.transition = 'filter 0.3s ease, opacity 0.4s var(--ease-out)'; el.style.filter = ''; }
    });
    if (hold?.clones) hold.clones.forEach(c => c.im.remove());
    meshes.forEach(m => (m.visible = true));
  }

  function startHold(mesh, link, action = 'nav') {
    cancelHold();
    hold = { mesh, link, action, clones: null, blurT: 0, navT: 0 };
    hold.blurT = setTimeout(beginHoldBlur, 200);
    hold.navT  = setTimeout(finishHold, 1400);
  }

  function cancelHold() {
    if (!hold) return;
    if (hold.navigating) return; // cleanup deferred to hideCards (screen covered)
    clearTimeout(hold.blurT);
    clearTimeout(hold.navT);
    clearHoldVisuals();
    hold = null;
  }

  function finishHold() {
    if (!hold) return;
    const { mesh, link, action } = hold;
    drag = null;
    window.removeEventListener('wheel', noScroll);
    document.body.style.userSelect = '';

    if (action === 'gallery') {
      // Open the held portrait in the gallery, then restore the hero behind
      // the overlay's fading backdrop (no curtain covers this transition).
      openPortraitGallery(mesh);
      clearHoldVisuals();
      hold = null;
      return;
    }

    // Stay blurred through the navigate — the curtain transition covers the
    // screen, then hideCards() tears down clones + canvas blur unseen.
    hold.navigating = true;
    navigate(`#/work/${link}`);
  }

  if (!isCoarse) {
    window.addEventListener('mousemove', e => {
      accDX += e.clientX - rawX;
      accDY += e.clientY - rawY;
      rawX = e.clientX;
      rawY = e.clientY;
      if (!drag) {
        // Cards hidden (project view) or hero scrolled away → no card cursor.
        // Raycaster hits invisible meshes too, so guard explicitly.
        const ov = galleryOverlay && !galleryOverlay.hidden;
        const hr = heroSection ? heroSection.getBoundingClientRect() : null;
        if (paused || ov || (hr && hr.bottom <= hr.height * 0.2)) {
          document.body.style.cursor = '';
          return;
        }
        // Pointer cursor when hovering a card
        ray.setFromCamera(toNDC(e.clientX, e.clientY), camera);
        document.body.style.cursor = ray.intersectObjects(meshes).length ? 'pointer' : '';
        return;
      }
      drag.hist.push(toWorld(e.clientX, e.clientY));
      if (drag.hist.length > 8) drag.hist.shift();
    });

    window.addEventListener('mousedown', e => {
      const ov = galleryOverlay && !galleryOverlay.hidden;
      const hr = heroSection ? heroSection.getBoundingClientRect() : null;
      if (ov || (hr && hr.bottom <= hr.height * 0.2)) return;
      ray.setFromCamera(toNDC(e.clientX, e.clientY), camera);
      const hits = ray.intersectObjects(meshes);
      if (!hits.length) return;
      e.preventDefault();
      const mesh = hits[0].object;
      const wp   = toWorld(e.clientX, e.clientY);
      mesh.userData.vx = 0;
      mesh.userData.vy = 0;
      drag = {
        mesh,
        offX: mesh.userData.px - wp.x,
        offY: mesh.userData.py - wp.y,
        hist: [],
      };
      window.addEventListener('wheel', noScroll, { passive: false });
      document.body.style.userSelect = 'none';

      const idx = meshes.indexOf(mesh);
      const link = PROJECT_LINKS[idx];
      if (link) startHold(mesh, link);
      else if (idx === PORTRAIT_INDEX) startHold(mesh, null, 'gallery');
    });

    function endDrag() {
      cancelHold();
      if (!drag) return;
      const h = drag.hist;
      if (h.length >= 2) {
        const a = h[0], b = h[h.length - 1];
        drag.mesh.userData.vx = (b.x - a.x) / h.length * 1.6;
        drag.mesh.userData.vy = (b.y - a.y) / h.length * 1.6;
      }
      drag = null;
      prevHitSet = new Set();
      window.removeEventListener('wheel', noScroll);
      document.body.style.userSelect = '';
    }

    window.addEventListener('mouseup',    endDrag);
    window.addEventListener('mouseleave', endDrag);
  }

  // While scrolling, the float wobble jitters cards on top of the scroll
  // translation. Suppress it when moving, restore gentle float at rest.
  let lastScrollY = 0;
  let motionSuppress = 0;       // 0 = full float, 1 = frozen (scrolling)
  const noMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Constants ───────────────────────────────────────
  const DAMPING          = 0.92;
  const KICK_STR         = 0.15;
  const SETTLE_THRESHOLD = 0.35;
  const FLOAT_BLEND_IN   = 0.02;
  const FLOAT_BLEND_OUT  = 0.18;

  function clamp(ud) {
    const mx = W / 2;
    if (ud.px >  mx) { ud.px =  mx; ud.vx *= -0.6; }
    if (ud.px < -mx) { ud.px = -mx; ud.vx *= -0.6; }
    if (ud.py >   0) { ud.py =   0; ud.vy *= -0.6; }   // top edge
    if (ud.py <  -H) { ud.py =  -H; ud.vy *= -0.6; }   // bottom edge
  }

  // ── Render loop ─────────────────────────────────────
  const galleryOverlay = document.getElementById('gallery-overlay');
  const heroSection = document.getElementById('hero');

  function tick(time) {
    bg.tick(time);

    if (paused) { bg.render(); return; }
    const overlayOpen = galleryOverlay && !galleryOverlay.hidden;
    const heroRect = heroSection ? heroSection.getBoundingClientRect() : null;
    const heroGone = heroRect && heroRect.bottom <= heroRect.height * 0.2;
    const frozen = overlayOpen || heroGone;

    // Offset cards + text so they scroll with the page (not fixed in viewport)
    const scrollY = heroRect ? -heroRect.top : 0;

    // Scroll energy → suppress float/tilt so cards glide cleanly (no jitter).
    // Fast attack (snap off the moment scroll starts), slow release (no pop).
    const scrollVel = Math.abs(scrollY - lastScrollY);
    lastScrollY = scrollY;
    const energy = Math.min(1, scrollVel / 6);
    motionSuppress += (energy - motionSuppress) * (energy > motionSuppress ? 0.6 : 0.05);
    const calm = 1 - motionSuppress;

    // Mobile: a fixed canvas can't track native scroll without 1-frame jitter.
    // So pin the cards (no scroll offset) and drive them off by scroll instead
    // of gliding up — they scatter off-screen, done by 80% scroll-through. The
    // DOM name+tagline scroll up naturally. Desktop keeps the glide.
    const heroOffset = isCoarse ? 0 : scrollY;
    let scatterProg = 0;   // linear 0–1 scroll-through, drives per-card staggered scatter
    if (isCoarse && heroRect) {
      const raw  = -heroRect.top / heroRect.height;   // 0 at top → 1 past hero
      scatterProg = Math.min(1, Math.max(0, raw / 0.8)); // done by 80%
    }

    let kickDX = 0, kickDY = 0;
    if (!isCoarse && !frozen) {
      kickDX =  accDX * KICK_STR;
      kickDY = -accDY * KICK_STR;
      accDX = 0;
      accDY = 0;
    }

    let hitSet = new Set();
    if (!isCoarse && !drag && !frozen && (kickDX !== 0 || kickDY !== 0)) {
      ray.setFromCamera(toNDC(rawX, rawY), camera);
      const hits = ray.intersectObjects(meshes);
      hits.forEach(h => {
        hitSet.add(h.object.uuid);
        if (!prevHitSet.has(h.object.uuid)) {
          h.object.userData.vx += kickDX;
          h.object.userData.vy += kickDY;
        }
      });
    }
    prevHitSet = hitSet;

    meshes.forEach((mesh, i) => {
      const d  = CARDS[i];
      const ud = mesh.userData;

      if (drag?.mesh === mesh) {
        const wp = toWorld(rawX, rawY);
        ud.px = wp.x + drag.offX;
        ud.py = wp.y + drag.offY;
        ud.vx = 0;
        ud.vy = 0;
        ud.floatBlend = 0;
      } else {
        ud.vx *= DAMPING;
        ud.vy *= DAMPING;
        ud.px += ud.vx;
        ud.py += ud.vy;
        clamp(ud);

        const speed = Math.sqrt(ud.vx * ud.vx + ud.vy * ud.vy);
        const want  = speed < SETTLE_THRESHOLD ? 1 : 0;
        ud.floatBlend += (want - ud.floatBlend) * (want > ud.floatBlend ? FLOAT_BLEND_IN : FLOAT_BLEND_OUT);
      }

      const b = ud.floatBlend * calm;
      const floatX = (!noMotion && b > 0.01) ? Math.sin(time * d.freq * 0.6 + d.phase + 1.0) * d.amp * 0.3 * b : 0;
      const floatY = (!noMotion && b > 0.01) ? Math.sin(time * d.freq       + d.phase)         * d.amp       * b : 0;

      // Scatter (mobile). Not locked 1:1 to scroll: each card has its own
      // stagger window + a spring toward its target, so they leave organically.
      let scX = 0, scY = 0;
      if (isCoarse) {
        const start  = (d.phase % 1) * 0.18;             // per-card delay 0–0.18, from phase
        const local  = Math.min(1, Math.max(0, (scatterProg - start) / (1 - start)));
        const target = local * local * (3 - 2 * local);  // smoothstep
        ud.scatter  += (target - ud.scatter) * 0.12;     // spring → lag + settle
        const s = ud.scatter;
        const arc = Math.sin(s * Math.PI) * 0.10 * Math.sin(d.phase * 1.7); // curved flight, 0 at ends
        scX = ((d.sx || 0) + arc) * W * s;
        scY = (d.sy || 0) * H * s;
      }
      mesh.position.x = ud.px + floatX + scX;
      mesh.position.y = ud.py + floatY + heroOffset + scY;
      mesh.position.z = d.z;
    });

    if (hold?.clones) updateHoldClones();

    bg.render();
  }

  if (typeof gsap !== 'undefined') {
    gsap.ticker.add(tick);
    canvas.style.opacity = '1';

    // ── Reveal: black overlay fades out (main.js) → shader, then cards ─
    meshes.forEach(m => m.scale.set(0, 0, 1));

    // Cards come in as the overlay clears — snappy, staggered
    meshes.forEach((m, i) => {
      gsap.to(m.scale, {
        x: 1, y: 1,
        duration: 0.6,
        delay: 0.9 + i * 0.08,
        ease: 'back.out(1.5)',
      });
    });
  } else {
    canvas.style.opacity = '1';
    let t = 0;
    (function loop() { t += 0.016; tick(t); requestAnimationFrame(loop); })();
  }

  // ── Resize ──────────────────────────────────────────
  let lastResizeW = W;
  window.addEventListener('resize', () => {
    // Ignore iOS toolbar height jiggle (width unchanged) — rebuilding card
    // geometry mid-scroll causes the cards to jump. Width change only.
    if (isCoarse && window.innerWidth === lastResizeW) return;
    lastResizeW = window.innerWidth;
    ({ W, H, Hb } = bg.getSize());
    CARDS = W <= 768 ? CARDS_MOBILE : CARDS_DESKTOP;
    meshes.forEach((mesh, i) => {
      const d  = CARDS[i];
      const pw = d.w * W;
      const h  = mesh.userData.aspect ? pw / mesh.userData.aspect : d.h;
      mesh.geometry.dispose();
      mesh.geometry = new THREE.PlaneGeometry(pw, h);
      mesh.userData.px = baseX(d);
      mesh.userData.py = baseY(d, h);
    });
    // Name + tagline are CSS — they reflow on resize for free.
  });

  return {
    pause()  { paused = true; canvas.style.display = 'none'; },
    resume() { paused = false; canvas.style.display = ''; },
    hideCards() {
      // Tear down a held-card blur now that the curtain hides the swap
      if (hold) { clearHoldVisuals(); hold = null; }
      paused = true;
      meshes.forEach(m => m.visible = false);
      if (heroIntro) heroIntro.style.display = 'none';
    },
    showCards() {
      paused = false;
      meshes.forEach(m => m.visible = true);
      if (heroIntro) heroIntro.style.display = '';
    },
  };
}
