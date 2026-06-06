// Three.js hero cards + text
// Desktop: organic float, mouse-contact kick, drag + throw
// Mobile:  organic float, device motion → chaotic card physics

export function initHero(bg) {
  if (!bg) return null;
  let paused = false;

  const { renderer, camera, scene, canvas } = bg;

  const isCoarse = matchMedia('(pointer: coarse)').matches;

  document.querySelectorAll('.hero__card').forEach(el => (el.style.display = 'none'));

  // Hide CSS tagline — Three.js renders it as a mesh
  const heroTaglineEl = document.querySelector('.hero__tagline');
  if (heroTaglineEl) { heroTaglineEl.style.animation = 'none'; heroTaglineEl.style.opacity = '0'; }

  let { W, H } = bg.getSize();

  // ── Card layouts (matched to Figma 124:41) ─────────
  const CARDS_DESKTOP = [
    { left: 0.078, top: 0.658, w: 0.216, h: 258, z:   2, amp: 17, freq: 0.61, phase: 0.8 },  // dashboard bottom-left
    { left: 0.175, top: 0.220, w: 0.550, h: 594, z:  -5, amp: 20, freq: 0.42, phase: 0.0 },  // alan wake center (behind text)
    { left: 0.198, top: 0.085, w: 0.300, h: 340, z:  20, amp: 18, freq: 0.55, phase: 1.2 },  // firebreak top-left
    { left: 0.572, top: 0.503, w: 0.277, h: 336, z:   3, amp: 19, freq: 0.47, phase: 3.7 },  // website right
    { left: 0.654, top: 0.102, w: 0.143, h: 392, z:   1, amp: 22, freq: 0.35, phase: 2.5 },  // portrait top-right
  ];

  const CARDS_MOBILE = [
    { left: 0.04, top: 0.62, w: 0.50, h: 160, z:   2, amp: 11, freq: 0.61, phase: 0.8 },
    { left: 0.05, top: 0.22, w: 0.80, h: 340, z:  -5, amp: 14, freq: 0.42, phase: 0.0 },
    { left: 0.10, top: 0.10, w: 0.46, h: 210, z:  20, amp: 12, freq: 0.55, phase: 1.2 },
    { left: 0.50, top: 0.52, w: 0.46, h: 200, z:   3, amp: 13, freq: 0.47, phase: 3.7 },
    { left: 0.55, top: 0.08, w: 0.28, h: 240, z:   1, amp: 16, freq: 0.35, phase: 2.5 },
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

    const cv = document.createElement('canvas');
    cv.width  = tw * dpr;
    cv.height = th * dpr;
    const cx  = cv.getContext('2d');
    cx.scale(dpr, dpr);
    cx.font         = fontStr;
    cx.fillStyle    = '#ffffff';
    cx.textBaseline = 'top';
    cx.textAlign    = 'left';
    TAGLINE_LINES.forEach((line, i) => cx.fillText(line, pad, pad + i * lineH));

    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(tw, th),
      new THREE.MeshBasicMaterial({ map: makeTextTex(cv), transparent: true })
    );

    const leftX    = TEXT_LEFT * W - W / 2 + tw / 2;
    const nameY    = H / 2 - NAME_TOP * H;
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

    const cv = document.createElement('canvas');
    cv.width  = tw * dpr;
    cv.height = th * dpr;
    const cx  = cv.getContext('2d');
    cx.scale(dpr, dpr);
    cx.font          = fontStr;
    cx.fillStyle     = '#ffffff';
    cx.textBaseline  = 'middle';
    cx.textAlign     = 'left';
    cx.fillText(text, pad, th / 2);

    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(tw, th),
      new THREE.MeshBasicMaterial({ map: makeTextTex(cv), transparent: true })
    );

    const leftX = TEXT_LEFT * W - W / 2 + tw / 2 - fontSize * 0.06;
    const posY  = H / 2 - NAME_TOP * H;
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
  });

  const imgs = Array.from(document.querySelectorAll('.hero__card img'));

  function baseX(d) { return (d.left + d.w / 2) * W - W / 2; }
  function baseY(d, h) { return H / 2 - (d.top * H + h / 2); }

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
    return new THREE.Vector2((cx / W) * 2 - 1, -((cy / H) * 2 - 1));
  }
  function toWorld(cx, cy) {
    return { x: cx - W / 2, y: H / 2 - cy };
  }

  // ── Drag + kick (desktop only) ─────────────────────
  const ray = new THREE.Raycaster();
  let drag = null;
  let prevHitSet = new Set();

  if (!isCoarse) {
    window.addEventListener('mousemove', e => {
      accDX += e.clientX - rawX;
      accDY += e.clientY - rawY;
      rawX = e.clientX;
      rawY = e.clientY;
      if (!drag) return;
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
    });

    function noScroll(e) { e.preventDefault(); }

    function endDrag() {
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

  // ── DeviceMotion (mobile only) ──────────────────────
  let motionActive = false;
  let shakeVX = 0, shakeVY = 0;
  const noMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function onDeviceMotion(e) {
    const a = e.accelerationIncludingGravity;
    if (!a) return;
    const scale = 0.6;
    shakeVX += (a.x || 0) * scale;
    shakeVY += -(a.y || 0) * scale;
  }

  function startMotionListening() {
    if (motionActive || noMotion) return;
    motionActive = true;
    window.addEventListener('devicemotion', onDeviceMotion);
  }

  if (isCoarse && !noMotion) {
    const requestMotion = () => {
      if (typeof DeviceMotionEvent !== 'undefined' &&
          typeof DeviceMotionEvent.requestPermission === 'function') {
        DeviceMotionEvent.requestPermission().then(state => {
          if (state === 'granted') startMotionListening();
        }).catch(() => {});
      } else {
        startMotionListening();
      }
    };
    document.addEventListener('touchstart', requestMotion, { once: true });
  }

  // ── Constants ───────────────────────────────────────
  const DAMPING          = 0.92;
  const KICK_STR         = 0.15;
  const SETTLE_THRESHOLD = 0.35;
  const FLOAT_BLEND_IN   = 0.02;
  const FLOAT_BLEND_OUT  = 0.18;

  function clamp(ud) {
    const mx = W / 2, my = H / 2;
    if (ud.px >  mx) { ud.px =  mx; ud.vx *= -0.6; }
    if (ud.px < -mx) { ud.px = -mx; ud.vx *= -0.6; }
    if (ud.py >  my) { ud.py =  my; ud.vy *= -0.6; }
    if (ud.py < -my) { ud.py = -my; ud.vy *= -0.6; }
  }

  // ── Render loop ─────────────────────────────────────
  const galleryOverlay = document.getElementById('gallery-overlay');
  const heroSection = document.getElementById('hero');

  function tick(time) {
    bg.tick(time);

    if (paused) { renderer.render(scene, camera); return; }
    const overlayOpen = galleryOverlay && !galleryOverlay.hidden;
    const heroRect = heroSection ? heroSection.getBoundingClientRect() : null;
    const heroGone = heroRect && heroRect.bottom <= heroRect.height * 0.2;
    const frozen = overlayOpen || heroGone;

    // Offset cards + text so they scroll with the page (not fixed in viewport)
    const scrollY = heroRect ? -heroRect.top : 0;

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

    let chaos = 0;
    if (motionActive && !frozen) {
      chaos = Math.sqrt(shakeVX * shakeVX + shakeVY * shakeVY);
      meshes.forEach((mesh, i) => {
        const variance = 0.7 + (i * 0.15);
        mesh.userData.vx += shakeVX * variance;
        mesh.userData.vy += shakeVY * variance;
      });
      shakeVX *= 0.3;
      shakeVY *= 0.3;
    }

    const effectiveDamping = (motionActive && chaos > 5)
      ? Math.min(0.97, DAMPING + chaos * 0.002)
      : DAMPING;

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
        ud.vx *= effectiveDamping;
        ud.vy *= effectiveDamping;
        ud.px += ud.vx;
        ud.py += ud.vy;
        clamp(ud);

        const speed = Math.sqrt(ud.vx * ud.vx + ud.vy * ud.vy);
        const want  = speed < SETTLE_THRESHOLD ? 1 : 0;
        ud.floatBlend += (want - ud.floatBlend) * (want > ud.floatBlend ? FLOAT_BLEND_IN : FLOAT_BLEND_OUT);
      }

      const b = ud.floatBlend;
      const floatX = (!noMotion && b > 0.01) ? Math.sin(time * d.freq * 0.6 + d.phase + 1.0) * d.amp * 0.3 * b : 0;
      const floatY = (!noMotion && b > 0.01) ? Math.sin(time * d.freq       + d.phase)         * d.amp       * b : 0;

      mesh.position.x = ud.px + floatX;
      mesh.position.y = ud.py + floatY + scrollY;
      mesh.position.z = d.z;

    });

    if (nameMesh) nameMesh.position.y = (H / 2 - NAME_TOP * H) + scrollY;
    if (taglineMesh) {
      const nameSize = heroNameSize();
      const gap = W <= 768 ? 12 : 20;
      const tagH = taglineMesh.geometry.parameters.height;
      taglineMesh.position.y = (H / 2 - NAME_TOP * H) - nameSize * 0.55 - gap - tagH / 2 + scrollY;
    }

    renderer.render(scene, camera);
  }

  if (typeof gsap !== 'undefined') {
    gsap.ticker.add(tick);
    canvas.style.opacity = '1';

    // ── White curtain reveal ──────────────────────────────
    const curtain = document.createElement('div');
    curtain.setAttribute('aria-hidden', 'true');
    curtain.style.cssText =
      'position:fixed;top:0;left:0;width:100%;height:100vh;' +
      'background:#fff;z-index:10;pointer-events:none;';
    document.body.appendChild(curtain);

    // Start cards at scale 0
    meshes.forEach(m => m.scale.set(0, 0, 1));

    gsap.to(curtain, {
      yPercent: 100,
      duration: 1.2,
      delay: 0.4,
      ease: 'power3.inOut',
      onComplete() {
        curtain.remove();
        // Staggered scale-in for cards
        meshes.forEach((m, i) => {
          gsap.to(m.scale, {
            x: 1, y: 1,
            duration: 0.7,
            delay: i * 0.12,
            ease: 'back.out(1.4)',
          });
        });
      },
    });
  } else {
    canvas.style.opacity = '1';
    let t = 0;
    (function loop() { t += 0.016; tick(t); requestAnimationFrame(loop); })();
  }

  // ── Resize ──────────────────────────────────────────
  window.addEventListener('resize', () => {
    ({ W, H } = bg.getSize());
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
