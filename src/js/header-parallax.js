// Header bands stretch upward from the header's bottom as the page scrolls,
// and 15 frosted-glass slices apply progressively stronger backdrop blur to
// the blob behind each band.
(function () {
  const header = document.querySelector('header');
  if (!header) return;

  const SLICES = 15;
  const BLUR_STEP = Math.max(2.5, window.innerWidth / 400);
  const SATURATE = 1.3;

  const wrapper = document.createElement('div');
  wrapper.className = 'header-blur-wrapper';
  wrapper.setAttribute('aria-hidden', 'true');

  for (let i = 0; i < SLICES; i++) {
    const slice = document.createElement('div');
    slice.className = 'header-blur-slice';
    slice.style.top = `${(i / SLICES) * 100}%`;
    const filter = `blur(${(i * BLUR_STEP).toFixed(2)}px) saturate(${SATURATE})`;
    slice.style.backdropFilter = filter;
    slice.style.webkitBackdropFilter = filter;
    wrapper.appendChild(slice);
  }
  header.appendChild(wrapper);

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
