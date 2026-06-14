// Single-blob background: analogous hues, drifts on scroll, fades to footer,
// and gently hovers when idle.
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
  const HOVER_AMPLITUDE = 40;
  const HOVER_PERIOD_X = 11000;
  const HOVER_PERIOD_Y = 17000;
  const HOVER_PHASE = Math.random() * Math.PI * 2;

  const SCALE_AMPLITUDE = 0.1;
  const SCALE_PERIODS = [9000, 13000, 19000];
  const SCALE_PHASES = [
    Math.random() * Math.PI * 2,
    Math.random() * Math.PI * 2,
    Math.random() * Math.PI * 2,
  ];

  const INITIAL_OFFSET_X = (Math.random() - 0.5) * 0.5 * window.innerWidth;
  const yDir = Math.random() < 0.5 ? -1 : 1;
  const yMag = (0.15 + Math.random() * 0.1) * window.innerHeight;
  const INITIAL_OFFSET_Y = yDir * yMag;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function apply(time) {
    const scrollY = window.scrollY;
    const vh = window.innerHeight || 1;
    const offset = (scrollY / vh) * HUE_SHIFT_PER_VIEWPORT;
    root.style.setProperty('--blob-hue-1', ((baseHue1 + offset) % 360 + 360) % 360);
    root.style.setProperty('--blob-hue-2', ((baseHue2 + offset) % 360 + 360) % 360);

    const dist = scrollY * SCROLL_FACTOR;
    const hoverX = reduceMotion ? 0 : Math.sin((time / HOVER_PERIOD_X) * Math.PI * 2 + HOVER_PHASE) * HOVER_AMPLITUDE;
    const hoverY = reduceMotion ? 0 : Math.cos((time / HOVER_PERIOD_Y) * Math.PI * 2 + HOVER_PHASE) * HOVER_AMPLITUDE;
    root.style.setProperty('--blob-x', `${INITIAL_OFFSET_X + dir.x * dist + hoverX}px`);
    root.style.setProperty('--blob-y', `${INITIAL_OFFSET_Y + dir.y * dist + hoverY}px`);

    for (let i = 0; i < 3; i++) {
      const scale = reduceMotion ? 1 : 1 + Math.sin((time / SCALE_PERIODS[i]) * Math.PI * 2 + SCALE_PHASES[i]) * SCALE_AMPLITUDE;
      root.style.setProperty(`--blob-scale-${i + 1}`, scale);
    }

    const max = (document.documentElement.scrollHeight - vh) || 1;
    const progress = Math.min(1, Math.max(0, scrollY / max));
    root.style.setProperty('--blob-opacity', 1 - progress);
  }

  if (reduceMotion) {
    apply(0);
    window.addEventListener('scroll', () => apply(0), { passive: true });
  } else {
    // Continuous loop drives the idle hover. Pause it while the tab is hidden
    // so a backgrounded page stops recomputing the blob (and the backdrop
    // blur layered over it) instead of burning CPU/battery.
    let rafId = null;
    function loop(time) {
      apply(time);
      rafId = requestAnimationFrame(loop);
    }
    function start() { if (rafId === null) rafId = requestAnimationFrame(loop); }
    function stop() { if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; } }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop(); else start();
    });
    start();
  }
})();
