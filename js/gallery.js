// Lightbox on native <dialog>: focus trap, Esc and focus return for free.

const dialog = document.querySelector('[data-lightbox]');
const img = dialog.querySelector('[data-lightbox-img]');
const video = dialog.querySelector('[data-lightbox-video]');
const caption = dialog.querySelector('[data-lightbox-caption]');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

const SWIPE_PX = 50;

let list = [];
let index = 0;

const SLIDE_PX = 20;
const SLIDE_MS = 320;
const SLIDE_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

// Micro hand-off: the old image drifts SLIDE_PX out and fades while the new one, already on
// top, drifts in from the other side. dir: 1 = next (moves left), -1 = previous (moves right)
function step(dir) {
  if (list.length < 2) return;
  const animate = !reduceMotion.matches;
  // Old image is cloned as a ghost (images only; a playing video can't be cloned mid-frame)
  if (animate && !img.hidden && img.getAttribute('src')) {
    const figure = img.parentElement;
    const f = figure.getBoundingClientRect();
    const r = img.getBoundingClientRect();
    const ghost = img.cloneNode();
    ghost.className = 'lightbox__ghost';
    ghost.removeAttribute('data-lightbox-img');
    ghost.setAttribute('aria-hidden', 'true');
    ghost.alt = '';
    Object.assign(ghost.style, { left: `${r.left - f.left}px`, top: `${r.top - f.top}px`, width: `${r.width}px`, height: `${r.height}px` });
    figure.append(ghost);
    ghost.animate(
      [{ transform: 'none', opacity: 1 }, { transform: `translateX(${-dir * SLIDE_PX}px)`, opacity: 0 }],
      { duration: SLIDE_MS, easing: SLIDE_EASE, fill: 'forwards' },
    ).finished.then(() => ghost.remove(), () => ghost.remove());
  }
  show(index + dir);
  if (animate) {
    (img.hidden ? video : img).animate(
      [{ transform: `translateX(${dir * SLIDE_PX}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }],
      { duration: SLIDE_MS, delay: 50, easing: SLIDE_EASE, fill: 'backwards' },
    );
  }
}

function show(i) {
  index = (i + list.length) % list.length;
  const item = list[index];
  const isVideo = Boolean(item.video);
  img.hidden = isVideo;
  video.hidden = !isVideo;
  if (isVideo) {
    img.removeAttribute('src');
    video.poster = item.poster;
    video.src = item.video;
    video.setAttribute('aria-label', item.alt);
    // Opening is user-initiated, but reduced-motion users still start paused
    if (!reduceMotion.matches) video.play().catch(() => {});
  } else {
    video.pause();
    video.removeAttribute('src');
    img.src = item.src;
    img.alt = item.alt;
  }
  caption.textContent = item.caption || '';
}

// Same morph as project cards → case hero: the thumbnail's image flies into the lightbox and,
// on close, the image on screen flies back to its own thumbnail (view-transition-name
// 'lightbox-media'; the lightbox side is named in CSS). Falls back to an instant swap.
const MORPH = 'lightbox-media';
let sourceOf = () => null;

const canMorph = () => Boolean(document.startViewTransition) && !reduceMotion.matches;

function onScreen(el) {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth;
}

// Runs update(), inside a view transition when the thumbnail is on screen and VTs are allowed.
// `named`: the thumbnail owns the name in the old state (open) or the new state (close);
// the lightbox image always carries it via CSS, so exactly one element has it per state.
function morph(source, named, update) {
  if (!source || !onScreen(source) || !canMorph()) return update();
  if (named === 'old') source.style.viewTransitionName = MORPH;
  document.documentElement.dataset.lbvt = '';
  const vt = document.startViewTransition(() => {
    if (named === 'old') source.style.removeProperty('view-transition-name');
    else source.style.viewTransitionName = MORPH;
    update();
  });
  vt.ready.catch(() => {}); // rejects when skipped by a newer transition
  vt.finished.finally(() => {
    source.style.removeProperty('view-transition-name');
    delete document.documentElement.dataset.lbvt;
  });
}

// sourceFor(i): thumbnail element of item i (may scroll its strip into view), or null
export function openLightbox(items, start = 0, sourceFor = () => null) {
  list = items;
  sourceOf = sourceFor;
  dialog.classList.toggle('is-single', items.length < 2);
  morph(sourceFor(start), 'old', () => {
    show(start);
    dialog.showModal();
  });
}

function closeLightbox() {
  if (!dialog.open) return;
  morph(sourceOf(index), 'new', () => dialog.close());
}

export function initGallery() {
  dialog.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-lightbox-step]');
    if (btn) return step(Number(btn.dataset.lightboxStep));
    // Close button and backdrop both land here: anything but the image closes
    if (e.target !== img && e.target !== video) closeLightbox();
  });

  // Esc: take over so it morphs back like the Close button
  dialog.addEventListener('cancel', (e) => {
    e.preventDefault();
    closeLightbox();
  });

  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'ArrowLeft') step(-1);
  });

  let x0 = 0;
  dialog.addEventListener('touchstart', (e) => { x0 = e.changedTouches[0].clientX; }, { passive: true });
  dialog.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > SWIPE_PX) step(dx < 0 ? 1 : -1);
  }, { passive: true });

  dialog.addEventListener('close', () => {
    dialog.querySelectorAll('.lightbox__ghost').forEach((g) => g.remove());
    img.removeAttribute('src');
    video.pause();
    video.removeAttribute('src');
  });
}
