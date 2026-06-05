export function initCursor() {
  if (matchMedia('(pointer: coarse)').matches) return;
  var el = document.querySelector('.cursor');
  if (!el) return;

  var BASE    = 48;
  var MIN_S   = 18 / 48;   // 18px at rest
  var MAX_S   = 1.0;        // 48px peak velocity
  var HOVER_S = 80 / 48;   // 80px on interactive elements

  var mouseX = 0, mouseY = 0, lastX = 0, lastY = 0;
  var currentScale = MIN_S, targetScale = MIN_S;
  var isHovering = false;

  var INTERACTIVE = 'a, button, [role="button"], input, label, select, textarea, .work__project-image, .personal-work__item, .work__see-more';
  var SPECULAR = '.btn-cta, .btn-secondary, .work__see-more, .nav__burger';

  document.addEventListener('mouseover', function (e) {
    if (e.target.closest(INTERACTIVE)) isHovering = true;
  });
  document.addEventListener('mouseout', function (e) {
    if (e.target.closest(INTERACTIVE)) isHovering = false;
  });

  document.addEventListener('mousemove', function (e) {
    mouseX = e.clientX; mouseY = e.clientY;
    if (!isHovering) {
      var dx = mouseX - lastX, dy = mouseY - lastY;
      targetScale = MIN_S + Math.min(Math.sqrt(dx*dx + dy*dy) / 40, 1) * (MAX_S - MIN_S);
    }
    lastX = mouseX; lastY = mouseY;

    // Light that follows the cursor across the glass button under it
    var btn = e.target.closest(SPECULAR);
    if (btn) {
      var r = btn.getBoundingClientRect();
      btn.style.setProperty('--mx', (mouseX - r.left) + 'px');
      btn.style.setProperty('--my', (mouseY - r.top) + 'px');
    }
  });
  document.addEventListener('mouseleave', function () { el.style.opacity = '0'; });
  document.addEventListener('mouseenter', function () { el.style.opacity = '1'; });

  (function tick() {
    currentScale += (targetScale - currentScale) * 0.15;
    if (isHovering) {
      targetScale = HOVER_S;
    } else {
      targetScale += (MIN_S - targetScale) * 0.08;
    }
    el.style.transform =
      'translate(' + (mouseX - BASE / 2) + 'px,' + (mouseY - BASE / 2) + 'px) ' +
      'scale(' + currentScale + ')';
    requestAnimationFrame(tick);
  })();
}
