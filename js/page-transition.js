// Forward: curtain enters from right, covers, content switches, exits left.
// Reverse: curtain enters from left, covers, content switches, exits right.
export function curtainTransition(onMidpoint, { reverse = false } = {}) {
  return new Promise(resolve => {
    const noMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (noMotion) { onMidpoint(); resolve(); return; }

    const curtain = document.createElement('div');
    curtain.setAttribute('aria-hidden', 'true');
    curtain.style.cssText =
      'position:fixed;inset:0;background:#000;z-index:5000;pointer-events:none;';
    document.body.appendChild(curtain);

    const enterFrom = reverse ? -100 : 100;  // reverse: from left, forward: from right
    const exitTo    = reverse ?  100 : -100; // mirror exit direction

    gsap.set(curtain, { xPercent: enterFrom });
    gsap.to(curtain, {
      xPercent: 0,
      duration: 0.7,
      ease: 'power3.inOut',
      onComplete() {
        onMidpoint();
        gsap.to(curtain, {
          xPercent: exitTo,
          duration: 1.0,
          delay: 0.1,
          ease: 'power3.inOut',
          onComplete() { curtain.remove(); resolve(); },
        });
      },
    });
  });
}
