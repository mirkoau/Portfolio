// Single-pass clip wipe. A short black band sweeps across once; its edge
// reveals the incoming view over what's behind it. One traversal, not two —
// new page appears almost immediately instead of after a full cover + uncover.
//
// prepare(): swap content into place (render incoming / show layer beneath).
//            Runs while the incoming layer is fully clipped, so the swap is hidden.
// finalize(): tidy up (hide outgoing view, history, etc.) after full cover.
// reverse:   project → index (wipe project away). default: index → project.
export function wipeTransition(prepare, finalize, { reverse = false } = {}) {
  return new Promise(async resolve => {
    const view = document.getElementById('project-view');
    const noMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (noMotion) { await prepare?.(); finalize?.(); resolve(); return; }

    // Overlay project-view at viewport size so clip-path % maps to the screen,
    // not its (taller) content box. Opaque bg so the layer beneath doesn't
    // bleed through project-view's translucent background mid-wipe.
    const prevStyle = view.style.cssText;
    view.style.position = 'fixed';
    view.style.inset = '0';
    view.style.zIndex = '4000';
    view.style.overflow = 'hidden';
    view.style.background = 'var(--color-bg)';

    const clipFor = (l) => reverse
      ? `inset(${l}% 0 0 0)`        // hide project top-down → reveal index
      : `inset(0 0 ${100 - l}% 0)`; // reveal project top-down
    view.style.clipPath = clipFor(0); // forward: hidden / reverse: covers — swap masked

    await prepare?.(); // render under cover, no band on screen yet

    const band = document.createElement('div');
    band.setAttribute('aria-hidden', 'true');
    band.style.cssText =
      'position:fixed;left:0;width:100%;height:30vh;background:#000;' +
      'z-index:5000;pointer-events:none;transform:translateY(-50%);top:0;';
    document.body.appendChild(band);

    const apply = (l) => {
      view.style.clipPath = clipFor(l);
      band.style.top = `${l}%`;
    };

    const s = { l: 0 };
    gsap.to(s, {
      l: 100,
      duration: 0.85,
      ease: 'power3.inOut',
      onUpdate() { apply(s.l); },
      onComplete() {
        finalize?.();             // outgoing now fully covered
        band.remove();
        view.style.cssText = prevStyle; // clears overlay + clip-path
        resolve();
      },
    });
  });
}
