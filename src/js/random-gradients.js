// Single-blob background: analogous hues, drifts on scroll, fades to footer,
// and gently hovers when idle.
(function () {
  const root = document.documentElement;

  // The disc's own reach, the seam under the hero, --blob-fill-fade and the
  // browser-chrome colour were all measured or solved here until 2026-09-03.
  // Every one of them served the fill under the post — where the disc's foot
  // and head crossed the rule, how far into main the ramp had got, and what
  // colour that left at the top of the window — and they went with it when
  // main stopped painting a surface of its own. <meta name="theme-color"> is
  // now the static per-post value the build emits and nothing here touches it:
  // with no fill there is no flat ground for it to track, only the page
  // background and a soft radial that this deliberately never modelled.

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

  // How heavily the disc's travel lags the scroll, as the time constant of an
  // exponential follow in milliseconds: it covers 63% of the distance to where
  // the scroll says it should be in one tau, 95% in three. At 600ms the blob
  // is unmistakably behind the page rather than pinned to it, and still comes
  // to rest inside two seconds of the scroll stopping.
  //
  // Only the *travel* is eased. The hue rotation and the fade to the footer
  // stay keyed to the real scroll position: they say how far through the
  // document the reader is, which is a fact about the page rather than a
  // movement, and lagging them would mean the disc arrived at the footer still
  // faintly visible.
  //
  // Framed as a time constant rather than a per-frame fraction because a
  // fraction is silently frame-rate dependent — the same 0.05 eases twice as
  // fast on a 120Hz display as on a 60Hz one, so the feel of the page would
  // depend on the machine. With exp(-dt/tau) the curve is the same everywhere,
  // and it stays correct across an arbitrary gap: after a long stall the
  // exponential is ~0 and the disc is simply where it should have settled,
  // which is why dt is not clamped.
  const SCROLL_EASE_TAU = 600;
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

  // A viewport height a mobile browser's own chrome cannot move.
  //
  // window.innerHeight *grows* when an iOS URL bar retracts — 82px on an
  // iPhone 17 Pro — and apply() runs every frame, so reading it there moved
  // the disc when the browser moved rather than when the page did. Measured
  // with the scroll held still and only the height changed: --blob-y stepped
  // 8.20px in one frame on half of loads (START_FLOOR is what binds) and the
  // hue stepped 1.89deg on all of them. 100svh is the height with the toolbar
  // *showing*, which by definition doesn't change when it hides — the same
  // unit layout.css sizes the header's rows in, and for the same reason.
  //
  // Measured off a probe because svh is a unit, not a custom property: there
  // is nothing for getComputedStyle to return.
  function measureViewportHeight() {
    const probe = document.createElement('div');
    // Fixed and zero-width, so it cannot affect layout or scroll height for
    // the frame it exists in.
    probe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:100svh;'
      + 'visibility:hidden;pointer-events:none';
    document.documentElement.appendChild(probe);
    const measured = probe.getBoundingClientRect().height;
    probe.remove();
    // No svh support: fall back to what this read before.
    return measured || window.innerHeight || 1;
  }

  let viewportH = measureViewportHeight();

  const INITIAL_OFFSET_X = (Math.random() - 0.5) * 0.5 * window.innerWidth;
  const yDir = Math.random() < 0.5 ? -1 : 1;
  const yMag = (0.15 + Math.random() * 0.1) * viewportH;
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

  // Lightnesses of the two chromatic layers. Must match the oklch() values in
  // variables.css: the stylesheet holds the lightness, this file solves the
  // chroma that goes with it.
  const WASH_L = 0.8;
  const BASE_L = 0.74;

  // The disc takes the most chroma sRGB holds at each layer's lightness for
  // the hue actually being drawn, rather than one number for all 360° — which
  // was the tightest hue's ceiling (0.118 at the base) imposed on every other.
  // Worth 61% more chroma at the eye on average, double at 150°. Binary search
  // rather than a table: the boundary has corners where a channel saturates,
  // and interpolating across one overshoots and clips, which distorts hue.
  // Tested in linear light — the 0-1 check there is the same answer the
  // transfer function gives, more cheaply.
  const GAMUT_STEPS = 16;
  const GAMUT_MARGIN = 0.98; // a whisker inside, so 4dp rounding can't clip

  const chromaCache = new Map();

  function oklchToLinear(L, C, hue) {
    const a = C * Math.cos((hue * Math.PI) / 180);
    const b = C * Math.sin((hue * Math.PI) / 180);
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
    return [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
    ];
  }

  function inGamut(L, C, hue) {
    return oklchToLinear(L, C, hue).every((c) => c >= 0 && c <= 1);
  }

  // Cached per whole degree: the hue moves continuously as the page scrolls,
  // so this would otherwise run twice a frame, and a degree is far finer than
  // the eye reads here.
  function maxChroma(L, hue) {
    const key = L + '|' + Math.round(hue);
    const cached = chromaCache.get(key);
    if (cached !== undefined) return cached;
    let lo = 0;
    let hi = 0.4;
    for (let i = 0; i < GAMUT_STEPS; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(L, mid, hue)) lo = mid; else hi = mid;
    }
    const chroma = lo * GAMUT_MARGIN;
    chromaCache.set(key, chroma);
    return chroma;
  }

  // The scroll position the disc is actually drawn from: an eased follow of
  // the real one, advanced once per frame by ease() below. Seeded with the
  // current scroll rather than 0, so a reload part-way down the page — or a
  // post opening under auto-scroll.js — starts the disc where it belongs
  // instead of gliding in from the top over the first two seconds.
  let easedScroll = window.scrollY;
  let lastFrame = null;

  function ease(time) {
    const target = window.scrollY;
    // First frame of a run — page load, or the tab coming back to the front.
    // Nothing to ease from, and after a spell hidden the reader may have
    // scrolled, so take the position as it is.
    if (lastFrame === null) {
      easedScroll = target;
      lastFrame = time;
      return;
    }
    const dt = Math.max(0, time - lastFrame);
    lastFrame = time;
    easedScroll = target + (easedScroll - target) * Math.exp(-dt / SCROLL_EASE_TAU);
  }

  // The disc fades across the whole document, and it goes quickest at the top.
  //
  // What is raised to the power is the strength *remaining*, not the distance
  // travelled, which is what puts the speed at the start rather than the end:
  // the slope is -FADE_EXPONENT at the first pixel of scroll and 0 at the last,
  // so the disc drops away as the reader leaves the poster and then lands on
  // nothing gently instead of arriving at zero still moving. An exponent of 1
  // is the plain linear ramp, and every value above it bends the same curve
  // further — 2 puts the disc at a quarter strength by the half-way line where
  // linear would leave it at a half.
  //
  // It held at full strength until the footer appeared, from 2026-08-30 to
  // 2026-09-26. That hold was built for the four days main was flooded with the
  // disc's own colour, when fading early meant a long post read its second half
  // on a page that had already given its colour up. main has been a neutral
  // surface again since 2026-09-03, so what fades here is a shape behind the
  // writing rather than the ground under it — and measured on the built site
  // the hold covered the first 76% of a median post's scroll and 80% of a long
  // one's, so the disc barely moved while the post was being read.
  //
  // That hold needed no constant: max is footerTop + footerHeight - vh, so
  // max - scrollY equalled the footer's own height at exactly the moment its
  // top edge reached the bottom of the window. Neat, and nothing here needs the
  // footer any more — footerHeight() went with it.
  const FADE_EXPONENT = 2;

  function scrollFade(scrollY, vh) {
    const max = (document.documentElement.scrollHeight - vh) || 1;
    const remaining = Math.max(0, Math.min(1, (max - scrollY) / max));
    return Math.pow(remaining, FADE_EXPONENT);
  }

  function apply(time) {
    const scrollY = window.scrollY;
    // Stable, not window.innerHeight: the hue offset and the start floor are
    // both fractions of the viewport and neither should move when a toolbar
    // hides. See measureViewportHeight().
    const vh = viewportH;
    const offset = (scrollY / vh) * HUE_SHIFT_PER_VIEWPORT;
    const hue1 = ((baseHue1 + offset) % 360 + 360) % 360;
    const hue2 = ((baseHue2 + offset) % 360 + 360) % 360;
    root.style.setProperty('--blob-hue-1', hue1.toFixed(2));
    root.style.setProperty('--blob-hue-2', hue2.toFixed(2));

    // 4dp for the same reason --blob-scale takes it: 2dp is a 6% step here,
    // which bands the colour as the hue rotates. Without the script the
    // stylesheet's fallbacks hold and the disc looks as it did before.
    root.style.setProperty('--blob-chroma-1', maxChroma(WASH_L, hue1).toFixed(4));
    root.style.setProperty('--blob-chroma-2', maxChroma(BASE_L, hue2).toFixed(4));

    // Travel comes from the eased scroll, so the disc trails the page and
    // keeps going for a moment after it stops. Under reduced motion there is
    // no loop to advance the easing, and motion that continues after the
    // reader has stopped is exactly what that preference asks not to see — so
    // the disc tracks the real scroll, one for one, as it always did.
    const dist = (reduceMotion ? scrollY : easedScroll) * SCROLL_FACTOR;
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

    // The fade keeps innerHeight on purpose: its denominator is the scroll
    // left to do, which really does shrink as a toolbar retracts, and "0.00 at
    // the end" is only exact against the real range. Measured, it never
    // stepped anyway — a ratio barely moves when both terms grow.
    root.style.setProperty('--blob-opacity', scrollFade(scrollY, window.innerHeight || 1).toFixed(2));
  }

  // Set the custom properties synchronously so the very first paint has the
  // right hues. Waiting for the first requestAnimationFrame let a
  // view-transition snapshot capture the CSS default hues (70/135), which
  // flashed yellow-green for a frame when navigating between posts.
  apply(0);

  // START_FLOOR is applied against the viewport height rather than folded into
  // the offset at load, so a resize has to re-measure and re-run it. The rAF
  // loop below would re-run it anyway; under reduced motion there is no loop,
  // and scroll alone would leave a resized window holding the old placement.
  // A retracting toolbar fires resize too, and that costs one probe and moves
  // nothing, svh being the same height afterwards. A rotation should move it.
  window.addEventListener('resize', () => {
    viewportH = measureViewportHeight();
    apply(0);
  });

  if (reduceMotion) {
    window.addEventListener('scroll', () => apply(0), { passive: true });
  } else {
    // Continuous loop drives the idle hover. Pause it while the tab is hidden
    // so a backgrounded page stops recomputing the blob (and the blur on it,
    // and the post panel's backdrop-filter over both) instead of burning
    // CPU/battery.
    let rafId = null;
    function loop(time) {
      ease(time);
      apply(time);
      rafId = requestAnimationFrame(loop);
    }
    function start() { if (rafId === null) rafId = requestAnimationFrame(loop); }
    // lastFrame goes with the loop: the next run starts fresh rather than
    // easing across however long the tab was hidden.
    function stop() {
      if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
      lastFrame = null;
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop(); else start();
    });
    start();
  }
})();
