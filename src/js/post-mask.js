// Post scroll reveal. The header (meta + title + description) pins at the offset
// a direct visit loads to (--post-pin-offset, pure-CSS position: sticky) and is
// clipped away at the rule line as the body rises over it, so it disappears
// cleanly as you scroll. The body itself stays frosted (no fill), so the blob
// shows through it throughout. Disabled under reduced motion (sticky is also
// gated off in CSS there).
//
// The clip reads the rule's LIVE viewport position each frame, so it always
// tracks the body's real top edge — including when a mobile URL bar shows/hides
// and shifts the layout. We never un-stick the header to measure (that caused a
// reflow flicker), and height-only resizes (the URL bar) don't trigger a
// re-measure, only a re-clip.
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
  let lastWidth = window.innerWidth;

  function measure() {
    offset = readOffset();
    headerH = header.offsetHeight;
    apply();
  }

  function apply() {
    if (headerH <= 0) return;
    // Clip the header away below the rule. The rule's live viewport top means the
    // clip always matches the body's actual edge, so it can't jump when the
    // viewport (URL bar) changes height under the content.
    const ruleY = line.getBoundingClientRect().top;
    const clipBottom = Math.min(headerH, Math.max(0, offset + headerH - ruleY));
    header.style.clipPath = clipBottom > 0 ? `inset(0 0 ${clipBottom.toFixed(2)}px 0)` : 'none';
  }

  measure();

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      apply();
      ticking = false;
    });
  }, { passive: true });

  let resizeTimer;
  window.addEventListener('resize', () => {
    // Always re-clip to the rule's current position (covers URL-bar height
    // changes), but only re-read the header height on a real width change.
    apply();
    if (window.innerWidth !== lastWidth) {
      lastWidth = window.innerWidth;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(measure, 150);
    }
  }, { passive: true });

  // Webfont swap (VolkSans) changes the header height, so re-measure once it lands.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
})();
