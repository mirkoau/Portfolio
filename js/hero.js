// Hero: headline line reveal + an animated mesh gradient that lives in the letters,
// then clears into ink.

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

// ── Mesh gradient ─────────────────────────────────────
// A true mesh: 4×4 colour vertices, Catmull-Rom interpolated between them, vertices
// drifting over time. Rendered in WebGL2 on a canvas laid over the headline with
// mix-blend-mode: lighten, so colour only shows where the (dark) letters are.

const HOLD_MS = 1700;  // full colour before the ink sweep starts
const WAVE_MS = 2600;  // ink sweep duration (top line leads)

// Channels capped ≤ 0.95 so lighten never tints the paper background (#f4f5f7 ≈ 0.957)
const C = {
  blush: [0.93, 0.68, 0.6],
  amber: [0.95, 0.65, 0.26],
  vermilion: [0.89, 0.27, 0.17],
  oxblood: [0.43, 0.09, 0.07],
  shadow: [0.16, 0.02, 0.02],
  highlight: [0.94, 0.8, 0.66],
};
// Top row first (flipped for GL, where y points up)
const GRID = [
  [C.blush, C.amber, C.vermilion, C.oxblood],
  [C.amber, C.highlight, C.vermilion, C.shadow],
  [C.vermilion, C.oxblood, C.amber, C.highlight],
  [C.oxblood, C.shadow, C.vermilion, C.amber],
];

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uWave;
uniform vec3 uC[16];
out vec4 outColor;

vec3 vtx(int x, int y) { return uC[clamp(y, 0, 3) * 4 + clamp(x, 0, 3)]; }

vec3 catmull(vec3 a, vec3 b, vec3 c, vec3 d, float t) {
  return 0.5 * (2.0 * b + (c - a) * t + (2.0 * a - 5.0 * b + 4.0 * c - d) * t * t
    + (3.0 * b - a - 3.0 * c + d) * t * t * t);
}

vec3 mesh(vec2 p) {
  ivec2 i = ivec2(floor(p));
  vec2 f = fract(p);
  vec3 r[4];
  for (int j = 0; j < 4; j++) {
    int y = i.y - 1 + j;
    r[j] = catmull(vtx(i.x - 1, y), vtx(i.x, y), vtx(i.x + 1, y), vtx(i.x + 2, y), f.x);
  }
  return catmull(r[0], r[1], r[2], r[3], f.y);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float t = uTime;
  // Vertices drift: a slow smooth warp moves where each pixel samples the mesh
  vec2 w = uv + 0.07 * vec2(
    sin(uv.y * 4.0 + t * 0.9) + sin(uv.x * 2.3 - t * 0.6),
    cos(uv.x * 3.3 - t * 0.7) + sin(uv.y * 2.7 + t * 0.5));
  vec3 col = clamp(mesh(clamp(w, 0.0, 1.0) * 2.999), 0.0, 0.95);

  // Ink sweep: soft front travelling left to right, top of the headline first.
  // Black + lighten = the letters' own ink shows through.
  float soft = 0.25, stagger = 0.35;
  float front = uWave * (1.0 + soft + stagger) - stagger * (1.0 - uv.y);
  float ink = 1.0 - smoothstep(front - soft, front, uv.x);
  outColor = vec4(mix(col, vec3(0.0), ink), 1.0);
}`;

function startMesh(hero, title) {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2', { antialias: false, premultipliedAlpha: false });
  if (!gl) return;

  const compile = (type, src) => {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : null;
  };
  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  gl.uniform3fv(gl.getUniformLocation(prog, 'uC'), GRID.slice().reverse().flat(2));
  const uRes = gl.getUniformLocation(prog, 'uRes');
  const uTime = gl.getUniformLocation(prog, 'uTime');
  const uWave = gl.getUniformLocation(prog, 'uWave');

  // Cover the headline (plus room above for the raised footnote markers)
  const place = () => {
    const h = hero.getBoundingClientRect();
    const r = title.getBoundingClientRect();
    const pad = parseFloat(getComputedStyle(title).fontSize) * 0.3;
    Object.assign(canvas.style, {
      left: `${r.left - h.left - pad}px`,
      top: `${r.top - h.top - pad}px`,
      width: `${r.width + pad * 2}px`,
      height: `${r.height + pad * 2}px`,
    });
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round((r.width + pad * 2) * dpr);
    canvas.height = Math.round((r.height + pad * 2) * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uRes, canvas.width, canvas.height);
  };

  canvas.className = 'hero__mesh';
  canvas.setAttribute('aria-hidden', 'true');
  hero.append(canvas);
  place();
  addEventListener('resize', place, { passive: true });

  const ease = (x) => -(Math.cos(Math.PI * x) - 1) / 2; // gentle in-out
  const t0 = performance.now();
  const frame = (now) => {
    const ms = now - t0;
    const wave = ease(Math.min(Math.max((ms - HOLD_MS) / WAVE_MS, 0), 1));
    gl.uniform1f(uTime, ms / 1000);
    gl.uniform1f(uWave, wave);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (wave < 1) { requestAnimationFrame(frame); return; }
    removeEventListener('resize', place);
    canvas.remove();
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  };
  requestAnimationFrame(frame);
}

// ── Line reveal ───────────────────────────────────────
// Each rendered line slides up from behind a mask. Lines are measured after fonts
// load, then the original markup is restored so wrapping stays live on resize.
async function revealLines(title) {
  if (reduceMotion.matches) return title.classList.add('is-ready');
  await document.fonts.ready;
  const html = title.innerHTML;

  // Words as HTML strings; inline elements (footnote markers) stick to the preceding word
  const words = [''];
  title.childNodes.forEach(n => {
    if (n.nodeType !== Node.TEXT_NODE) { words[words.length - 1] += n.outerHTML; return; }
    n.textContent.split(/(\s+)/).forEach(part => {
      if (!part) return;
      if (/^\s+$/.test(part)) { if (words.at(-1)) words.push(''); }
      else words[words.length - 1] += part;
    });
  });

  title.innerHTML = words.map(w => `<span class="word">${w}</span>`).join(' ');
  const lines = [];
  let top = null;
  title.querySelectorAll('.word').forEach(w => {
    if (w.offsetTop !== top) { lines.push([]); top = w.offsetTop; }
    lines.at(-1).push(w.innerHTML);
  });

  title.innerHTML = lines
    .map((ws, i) => `<span class="line"><span class="line__inner" style="--i:${i}">${ws.join(' ')}</span></span>`)
    .join(' ');
  title.classList.add('is-ready');
  startMesh(title.closest('.hero'), title);

  const last = title.querySelectorAll('.line__inner')[lines.length - 1];
  last.addEventListener('animationend', () => { title.innerHTML = html; }, { once: true });
}

export function initHero() {
  const title = document.querySelector('.hero__title');
  if (title) revealLines(title);
}
