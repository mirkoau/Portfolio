// Three.js hero cards + text
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

  // Hide CSS tagline — Three.js renders it as a mesh
  const heroTaglineEl = document.querySelector('.hero__tagline');
  if (heroTaglineEl) { heroTaglineEl.style.animation = 'none'; heroTaglineEl.style.opacity = '0'; }

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

  // ── Text mesh helpers (left-aligned, Figma 124:41) ──
  function heroNameSize() {
    return Math.min(180, Math.max(50, W * 0.085));
  }

  function heroTaglineSize() {
    return Math.min(28, Math.max(14, W * 0.015));
  }

  const TEXT_LEFT = 0.089;   // 170 / 1920
  const NAME_TOP  = 0.42;

  let nameMesh     = null;
  let taglineMesh  = null;
  let fontsReady   = false;

  const TAGLINE_LINES = [
    'Design generalist currently working as',
    'Senior UX Designer at Remedy Entertainment.',
  ];

  const dpr = Math.max(devicePixelRatio, 2);

  function makeTextTex(cv) {
    const tex = new THREE.CanvasTexture(cv);
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return tex;
  }

  const TEXT_MAX_BLUR = 22;   // px (CSS) at full scroll-out

  // Text mesh that can blur via scroll. Sharp text drawn once to a source
  // canvas; display canvas is re-rendered from it per quantized px. Blur via
  // downscale→upscale (bilinear) — ctx.filter is unsupported on older iOS
  // Safari, this works everywhere. No geometry resize → top-of-page layout
  // stays pixel-identical to the sharp build.
  function makeBlurredTextMesh(draw, tw, th) {
    const src = document.createElement('canvas');
    src.width = tw * dpr; src.height = th * dpr;
    const sc = src.getContext('2d');
    sc.scale(dpr, dpr);
    draw(sc);

    const cv = document.createElement('canvas');
    cv.width = tw * dpr; cv.height = th * dpr;
    const cx = cv.getContext('2d');
    cx.imageSmoothingEnabled = true;
    cx.imageSmoothingQuality = 'high';
    const tmp = document.createElement('canvas');
    const tc  = tmp.getContext('2d');
    tc.imageSmoothingEnabled = true;
    tc.imageSmoothingQuality = 'high';
    const tex = makeTextTex(cv);

    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(tw, th),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true })
    );

    mesh.userData.blurPx = -1;
    mesh.userData.setBlur = px => {
      px = Math.round(px);
      if (px === mesh.userData.blurPx) return;
      mesh.userData.blurPx = px;
      cx.clearRect(0, 0, cv.width, cv.height);
      if (px <= 0) {
        cx.drawImage(src, 0, 0);
      } else {
        // Stronger px → shrink harder → blurrier on the way back up.
        const scale = Math.max(0.03, 1 - 0.97 * px / TEXT_MAX_BLUR);
        const dw = Math.max(1, Math.round(cv.width  * scale));
        const dh = Math.max(1, Math.round(cv.height * scale));
        tmp.width = dw; tmp.height = dh;
        tc.imageSmoothingEnabled = true;
        tc.imageSmoothingQuality = 'high';
        tc.drawImage(src, 0, 0, dw, dh);
        cx.drawImage(tmp, 0, 0, dw, dh, 0, 0, cv.width, cv.height);
      }
      tex.needsUpdate = true;
    };
    mesh.userData.setBlur(0);
    return mesh;
  }

  function buildTaglineMesh(W, H) {
    const fontSize = heroTaglineSize();
    const lineH    = Math.ceil(fontSize * 1.35);
    const fontStr  = `400 ${fontSize}px "PP Neue Montreal", sans-serif`;

    const mc = document.createElement('canvas');
    const mx = mc.getContext('2d');
    mx.font = fontStr;
    const pad = Math.ceil(fontSize * 0.15);
    const tw = Math.ceil(Math.max(...TAGLINE_LINES.map(l => mx.measureText(l).width))) + pad * 2;
    const th = lineH * TAGLINE_LINES.length + Math.ceil(fontSize * 0.4) + pad * 2;

    const mesh = makeBlurredTextMesh(cx => {
      cx.font         = fontStr;
      cx.fillStyle    = '#ffffff';
      cx.textBaseline = 'top';
      cx.textAlign    = 'left';
      TAGLINE_LINES.forEach((line, i) => cx.fillText(line, pad, pad + i * lineH));
    }, tw, th);

    const leftX    = TEXT_LEFT * W - W / 2 + tw / 2;
    const nameY    = -(NAME_TOP * H);
    const nameSize = heroNameSize();
    const gap      = W <= 768 ? 12 : 20;
    const posY     = nameY - nameSize * 0.55 - gap - th / 2;
    mesh.position.set(leftX, posY, 5);

    return mesh;
  }

  function buildNameMesh(W, H) {
    const fontSize = heroNameSize();
    const text     = 'Mirko Aus';
    const fontStr  = `italic 400 ${fontSize}px "Instrument Serif", serif`;

    const mc  = document.createElement('canvas');
    const mx  = mc.getContext('2d');
    mx.font = fontStr;
    const pad = Math.ceil(fontSize * 0.15);
    const tw = Math.ceil(mx.measureText(text).width) + pad * 2;
    const th = Math.ceil(fontSize * 1.3) + pad * 2;

    const mesh = makeBlurredTextMesh(cx => {
      cx.font          = fontStr;
      cx.fillStyle     = '#ffffff';
      cx.textBaseline  = 'middle';
      cx.textAlign     = 'left';
      cx.fillText(text, pad, th / 2);
    }, tw, th);

    const leftX = TEXT_LEFT * W - W / 2 + tw / 2 - fontSize * 0.06;
    const posY  = -(NAME_TOP * H);
    mesh.position.set(leftX, posY, 5);
    return mesh;
  }

  // ── Build text meshes once fonts load ────────────────
  document.fonts.ready.then(() => {
    fontsReady  = true;
    nameMesh    = buildNameMesh(W, H);
    taglineMesh = buildTaglineMesh(W, H);
    scene.add(nameMesh);
    scene.add(taglineMesh);

    // Name + tagline fade in a touch slower than the shader
    if (typeof gsap !== 'undefined') {
      nameMesh.material.opacity = 0;
      taglineMesh.material.opacity = 0;
      gsap.to([nameMesh.material, taglineMesh.material], {
        opacity: 1,
        duration: 1.2,
        delay: 0.8,
        ease: 'power2.out',
      });
    }
  });

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

  // One DOM img per scene element (cards + name + tagline), sat at the canvas
  // layer (z-2). Clones are appended back-to-front so their natural paint order
  // reproduces the WebGL depth — the held card keeps its distance instead of
  // popping above the rest, and text layers stay correctly interleaved.
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
  const cloneTextImg = mesh => makeCloneEl(mesh.material.map.image.toDataURL());

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
    // Shader + text stay in the canvas — blur it as the backdrop.
    if (!noMotion) {
      canvas.style.transition = 'filter 1.2s linear';
      canvas.style.filter = 'blur(24px)';
    }
    const order = meshes.map((mesh, i) => ({ mesh, z: CARDS[i].z, kind: 'card' }));
    if (nameMesh)    order.push({ mesh: nameMesh,    z: 5, kind: 'text' });
    if (taglineMesh) order.push({ mesh: taglineMesh, z: 5, kind: 'text' });
    order.sort((a, b) => a.z - b.z);
    hold.clones = order.map(({ mesh, kind }) => {
      const im = kind === 'card' ? cloneCardImg(mesh) : cloneTextImg(mesh);
      positionClone(im, mesh);
      return { im, mesh, held: mesh === hold.mesh };
    });
    meshes.forEach(m => (m.visible = false));
    if (nameMesh)    nameMesh.visible = false;
    if (taglineMesh) taglineMesh.visible = false;
    // Next frame: ramp every clone except the held one to full blur.
    requestAnimationFrame(() => {
      if (!hold?.clones || noMotion) return;
      hold.clones.forEach(c => { if (!c.held) c.im.style.filter = 'blur(24px)'; });
    });
  }

  function clearHoldVisuals() {
    canvas.style.transition = 'filter 0.3s ease';
    canvas.style.filter = '';
    if (hold?.clones) hold.clones.forEach(c => c.im.remove());
    meshes.forEach(m => (m.visible = true));
    if (nameMesh)    nameMesh.visible = true;
    if (taglineMesh) taglineMesh.visible = true;
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
    // So pin the hero elements (no scroll offset) and drive them off by scroll
    // instead of gliding up. Cards scatter off-screen; name+tagline blur away.
    // Both reach their endpoint by 60% scroll-through. Desktop keeps the glide.
    const heroOffset = isCoarse ? 0 : scrollY;
    let heroScatter = 0;   // 0 = home, 1 = fully scattered/blurred
    if (isCoarse && heroRect) {
      const raw  = -heroRect.top / heroRect.height;   // 0 at top → 1 past hero
      const prog = Math.min(1, Math.max(0, raw / 0.6)); // done by 60%
      heroScatter = prog * prog * (3 - 2 * prog);      // smoothstep
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

      const scX = isCoarse ? (d.sx || 0) * W * heroScatter : 0;
      const scY = isCoarse ? (d.sy || 0) * H * heroScatter : 0;
      mesh.position.x = ud.px + floatX + scX;
      mesh.position.y = ud.py + floatY + heroOffset + scY;
      mesh.position.z = d.z;
    });

    if (hold?.clones) updateHoldClones();

    if (nameMesh) nameMesh.position.y = -(NAME_TOP * H) + heroOffset;
    if (taglineMesh) {
      const nameSize = heroNameSize();
      const gap = W <= 768 ? 12 : 20;
      const tagH = taglineMesh.geometry.parameters.height;
      taglineMesh.position.y = -(NAME_TOP * H) - nameSize * 0.55 - gap - tagH / 2 + heroOffset;
    }
    // Blur name+tagline to nothing as you scroll (mobile). A late opacity fade
    // finishes the dissolve so blur fringe doesn't linger. heroScatter > 0 only
    // once scrolled, so this never clobbers the entrance opacity tween.
    if (isCoarse) {
      const blur = heroScatter * TEXT_MAX_BLUR;
      if (nameMesh)    nameMesh.userData.setBlur(blur);
      if (taglineMesh) taglineMesh.userData.setBlur(blur);
      if (heroScatter > 0) {
        const op = 1 - heroScatter * heroScatter;   // vanish weighted to the end
        if (nameMesh)    nameMesh.material.opacity    = op;
        if (taglineMesh) taglineMesh.material.opacity = op;
      }
    }

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
    // Ignore iOS toolbar height jiggle (width unchanged) — rebuilding card +
    // text geometry mid-scroll causes the cards to jump. Width change only.
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
    if (fontsReady) {
      for (const [get, build, set] of [
        [() => nameMesh,    buildNameMesh,    m => { nameMesh    = m; }],
        [() => taglineMesh, buildTaglineMesh, m => { taglineMesh = m; }],
      ]) {
        const old = get();
        const wasVisible = old ? old.visible : true;
        if (old) { scene.remove(old); old.geometry.dispose(); old.material.map.dispose(); old.material.dispose(); }
        const m = build(W, H);
        m.visible = wasVisible;
        set(m);
        scene.add(m);
      }
    }
  });

  return {
    pause()  { paused = true; canvas.style.display = 'none'; },
    resume() { paused = false; canvas.style.display = ''; },
    hideCards() {
      // Tear down a held-card blur now that the curtain hides the swap
      if (hold) { clearHoldVisuals(); hold = null; }
      paused = true;
      meshes.forEach(m => m.visible = false);
      if (nameMesh) nameMesh.visible = false;
      if (taglineMesh) taglineMesh.visible = false;
    },
    showCards() {
      paused = false;
      meshes.forEach(m => m.visible = true);
      if (nameMesh) nameMesh.visible = true;
      if (taglineMesh) taglineMesh.visible = true;
    },
  };
}
