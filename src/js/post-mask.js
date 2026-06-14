// Post scroll reveal. The header (meta + title + description) pins at the offset
// a direct visit loads to (--post-pin-offset, pure-CSS position: sticky) and is
// clipped away at the rule line as the body rises over it, so it disappears
// cleanly as you scroll. The body itself stays frosted (no fill), so the blob
// shows through it throughout. The header is clipped from its bottom up to the
// rule (the body's top edge) as the rule climbs from the header's bottom to its
// top. Disabled under reduced motion (sticky is also gated off in CSS there).
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const header = document.querySelector('.post-header');
  const line = document.querySelector('.post-mask-line');
  if (!header || !line) return;

  const root = document.documentElement;
  const readOffset = () => {
    const v = parseFloat(getComputedStyle(root).getPropertyValue('--post-pin-offset'));
    return Number.isFinite(v) ? v : 0;
  };

  let offset = 0;
  let headerH = 0;
  let lineTop = 0; // the rule's natural document position

  function measure() {
    const prevPos = header.style.position;
    const prevClip = header.style.clipPath;
    header.style.position = 'static';
    header.style.clipPath = 'none';
    offset = readOffset();
    headerH = header.offsetHeight;
    lineTop = line.getBoundingClientRect().top + window.scrollY;
    header.style.position = prevPos;
    header.style.clipPath = prevClip;
    apply(window.scrollY);
  }

  function apply(scrollY) {
    if (headerH <= 0) return;
    // Clip the header away below the rule: as the rule (the body's top edge)
    // climbs from the header's bottom to its top, more of the header is cut off
    // from the bottom, so it's wiped cleanly rather than fading through the body.
    const ruleY = lineTop - scrollY;
    const clipBottom = Math.min(headerH, Math.max(0, offset + headerH - ruleY));
    header.style.clipPath = clipBottom > 0 ? `inset(0 0 ${clipBottom.toFixed(2)}px 0)` : 'none';
  }

  measure();

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      apply(window.scrollY);
      ticking = false;
    });
  }, { passive: true });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(measure, 150);
  }, { passive: true });

  // Webfont swap (VolkSans) shifts the layout, so re-measure once it lands.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
})();
