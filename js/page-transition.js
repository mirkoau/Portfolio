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

    const BAND = 30;        // band height (vh)
    const HALF = BAND / 2;  // overshoot each end so it slides fully in/out
    const band = document.createElement('div');
    band.setAttribute('aria-hidden', 'true');
    band.style.cssText =
      `position:fixed;left:0;width:100%;height:${BAND}vh;background:#000;` +
      `z-index:5000;pointer-events:none;transform:translateY(-50%);top:${-HALF}%;`;
    document.body.appendChild(band);

    // t 0→100. Band centre travels from fully-above to fully-below the viewport;
    // the reveal tracks the band centre but is clamped to [0,100], so the wipe
    // only advances while the band is actually crossing the screen.
    const apply = (t) => {
      const centre = -HALF + (t / 100) * (100 + BAND);
      band.style.top = `${centre}%`;
      view.style.clipPath = clipFor(Math.max(0, Math.min(100, centre)));
    };

    const s = { t: 0 };
    gsap.to(s, {
      t: 100,
      duration: 0.85,
      ease: 'power3.inOut',
      onUpdate() { apply(s.t); },
      onComplete() {
        finalize?.();             // outgoing now fully covered
        band.remove();
        view.style.cssText = prevStyle; // clears overlay + clip-path
        resolve();
      },
    });
  });
}
