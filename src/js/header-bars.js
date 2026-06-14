// 15 static bars stacked behind the header, each with its own backdrop blur and
// tint stepping along an ease-out curve from clear at the top to fully
// blurred/tinted at the bottom. Entirely static — no scroll or load motion.
(function () {
  const header = document.querySelector('header');
  if (!header) return;

  const BARS = 15;
  const BASE_PCT = 100 / BARS;
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
  for (let i = 0; i < BARS; i++) {
    const ease = stepEase(i);
    const top = +(i * BASE_PCT).toFixed(2);
    const bottom = +(100 - (i + 1) * BASE_PCT).toFixed(2);
    const bar = document.createElement('div');
    bar.className = 'header-bar';
    bar.style.setProperty('--bar-opacity', `${(ease * MAX_OPACITY).toFixed(2)}%`);
    bar.style.setProperty('--bar-top', `${top.toFixed(2)}%`);
    bar.style.setProperty('--bar-bottom', `${bottom.toFixed(2)}%`);
    const filter = `blur(${(ease * MAX_BLUR).toFixed(2)}px) saturate(${SATURATE})`;
    bar.style.backdropFilter = filter;
    bar.style.webkitBackdropFilter = filter;
    barsLayer.appendChild(bar);
  }
  header.appendChild(barsLayer);
})();
