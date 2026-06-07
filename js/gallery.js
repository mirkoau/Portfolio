import { contentReady, data } from './content.js';

let flatIndex       = 0;
let activeList      = [];
let triggerEl       = null;
let lenis           = null;
let filmstripTrack  = null;
const overlay   = document.getElementById('gallery-overlay');
const mainImg   = overlay.querySelector('.gallery-overlay__image');
const caption   = overlay.querySelector('.gallery-overlay__caption');
const filmstrip = overlay.querySelector('.gallery-overlay__filmstrip');
const sidebar   = overlay.querySelector('.gallery-overlay__sidebar');
const closeBtn  = overlay.querySelector('.gallery-overlay__close');
const backdrop  = overlay.querySelector('.gallery-overlay__backdrop');
const panel     = overlay.querySelector('.gallery-overlay__panel');
const mqMobile  = window.matchMedia('(max-width: 768px)');

export async function initGallery(lenisInstance) {
  lenis = lenisInstance ?? null;
  await contentReady;

  const personalList = buildPersonalList();

  // Personal work triggers
  const personalTriggers = document.querySelectorAll('[data-personal-trigger]');
  personalTriggers.forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.personalIdx, 10);
      openGallery(personalList, idx, btn);
    });
  });

  closeBtn.addEventListener('click', closeOverlay);
  backdrop.addEventListener('click', closeOverlay);
  overlay.addEventListener('click', e => {
    if (e.target.closest('.gallery-overlay__image, .gallery-overlay__thumb')) return;
    closeOverlay();
  });
  document.addEventListener('keydown', onKey);

  overlay.addEventListener('wheel', e => {
    e.preventDefault();
    if (e.deltaY > 0) setActive(Math.min(flatIndex + 1, activeList.length - 1));
    else              setActive(Math.max(flatIndex - 1, 0));
  }, { passive: false });

  filmstrip.addEventListener('click', e => {
    const thumb = e.target.closest('[data-idx]');
    if (thumb) setActive(parseInt(thumb.dataset.idx, 10));
  });
  filmstrip.addEventListener('wheel', e => {
    e.stopPropagation();
    e.preventDefault();
    if (e.deltaY > 0) setActive(Math.min(flatIndex + 1, activeList.length - 1));
    else              setActive(Math.max(flatIndex - 1, 0));
  }, { passive: false });

  // Touch swipe — scoped to the image panel so swiping the strip itself
  // (native horizontal scroll on mobile) doesn't also advance the image.
  let touchX0 = 0, touchY0 = 0;
  const swipeTarget = panel ?? overlay;
  swipeTarget.addEventListener('touchstart', e => {
    touchX0 = e.changedTouches[0].clientX;
    touchY0 = e.changedTouches[0].clientY;
  }, { passive: true });
  swipeTarget.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchX0;
    const dy = e.changedTouches[0].clientY - touchY0;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) setActive(Math.min(flatIndex + 1, activeList.length - 1));
      else        setActive(Math.max(flatIndex - 1, 0));
    }
  }, { passive: true });

  // Re-center on breakpoint cross — strip axis flips, clear stale transform
  mqMobile.addEventListener('change', () => {
    if (overlay.hidden || !filmstripTrack) return;
    gsap.set(filmstripTrack, { x: 0, y: 0 });
    setActive(flatIndex);
  });
}

// Open the overlay with an arbitrary list of { src, alt, caption }.
export function openGallery(list, idx, trigger) {
  if (!list || !list.length) return;
  activeList = list;
  triggerEl = trigger ?? null;
  rebuildFilmstrip();
  openOverlay(idx);
}

function buildPersonalList() {
  return data.personalWork.items.map(item => ({
    src: item.src, alt: item.alt, caption: item.caption,
  }));
}

function rebuildFilmstrip() {
  const items = activeList.map((item, i) => `
    <button class="gallery-overlay__thumb" role="option" data-idx="${i}" aria-label="Image ${i + 1}">
      <img src="${item.src}" alt="${item.alt}" loading="lazy" />
    </button>`).join('');
  filmstrip.innerHTML = `<div class="gallery-overlay__filmstrip-track">${items}</div>`;
  filmstripTrack = filmstrip.querySelector('.gallery-overlay__filmstrip-track');
}

