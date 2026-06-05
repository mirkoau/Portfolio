// Forward: curtain covers instantly, content switches, curtain exits downward.
// Reverse: curtain enters from bottom, covers, content switches, exits upward.
export function curtainTransition(onMidpoint, { reverse = false } = {}) {
  return new Promise(resolve => {
    const noMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (noMotion) { onMidpoint(); resolve(); return; }

    const curtain = document.createElement('div');
    curtain.setAttribute('aria-hidden', 'true');
    curtain.style.cssText =
      'position:fixed;inset:0;background:#000;z-index:5000;pointer-events:none;';
    document.body.appendChild(curtain);

    if (reverse) {
      gsap.set(curtain, { yPercent: 100 });
      gsap.to(curtain, {
        yPercent: 0,
        duration: 0.7,
        ease: 'power3.inOut',
        onComplete() {
          onMidpoint();
          gsap.to(curtain, {
            yPercent: -100,
            duration: 1.0,
            delay: 0.1,
            ease: 'power3.inOut',
            onComplete() { curtain.remove(); resolve(); },
          });
        },
      });
    } else {
      gsap.set(curtain, { yPercent: -100 });
      gsap.to(curtain, {
        yPercent: 0,
        duration: 0.7,
        ease: 'power3.inOut',
        onComplete() {
          onMidpoint();
          gsap.to(curtain, {
            yPercent: 100,
            duration: 1.0,
            delay: 0.1,
            ease: 'power3.inOut',
            onComplete() { curtain.remove(); resolve(); },
          });
        },
      });
    }
  });
}
