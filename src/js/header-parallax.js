// Header bands stretch upward from the header's bottom as the page scrolls.
// 15 interactive bars each carry their own backdrop blur (progressively
// stronger from top to bottom) and tint colour, and swell around the
// cursor's Y position using a cosine-bell falloff. Each bar's current
// height chases its cursor-driven target with asymmetric smoothing —
// fast rise, slow decay — so bars the cursor passes over hold their swell
// briefly, leaving a visible trail. The layer is offset so the cursor's
// logical position anchors to its physical Y; bars flow under the cursor
// rather than snapping between discrete indices.
(function () {
  const header = document.querySelector('header');
  if (!header) return;

  const BARS = 15;
  const BASE_PCT = 100 / BARS;
  // Bar under the cursor grows to PEAK× base height; influence falls off
  // smoothly to 1× over W% of the header.
  const PEAK = 3.5;
  const W = 22;
  const BLUR_STEP = Math.max(10, window.innerWidth / 125);
  const SATURATE = 1.3;
  const OPACITY_STEP = 5;
  const MAX_OPACITY = BARS * OPACITY_STEP;
  const MAX_BLUR = BARS * BLUR_STEP;
  const stepEase = (i) => {
    const t = i / BARS;
    return 1 - (1 - t) * (1 - t);
  };

  const root = document.documentElement;
  root.style.setProperty('--content-bg-opacity', `${MAX_OPACITY.toFixed(2)}%`);
  root.style.setProperty('--content-bg-blur', `${MAX_BLUR.toFixed(2)}px`);

  const barsLayer = document.createElement('div');
  barsLayer.className = 'header-bars';
  barsLayer.setAttribute('aria-hidden', 'true');
  const bars = [];
  const restTops = new Array(BARS + 1);
  for (let i = 0; i <= BARS; i++) {
    restTops[i] = +(i * BASE_PCT).toFixed(2);
  }
  for (let i = 0; i < BARS; i++) {
    const ease = stepEase(i);
    const bar = document.createElement('div');
    bar.className = 'header-bar';
    bar.style.setProperty('--bar-opacity', `${(ease * MAX_OPACITY).toFixed(2)}%`);
    bar.style.setProperty('--bar-top', `${restTops[i].toFixed(2)}%`);
    bar.style.setProperty('--bar-bottom', `${(100 - restTops[i + 1]).toFixed(2)}%`);
    const filter = `blur(${(ease * MAX_BLUR).toFixed(2)}px) saturate(${SATURATE})`;
    bar.style.backdropFilter = filter;
    bar.style.webkitBackdropFilter = filter;
    barsLayer.appendChild(bar);
    bars.push(bar);
  }
  header.appendChild(barsLayer);

  // Per-frame lerp factors. Asymmetric so bars rise quickly toward the
  // cursor's bell and decay slowly back to rest, leaving a visible trail.
  const RISE = 0.28;
  const DECAY = 0.08;
  const REST_EPS = 0.001;

  const currentMults = new Array(BARS).fill(1);
  const targetMults = new Array(BARS).fill(1);
  let cursorActive = false;
  let anchorPct = 0;
  let rafId = null;

  function updateTargets() {
    if (!cursorActive) {
      for (let i = 0; i < BARS; i++) targetMults[i] = 1;
      return;
    }
    for (let i = 0; i < BARS; i++) {
      const center = (i + 0.5) * BASE_PCT;
      const d = Math.abs(anchorPct - center);
      targetMults[i] = (d >= W)
        ? 1
        : 1 + ((PEAK - 1) * (Math.cos((Math.PI * d) / W) + 1)) / 2;
    }
  }

  function applyMults() {
    const mults = currentMults;
    const cum = new Array(BARS + 1);
    cum[0] = 0;
    for (let i = 0; i < BARS; i++) {
      cum[i + 1] = cum[i] + mults[i] * BASE_PCT;
    }
    // Anchor: the logical position the cursor was over in the rest layout
    // should still be under the cursor in the magnified layout.
    const p = anchorPct / BASE_PCT;
    let yMag;
    if (p <= 0) {
      yMag = p * mults[0] * BASE_PCT;
    } else if (p >= BARS) {
      yMag = cum[BARS] + (p - BARS) * mults[BARS - 1] * BASE_PCT;
    } else {
      const idx = Math.floor(p);
      const frac = p - idx;
      yMag = cum[idx] + frac * mults[idx] * BASE_PCT;
    }
    const offset = anchorPct - yMag;
    // Round shared edges once so bar i's bottom and bar i+1's top reference
    // the exact same value — keeps adjacent bars flush every frame.
    const tops = new Array(BARS + 1);
    for (let i = 0; i <= BARS; i++) {
      tops[i] = +(cum[i] + offset).toFixed(2);
    }
    for (let i = 0; i < BARS; i++) {
      bars[i].style.setProperty('--bar-top', `${tops[i].toFixed(2)}%`);
      bars[i].style.setProperty('--bar-bottom', `${(100 - tops[i + 1]).toFixed(2)}%`);
    }
  }

  function tick() {
    let activity = 0;
    for (let i = 0; i < BARS; i++) {
      const delta = targetMults[i] - currentMults[i];
      const k = delta > 0 ? RISE : DECAY;
      currentMults[i] += k * delta;
      activity += Math.abs(delta);
    }
    applyMults();
    if (activity > REST_EPS) {
      rafId = requestAnimationFrame(tick);
    } else {
      for (let i = 0; i < BARS; i++) currentMults[i] = targetMults[i];
      applyMults();
      rafId = null;
    }
  }

  function ensureTicking() {
    if (rafId === null) rafId = requestAnimationFrame(tick);
  }

  function cursorPctFrom(e) {
    const rect = header.getBoundingClientRect();
    return ((e.clientY - rect.top) / rect.height) * 100;
  }

  function onCursorAt(pct) {
    cursorActive = true;
    anchorPct = pct;
    updateTargets();
    ensureTicking();
  }

  function onCursorOut() {
    cursorActive = false;
    updateTargets();
    ensureTicking();
  }

  header.addEventListener('pointermove', (e) => onCursorAt(cursorPctFrom(e)));
  header.addEventListener('pointerdown', (e) => {
    try { header.releasePointerCapture(e.pointerId); } catch (_) {}
    onCursorAt(cursorPctFrom(e));
  });
  header.addEventListener('pointerleave', onCursorOut);
  header.addEventListener('pointercancel', onCursorOut);

  function apply(scrollY) {
    const headerHeight = header.offsetHeight || 1;
    const scale = 1 + Math.max(0, scrollY) / headerHeight;
    root.style.setProperty('--bands-scale', scale);
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
