// Anchor the "next post" arrow to the end of the first line of the link
// text. CSS can't measure where the first line ends when text wraps, so we
// take a Range over the link's content, grab the first ClientRect's right
// edge, and pass that offset to the ::after via a custom property.
(function () {
  const nodes = document.querySelectorAll('.post-nav-next');
  if (nodes.length === 0) return;

  function reposition() {
    for (const node of nodes) {
      const link = node.querySelector('a');
      if (!link) continue;
      const range = document.createRange();
      range.selectNodeContents(link);
      const rects = range.getClientRects();
      if (rects.length === 0) continue;
      const nodeRect = node.getBoundingClientRect();
      const firstLineEnd = rects[0].right - nodeRect.left;
      node.style.setProperty('--arrow-x', `${firstLineEnd.toFixed(2)}px`);
    }
  }

  reposition();
  window.addEventListener('resize', reposition);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(reposition);
  }
})();
