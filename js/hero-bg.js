// Liquid gradient shader background
// Fixed full-viewport canvas, visible on all pages

export function initHeroBg() {
  if (typeof THREE === 'undefined') return null;

  // ── Renderer — fixed full-viewport, behind all content ─
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const canvas = renderer.domElement;
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100vh;pointer-events:none;z-index:-2;';
  document.body.appendChild(canvas);

  let W = window.innerWidth;
  let H = window.innerHeight;
  renderer.setSize(W, H);

  const camera = new THREE.OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, 0.1, 1000);
  camera.position.z = 500;
  const scene = new THREE.Scene();

  // ── Liquid gradient background ────────────────────
  const liquidUniforms = {
    uTime:       { value: 0 },
    uResolution: { value: new THREE.Vector2(W, H) },
  };

  const liquidVert = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const liquidFrag = `
    precision highp float;
    varying vec2 vUv;
    uniform float uTime;
    uniform vec2 uResolution;

    // ── Simplex 3D noise (Ashima Arts) ──────────────
    vec4 permute(vec4 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

    float snoise(vec3 v) {
      const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i  = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);
      vec3 g  = step(x0.yzx, x0.xyz);
      vec3 l  = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      i = mod(i, 289.0);
      vec4 p = permute(permute(permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0))
              + i.y + vec4(0.0, i1.y, i2.y, 1.0))
              + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      float n_ = 1.0 / 7.0;
      vec3 ns = n_ * D.wyz - D.xzx;
      vec4 j  = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);
      vec4 x  = x_ * ns.x + ns.yyyy;
      vec4 y  = y_ * ns.x + ns.yyyy;
      vec4 h  = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);
      vec4 s0 = floor(b0) * 2.0 + 1.0;
      vec4 s1 = floor(b1) * 2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
      p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m * m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }

    // ── FBM (fractal Brownian motion) ───────────────
    // Fewer octaves + gentler frequency climb = silkier, less noisy
    float fbm(vec3 p) {
      float val = 0.0;
      float amp = 0.55;
      float freq = 1.0;
      for (int i = 0; i < 4; i++) {
        val += amp * snoise(p * freq);
        freq *= 1.8;
        amp *= 0.45;
      }
      return val;
    }

    // Cheap 2-octave FBM for domain warping — warp is low-freq,
    // doesn't need detail. Halves snoise calls per warp layer.
    float fbmWarp(vec3 p) {
      return 0.55 * snoise(p) + 0.2475 * snoise(p * 1.8);
    }

    // ── Film grain ──────────────────────────────────
    float hash(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    void main() {
      vec2 uv = vUv;
      float aspect = uResolution.x / uResolution.y;
      vec2 st = vec2(uv.x * aspect, uv.y);

      float t = uTime * 0.04; // very slow drift

      // ── Triple domain warping (Inigo Quilez style) ─
      // Warp level 1
      vec2 q = vec2(
        fbmWarp(vec3(st * 0.6, t * 0.5)),
        fbmWarp(vec3(st * 0.6 + 5.2, t * 0.4))
      );

      // Warp level 2 — stronger displacement for deep folds
      vec2 r = vec2(
        fbmWarp(vec3((st + q * 2.0) * 0.5, t * 0.6 + 1.7)),
        fbmWarp(vec3((st + q * 2.0) * 0.5 + 2.8, t * 0.5 + 9.2))
      );

      // Warp level 3 — liquid ribbons
      vec2 s = vec2(
        fbmWarp(vec3((st + r * 1.8) * 0.4, t * 0.35 + 3.1)),
        fbmWarp(vec3((st + r * 1.8) * 0.4 + 7.3, t * 0.3 + 6.5))
      );

      // Final warped coordinate
      vec2 warped = st + s * 1.6;

      // Master pattern — drives the overall liquid shape
      float pattern = fbm(vec3(warped * 0.4, t * 0.25));
      pattern = pattern * 0.5 + 0.5;
      // Extra smoothing pass
      pattern = smoothstep(0.05, 0.95, pattern);

      // Secondary flow for color separation
      float flow = fbm(vec3(warped * 0.3 + 3.0, t * 0.3 + 20.0));
      flow = flow * 0.5 + 0.5;
      flow = smoothstep(0.1, 0.9, flow);

      // ── Unified palette — purple undertone ties all hues ─
      vec3 base   = vec3(0.013, 0.011, 0.02);    // purple-black
      vec3 col1   = vec3(0.04, 0.05, 0.18);      // deep indigo
      vec3 col2   = vec3(0.02, 0.10, 0.14);      // dark cyan — blue-leaning teal
      vec3 col3   = vec3(0.13, 0.04, 0.07);      // dark plum — warm but purple-bridged
      vec3 col4   = vec3(0.09, 0.06, 0.03);      // muted amber — subtle warmth

      // ── Color mixing — ribbons of color ──────────
      vec3 col = base;

      // Wide, soft ribbon bands
      float ribbon1 = smoothstep(0.45, 0.65, pattern) * smoothstep(0.85, 0.6, pattern);
      float ribbon2 = smoothstep(0.65, 0.85, pattern);
      float ribbon3 = smoothstep(0.25, 0.45, pattern) * smoothstep(0.65, 0.4, pattern);

      col = mix(col, col1, ribbon2 * 0.7);
      col = mix(col, col2, ribbon1 * smoothstep(0.4, 0.8, flow) * 0.65);
      col = mix(col, col3, ribbon3 * smoothstep(0.5, 0.85, flow) * 0.6);
      col = mix(col, col4, smoothstep(0.7, 0.95, pattern * flow) * 0.4);

      // Highlight along fold edges — catches light like liquid
      float edge = abs(dFdx(pattern)) + abs(dFdy(pattern));
      edge = smoothstep(0.0, 0.08, edge);
      col += edge * vec3(0.07, 0.06, 0.09) * 1.2;

      // ── Bottom-left blue-brown tint — balances top-right color ─
      float blCorner = smoothstep(0.95, 0.0, length(uv));   // 1 at (0,0), fades out
      vec3  blTint   = mix(vec3(0.02, 0.05, 0.13),          // cool blue
                           vec3(0.08, 0.05, 0.03), 0.45);   // warm brown
      // modulate slightly by flow so it reads as part of the liquid, not a flat wash
      col += blTint * blCorner * (0.55 + flow * 0.45) * 0.4;

      // ── Subtle vignette to darken edges ───────────
      float vig = 1.0 - smoothstep(0.35, 1.2, length(uv - 0.5) * 1.2);
      col *= mix(0.75, 1.0, vig);

      // ── Film grain ────────────────────────────────
      float grain = hash(uv * uResolution + fract(uTime * 100.0)) - 0.5;
      col += grain * 0.12;

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  const liquidMat = new THREE.ShaderMaterial({
    uniforms: liquidUniforms,
    vertexShader: liquidVert,
    fragmentShader: liquidFrag,
    depthWrite: false,
    extensions: { derivatives: true },
  });

  const liquidPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(W, H),
    liquidMat
  );
  liquidPlane.position.z = -100;
  scene.add(liquidPlane);

  const noMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Resize ──────────────────────────────────────────
  window.addEventListener('resize', () => {
    W = window.innerWidth;
    H = window.innerHeight;
    renderer.setSize(W, H);
    camera.left = -W / 2; camera.right = W / 2;
    camera.top  =  H / 2; camera.bottom = -H / 2;
    camera.updateProjectionMatrix();
    liquidPlane.geometry.dispose();
    liquidPlane.geometry = new THREE.PlaneGeometry(W, H);
    liquidUniforms.uResolution.value.set(W, H);
  });

  return {
    renderer, camera, scene, canvas,
    tick(time) {
      if (!noMotion) liquidUniforms.uTime.value = time;
    },
    getSize() { return { W, H }; },
  };
}
