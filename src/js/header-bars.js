// 15 stepped "glass" bars behind the header, easing from clear at the top to
// fully blurred/tinted at the bottom. The steps are hard stops in a single
// tint gradient and in the mask that feathers a single backdrop-blur layer —
// visually the stacked bars, but drawn on two full-height elements. Entirely
// static — no scroll or load motion.
// Must stay two full-height layers, not stacked strip elements: iOS Safari
// clamps backdrop sampling to each element's own bounds, so thin bars whose
// blur exceeds their height render as flat saturated stripes.
(function () {
  const header = document.querySelector('header');
  if (!header) return;

  const STEPS = 15;
  const BLUR_STEP = Math.max(10, window.innerWidth / 125);
  const SATURATE = 1.3;
  const OPACITY_STEP = 5;
  const MAX_OPACITY = STEPS * OPACITY_STEP;
  const MAX_BLUR = STEPS * BLUR_STEP;
  const stepEase = (t) => 1 - (1 - t) * (1 - t);

  const root = document.documentElement;
  root.style.setProperty('--content-bg-opacity', `${MAX_OPACITY.toFixed(2)}%`);
  root.style.setProperty('--content-bg-blur', `${MAX_BLUR.toFixed(2)}px`);

  const tintStops = [];
  const maskStops = [];
  for (let i = 0; i < STEPS; i++) {
    const ease = stepEase(i / STEPS);
    const from = ((i / STEPS) * 100).toFixed(2);
    const to = (((i + 1) / STEPS) * 100).toFixed(2);
    const tintColor = `color-mix(in srgb, var(--color-background) ${(ease * MAX_OPACITY).toFixed(2)}%, transparent)`;
    const maskColor = `rgb(0 0 0 / ${(ease * 100).toFixed(2)}%)`;
    tintStops.push(`${tintColor} ${from}%`, `${tintColor} ${to}%`);
    maskStops.push(`${maskColor} ${from}%`, `${maskColor} ${to}%`);
  }

  const glass = document.createElement('div');
  glass.className = 'header-glass';
  glass.setAttribute('aria-hidden', 'true');

  // The blur layer is painted first so the tint above it stays out of its
  // backdrop — matching the old bars, where each bar's own tint was painted
  // over its filtered result rather than saturated by it.
  const blur = document.createElement('div');
  blur.className = 'header-glass-blur';
  const filter = `blur(${MAX_BLUR.toFixed(2)}px) saturate(${SATURATE})`;
  blur.style.backdropFilter = filter;
  blur.style.webkitBackdropFilter = filter;
  const mask = `linear-gradient(to bottom, ${maskStops.join(', ')})`;
  blur.style.maskImage = mask;
  blur.style.webkitMaskImage = mask;

  const tint = document.createElement('div');
  tint.className = 'header-glass-tint';
  tint.style.background = `linear-gradient(to bottom, ${tintStops.join(', ')})`;

  glass.appendChild(blur);
  glass.appendChild(tint);
  header.appendChild(glass);
})();
