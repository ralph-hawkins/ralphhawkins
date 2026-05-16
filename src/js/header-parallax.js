// Header bands stretch upward from the header's bottom as the page scrolls.
// 30 interactive bars each carry their own backdrop blur (progressively
// stronger from top to bottom) and tint colour, and swell continuously
// around the cursor's Y position using a cosine-bell falloff. The layer is
// offset so the cursor's logical position anchors to its physical Y — bars
// flow under the cursor rather than snapping between discrete indices.
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

  const barsLayer = document.createElement('div');
  barsLayer.className = 'header-bars';
  barsLayer.setAttribute('aria-hidden', 'true');
  const bars = [];
  const restTops = new Array(BARS + 1);
  for (let i = 0; i <= BARS; i++) {
    restTops[i] = +(i * BASE_PCT).toFixed(2);
  }
  for (let i = 0; i < BARS; i++) {
    const bar = document.createElement('div');
    bar.className = 'header-bar';
    bar.style.setProperty('--bar-opacity', `${(i * 5).toFixed(2)}%`);
    bar.style.setProperty('--bar-top', `${restTops[i].toFixed(2)}%`);
    bar.style.setProperty('--bar-bottom', `${(100 - restTops[i + 1]).toFixed(2)}%`);
    const filter = `blur(${(i * BLUR_STEP).toFixed(2)}px) saturate(${SATURATE})`;
    bar.style.backdropFilter = filter;
    bar.style.webkitBackdropFilter = filter;
    barsLayer.appendChild(bar);
    bars.push(bar);
  }
  header.appendChild(barsLayer);

  let lastCursorPct = null;
  let rafPending = false;

  function compute(cursorPct) {
    const mults = new Array(BARS);
    for (let i = 0; i < BARS; i++) {
      const center = (i + 0.5) * BASE_PCT;
      const d = Math.abs(cursorPct - center);
      if (d >= W) {
        mults[i] = 1;
      } else {
        mults[i] = 1 + ((PEAK - 1) * (Math.cos((Math.PI * d) / W) + 1)) / 2;
      }
    }
    const cum = new Array(BARS + 1);
    cum[0] = 0;
    for (let i = 0; i < BARS; i++) {
      cum[i + 1] = cum[i] + mults[i] * BASE_PCT;
    }
    // Anchor: the logical position the cursor was over in the rest layout
    // should still be under the cursor in the magnified layout.
    const p = cursorPct / BASE_PCT;
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
    const offset = cursorPct - yMag;
    // Round shared edges once so bar i's bottom and bar i+1's top reference
    // the exact same value — that keeps adjacent bars flush through every
    // frame of a transition, even at high cursor speed.
    const tops = new Array(BARS + 1);
    for (let i = 0; i <= BARS; i++) {
      tops[i] = +(cum[i] + offset).toFixed(2);
    }
    for (let i = 0; i < BARS; i++) {
      bars[i].style.setProperty('--bar-top', `${tops[i].toFixed(2)}%`);
      bars[i].style.setProperty('--bar-bottom', `${(100 - tops[i + 1]).toFixed(2)}%`);
    }
  }

  function reset() {
    for (let i = 0; i < BARS; i++) {
      bars[i].style.setProperty('--bar-top', `${restTops[i].toFixed(2)}%`);
      bars[i].style.setProperty('--bar-bottom', `${(100 - restTops[i + 1]).toFixed(2)}%`);
    }
  }

  function flush() {
    rafPending = false;
    if (lastCursorPct === null) reset();
    else compute(lastCursorPct);
  }

  function schedule(pct) {
    lastCursorPct = pct;
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(flush);
  }

  function cursorPctFrom(e) {
    const rect = header.getBoundingClientRect();
    return ((e.clientY - rect.top) / rect.height) * 100;
  }

  header.addEventListener('pointermove', (e) => {
    barsLayer.classList.remove('is-resetting');
    schedule(cursorPctFrom(e));
  });
  header.addEventListener('pointerdown', (e) => {
    try { header.releasePointerCapture(e.pointerId); } catch (_) {}
    barsLayer.classList.remove('is-resetting');
    schedule(cursorPctFrom(e));
  });
  header.addEventListener('pointerleave', () => {
    barsLayer.classList.add('is-resetting');
    schedule(null);
  });
  header.addEventListener('pointercancel', () => {
    barsLayer.classList.add('is-resetting');
    schedule(null);
  });

  const root = document.documentElement;

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