function setActive(idx) {
  flatIndex = idx;
  const item = activeList[idx];
  mainImg.src = item.src;
  mainImg.alt = item.alt;
  caption.textContent = item.caption;
  filmstrip.querySelectorAll('.gallery-overlay__thumb').forEach((t, i) => {
    t.classList.toggle('is-active', i === idx);
    t.setAttribute('aria-selected', i === idx);
  });
  const activeThumb = filmstripTrack && filmstripTrack.querySelector('.gallery-overlay__thumb.is-active');
  if (activeThumb) {
    if (mqMobile.matches) {
      // Horizontal strip is natively scrollable — center via scroll, no transform
      gsap.set(filmstripTrack, { x: 0, y: 0 });
      activeThumb.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    } else {
      const peekAmount = Math.round(activeThumb.offsetHeight * 0.4);
      const targetY = -Math.max(0, activeThumb.offsetTop - peekAmount);
      gsap.to(filmstripTrack, { y: targetY, duration: 0.4, ease: 'power2.out' });
    }
  }
}

function _flyingClone(src, fromRect) {
  const el = document.createElement('img');
  el.src = src;
  el.style.cssText = [
    'position:fixed', 'z-index:2000', 'pointer-events:none',
    'object-fit:cover', 'border-radius:4px', 'margin:0',
    `left:${fromRect.left}px`, `top:${fromRect.top}px`,
    `width:${fromRect.width}px`, `height:${fromRect.height}px`,
  ].join(';');
  document.body.appendChild(el);
  return el;
}

function _blockScroll(e) { e.preventDefault(); }

function openOverlay(idx) {
  overlay.hidden = false;
  if (lenis) lenis.stop();
  document.addEventListener('wheel',     _blockScroll, { passive: false });
  document.addEventListener('touchmove', _blockScroll, { passive: false });

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) {
    setActive(idx);
    gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power2.out' });
    return;
  }

  const sourceImg = triggerEl.querySelector('img');
  const fromRect  = sourceImg.getBoundingClientRect();

  setActive(idx);

  const toRect = mainImg.getBoundingClientRect();
  gsap.set(mainImg, { opacity: 0 });
  gsap.set([backdrop, sidebar, closeBtn], { opacity: 0 });
  gsap.to(backdrop, { opacity: 1, duration: 0.35, ease: 'power2.out' });
  gsap.to([sidebar, closeBtn], { opacity: 1, duration: 0.3, delay: 0.2, ease: 'power2.out' });

  const clone = _flyingClone(mainImg.src, fromRect);
  gsap.to(clone, {
    left: toRect.left, top: toRect.top,
    width: toRect.width, height: toRect.height,
    duration: 0.55, ease: 'expo.out',
    onComplete() {
      clone.remove();
      gsap.set(mainImg, { opacity: 1 });
    },
  });
}

function closeOverlay() {
  gsap.to(overlay, { opacity: 0, duration: 0.25, ease: 'power2.in', onComplete: _hide });
}

function _hide() {
  overlay.hidden = true;
  document.removeEventListener('wheel',     _blockScroll);
  document.removeEventListener('touchmove', _blockScroll);
  if (lenis) lenis.start();
  requestAnimationFrame(() => window.dispatchEvent(new Event('scroll')));
  gsap.set(overlay, { opacity: 1 });
  gsap.set(mainImg, { opacity: 1 });
  gsap.set([backdrop, sidebar, closeBtn], { opacity: 1 });
  if (filmstripTrack) gsap.set(filmstripTrack, { y: 0 });
  if (triggerEl) triggerEl.focus();
}

function onKey(e) {
  if (overlay.hidden) return;
  if (e.key === 'Escape')     { closeOverlay(); return; }
  if (e.key === 'ArrowRight') { setActive(Math.min(flatIndex + 1, activeList.length - 1)); }
  if (e.key === 'ArrowLeft')  { setActive(Math.max(flatIndex - 1, 0)); }
}
