// Hero: headline line reveal.

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

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

  // Restore once the last line's final animation ends (ink-settle if supported, else line-up)
  const last = title.querySelectorAll('.line__inner')[lines.length - 1];
  const finalAnim = CSS.supports('background-clip', 'text') || CSS.supports('-webkit-background-clip', 'text')
    ? 'ink-settle' : 'line-up';
  last.addEventListener('animationend', function done(e) {
    if (e.animationName !== finalAnim) return;
    last.removeEventListener('animationend', done);
    title.innerHTML = html;
  });
}

export function initHero() {
  const title = document.querySelector('.hero__title');
  if (title) revealLines(title);
}

