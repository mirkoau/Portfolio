// Lightbox on native <dialog>: focus trap, Esc and focus return for free.

const dialog = document.querySelector('[data-lightbox]');
const img = dialog.querySelector('[data-lightbox-img]');
const caption = dialog.querySelector('[data-lightbox-caption]');

let list = [];
let index = 0;

function show(i) {
  index = (i + list.length) % list.length;
  const item = list[index];
  img.src = item.src;
  img.alt = item.alt;
  caption.textContent = item.caption || item.alt;
}

export function openLightbox(items, start = 0) {
  list = items;
  dialog.classList.toggle('is-single', items.length < 2);
  show(start);
  dialog.showModal();
}

export function initGallery() {
  dialog.addEventListener('click', (e) => {
    const step = e.target.closest('[data-lightbox-step]');
    if (step) return show(index + Number(step.dataset.lightboxStep));
    // Anything outside the image closes
    if (e.target !== img) dialog.close();
  });

  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') show(index + 1);
    else if (e.key === 'ArrowLeft') show(index - 1);
  });

  let x0 = 0;
  dialog.addEventListener('touchstart', (e) => { x0 = e.changedTouches[0].clientX; }, { passive: true });
  dialog.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
  }, { passive: true });

  dialog.addEventListener('close', () => { img.removeAttribute('src'); });
}
