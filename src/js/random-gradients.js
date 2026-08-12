// Single-blob background: analogous hues, drifts on scroll, fades to footer,
// and gently hovers when idle.
(function () {
  const root = document.documentElement;
  // Posts carry a slug-seeded hue (data-blob-hue, set at build) so the page's
  // colours match the post's Open Graph card; elsewhere the roll is random.
  const seededHue = parseInt(root.dataset.blobHue, 10);
  const baseHue1 = Number.isNaN(seededHue) ? Math.floor(Math.random() * 360) : seededHue;
  // The two hues the disc runs between, head to foot. 65° apart rather than
  // the 40° they used to be: the blob is now one shape with the colour
  // travelling through it, so the pair has to be far enough apart to read as
  // a transition rather than as a slightly uneven single colour. Still
  // analogous — same family, one clearly moved along from the other.
  // Seeded pages use the fixed offset the OG card uses.
  const baseHue2 = Number.isNaN(seededHue)
    ? (baseHue1 + 50 + Math.floor(Math.random() * 30)) % 360
    : (baseHue1 + 65) % 360;

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

  // One breath for the whole disc. This used to be three, one per lobe, on
  // periods of 9/13/19s with independent phases — which was right when they
  // were three separate lobes, and wrong the moment they became one shape:
  // ±10% each, out of phase, slides the bloom and the base up to 20% apart and
  // the disc visibly comes to pieces.
  const SCALE_AMPLITUDE = 0.1;
  const SCALE_PERIOD = 13000;
  const SCALE_PHASE = Math.random() * Math.PI * 2;

  const INITIAL_OFFSET_X = (Math.random() - 0.5) * 0.5 * window.innerWidth;
  const yDir = Math.random() < 0.5 ? -1 : 1;
  const yMag = (0.15 + Math.random() * 0.1) * window.innerHeight;
  const INITIAL_OFFSET_Y = yDir * yMag;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // The lowest the disc's centre may *start*, as a fraction of the viewport
  // from the top. Only the start: the scroll drift below is left alone, so the
  // blob still travels as the page moves, and the page's own auto-scroll
  // (auto-scroll.js) then moves it further. This is the number before any of
  // that — where the disc is placed, not where it ends up.
  //
  // It used to be expressed as a distance below the hero's bottom edge, which
  // made it depend on the hero being 62.5svh — and at that height it never
  // bound at all: measured over 80 loads at 1440×900, the centre landed
  // between 25% and 75% of the viewport while the rail permitted 87.5%, so it
  // was slack on every single load and the constant that appeared to govern
  // this governed nothing. Stated straight, it does what it says.
  const START_FLOOR = 0.6;

  // The post supergraphic fills its glyphs with this same gradient so the type
  // reads as a hole cut through everything above the blob (see
  // supergraphic.css). Its box scrolls with the document while the blob is
  // fixed to the viewport, so it needs the offset between the two to line them
  // up. background-attachment: fixed is meant to do exactly this unaided, but
  // Chrome mispaints it near the top of the document — the letters come out
  // blank there — so the offset is published as a custom property instead.
  // Measured, not read per frame: the box only moves when layout does, and a
  // getBoundingClientRect() inside the rAF loop would force a layout on every
  // frame.
  let supergraphic = null;
  let supergraphicLeft = 0;
  let supergraphicTop = 0;

  function measureSupergraphic() {
    if (!supergraphic) return;
    const box = supergraphic.getBoundingClientRect();
    supergraphicLeft = box.left + window.scrollX;
    supergraphicTop = box.top + window.scrollY;
  }

  // This script runs in <head>, before the element exists.
  function findSupergraphic() {
    supergraphic = document.querySelector('.supergraphic');
    measureSupergraphic();
    apply(0);
  }

  function apply(time) {
    const scrollY = window.scrollY;
    const vh = window.innerHeight || 1;
    const offset = (scrollY / vh) * HUE_SHIFT_PER_VIEWPORT;
    root.style.setProperty('--blob-hue-1', (((baseHue1 + offset) % 360 + 360) % 360).toFixed(2));
    root.style.setProperty('--blob-hue-2', (((baseHue2 + offset) % 360 + 360) % 360).toFixed(2));

    const dist = scrollY * SCROLL_FACTOR;
    const hoverX = reduceMotion ? 0 : Math.sin((time / HOVER_PERIOD_X) * Math.PI * 2 + HOVER_PHASE) * HOVER_AMPLITUDE;
    const hoverY = reduceMotion ? 0 : Math.cos((time / HOVER_PERIOD_Y) * Math.PI * 2 + HOVER_PHASE) * HOVER_AMPLITUDE;

    // The disc's centre sits at half the viewport plus this offset, so the
    // floor converts straight into a ceiling on the offset.
    //
    // Applied here against the live vh rather than folded into
    // INITIAL_OFFSET_Y once, because that offset is a fixed number of pixels
    // rolled at load: capping it at load would hold 60vh for the window it
    // was rolled in and no other. Shrink the window afterwards and the same
    // pixels are a larger fraction of it, and the disc would sink back below
    // the floor.
    const startY = Math.min(INITIAL_OFFSET_Y, (START_FLOOR - 0.5) * vh);

    root.style.setProperty('--blob-x', `${(INITIAL_OFFSET_X + dir.x * dist + hoverX).toFixed(2)}px`);
    root.style.setProperty('--blob-y', `${(startY + dir.y * dist + hoverY).toFixed(2)}px`);

    // 4dp, where everything else here rounds to 2: this one is a multiplier,
    // not a length, and 2dp would quantise the disc's size into visible steps.
    const scale = reduceMotion ? 1 : 1 + Math.sin((time / SCALE_PERIOD) * Math.PI * 2 + SCALE_PHASE) * SCALE_AMPLITUDE;
    root.style.setProperty('--blob-scale', scale.toFixed(4));

    // Where the viewport's top-left sits in the supergraphic's own box, which
    // is where its copy of the gradient has to start for the two to coincide.
    if (supergraphic) {
      root.style.setProperty('--supergraphic-blob-x', `${(window.scrollX - supergraphicLeft).toFixed(2)}px`);
      root.style.setProperty('--supergraphic-blob-y', `${(scrollY - supergraphicTop).toFixed(2)}px`);
    }

    const max = (document.documentElement.scrollHeight - vh) || 1;
    const progress = Math.min(1, Math.max(0, scrollY / max));
    root.style.setProperty('--blob-opacity', (1 - progress).toFixed(2));
  }

  // Set the custom properties synchronously so the very first paint has the
  // right hues. Waiting for the first requestAnimationFrame let a
  // view-transition snapshot capture the CSS default hues (70/135), which
  // flashed yellow-green for a frame when navigating between posts.
  apply(0);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', findSupergraphic);
  } else {
    findSupergraphic();
  }
  // The graphic is sized in vw, so a resize moves its box as well as the blob.
  window.addEventListener('resize', () => { measureSupergraphic(); apply(0); });

  // And again once the webfont lands. The box is anchored by its left edge
  // now rather than its right, so it no longer depends on how wide its own
  // type sets — but it still moves, because that edge is measured from
  // .container, and .container is 65ch wide. ch is a font-relative unit, so
  // the column narrows or widens the moment Volksans replaces the fallback
  // and the centred box shifts sideways with it. Measuring only at
  // DOMContentLoaded leaves a stale left edge and throws the cut-out out of
  // register horizontally for the rest of the page's life.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => { measureSupergraphic(); apply(0); });
  }

  if (reduceMotion) {
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
