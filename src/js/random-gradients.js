// Single-blob background: analogous hues, drifts on scroll, fades to footer.
(function () {
  const root = document.documentElement;
  const baseHue1 = Math.floor(Math.random() * 360);
  // Analogous: 25–55° from hue1, so the two lobes share a colour family.
  const baseHue2 = (baseHue1 + 25 + Math.floor(Math.random() * 30)) % 360;

  // Restrict drift to the upper semicircle so the blob always moves up or
  // sideways relative to scroll, never down.
  const angle = Math.PI + Math.random() * Math.PI;
  const dir = { x: Math.cos(angle), y: Math.sin(angle) };

  const SCROLL_FACTOR = 0.2;
  const HUE_SHIFT_PER_VIEWPORT = 40;

  function apply(scrollY) {
    const vh = window.innerHeight || 1;
    const offset = (scrollY / vh) * HUE_SHIFT_PER_VIEWPORT;
    root.style.setProperty('--blob-hue-1', ((baseHue1 + offset) % 360 + 360) % 360);
    root.style.setProperty('--blob-hue-2', ((baseHue2 + offset) % 360 + 360) % 360);

    const dist = scrollY * SCROLL_FACTOR;
    root.style.setProperty('--blob-x', `${dir.x * dist}px`);
    root.style.setProperty('--blob-y', `${dir.y * dist}px`);

    const max = (document.documentElement.scrollHeight - vh) || 1;
    const progress = Math.min(1, Math.max(0, scrollY / max));
    root.style.setProperty('--blob-opacity', 1 - progress);
  }

  apply(window.scrollY);

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      apply(window.scrollY);
      ticking = false;
    });
  }, { passive: true });
})();
