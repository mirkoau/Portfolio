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

// ── Scramble reveal (GSAP SplitText) ──────────────────
// Two levels of scramble: the words start as a shuffled sentence, and inside each longer
// word its 2–3 letter chunks are shuffled too. Step 1: words drop into their own line while
// their chunks reassemble. Step 2: words slide along the line into place. Then the split is
// reverted so the headline is plain, reflowable text again.
const MESH = false; // ember mesh fill (startMesh): parked for now, flip to bring it back

const shuffle = (n) => {
  const order = [...Array(n).keys()];
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  // Never leave an item in its own slot, so every piece visibly moves
  if (n > 1) for (let i = 0; i < n; i++) if (order[i] === i) { const k = (i + 1) % n; [order[i], order[k]] = [order[k], order[i]]; }
  return order;
};

// Cut a word's chars into chunks of 2–3 (words of ≤3 chars stay whole)
const chunk = (chars) => {
  if (chars.length <= 3) return [chars];
  const out = [];
  for (let i = 0; i < chars.length;) {
    const left = chars.length - i;
    const size = left <= 3 ? left : (left === 4 ? 2 : 2 + Math.round(Math.random()));
    out.push(chars.slice(i, i + size));
    i += size;
  }
  return out;
};

const pos = (el, box) => { const r = el.getBoundingClientRect(); return { x: r.left - box.left, y: r.top - box.top }; };

// Where each word lands if the sentence is laid out in `order` (hidden clone, same width
// and type), so the scrambled sentence is a real, non-overlapping jumble
function shuffledSlots(title, words, order) {
  const ghost = document.createElement('p');
  ghost.className = title.className;
  ghost.setAttribute('aria-hidden', 'true');
  Object.assign(ghost.style, {
    position: 'absolute', visibility: 'hidden', pointerEvents: 'none',
    left: `${title.offsetLeft}px`, top: `${title.offsetTop}px`, width: `${title.offsetWidth}px`, margin: '0',
  });
  ghost.innerHTML = order.map((k) => `<span>${words[k].textContent}</span>`).join(' ');
  title.after(ghost);
  const box = ghost.getBoundingClientRect();
  const slot = [];
  [...ghost.children].forEach((span, n) => { slot[order[n]] = pos(span, box); });
  ghost.remove();
  return slot;
}

async function revealHeadline(title) {
  const { gsap, SplitText } = window;
  if (reduceMotion.matches || !gsap || !SplitText) return title.classList.add('is-ready');
  gsap.registerPlugin(SplitText);
  await document.fonts.ready;

  const split = SplitText.create(title, { type: 'words,chars', wordsClass: 'hero__word', charsClass: 'hero__char' });
  const words = split.words;
  const titleBox = title.getBoundingClientRect();
  const home = words.map((w) => pos(w, titleBox));
  const slot = shuffledSlots(title, words, shuffle(words.length));

  // Inside each word: lay its chunks out in shuffled order; every char of a chunk moves together
  const charShift = new Map();
  const chunksOf = new Map(); // word → its scrambled chunks (arrays of chars)
  words.forEach((word) => {
    const chunks = chunk([...word.querySelectorAll('.hero__char')]);
    if (chunks.length < 2) return;
    chunksOf.set(word, chunks);
    const box = word.getBoundingClientRect();
    const width = (c) => c.reduce((sum, ch) => sum + ch.getBoundingClientRect().width, 0);
    const start = chunks.map((c) => pos(c[0], box).x);
    let x = 0;
    shuffle(chunks.length).forEach((k) => {
      const dx = x - start[k];
      chunks[k].forEach((ch) => charShift.set(ch, dx));
      x += width(chunks[k]);
    });
  });
  const chars = [...charShift.keys()];

  gsap.set(words, { x: (i) => slot[i].x - home[i].x, y: (i) => slot[i].y - home[i].y });
  gsap.set(chars, { x: (i, el) => charShift.get(el) });
  title.classList.add('is-ready');
  if (MESH) startMesh(title.closest('.hero'), title);

  // Every word runs its own two steps from its own random start; its chunks reassemble at
  // their own random moments during step 1. Nothing moves in lockstep.
  const ease = 'power3.inOut';
  const rnd = gsap.utils.random;
  const tl = gsap.timeline({ delay: 0.3, onComplete: () => split.revert() });
  words.forEach((word) => {
    const t = rnd(0, 0.6);
    tl.to(word, { y: 0, duration: 0.4, ease }, t);                         // step 1: into its line
    (chunksOf.get(word) || []).forEach((c) => {
      tl.to(c, { x: 0, duration: 0.35, ease }, t + rnd(0, 0.35));          //   chunks reassemble
    });
    tl.to(word, { x: 0, duration: 0.45, ease }, t + rnd(0.3, 0.5));        // step 2: slide into place
  });
}

export function initHero() {
  const title = document.querySelector('.hero__title');
  if (title) revealHeadline(title);
}
