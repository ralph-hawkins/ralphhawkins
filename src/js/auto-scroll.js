// Open a post at the foot of the hero, so arriving on it starts at the writing
// rather than at the masthead you have just come through.
document.addEventListener('DOMContentLoaded', function() {
  const urlParams = new URLSearchParams(window.location.search);
  const cameFromHomePage = urlParams.get('from') === 'home';

  // Not when / has redirected here, though — that is the one arrival with no
  // preceding page, so the hero is worth seeing.
  if (!cameFromHomePage) {
    // main's top edge is the hero's bottom edge: the header is a sibling
    // directly above it with nothing between. This used to aim at the post's
    // date line, which no longer exists.
    const main = document.querySelector('main');
    if (main) {
      const mainTop = main.getBoundingClientRect().top + window.scrollY;
      // How much of the hero to leave showing above it (see --post-pin-offset);
      // 0 would put the boundary exactly on the top of the viewport.
      const offsetVar = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--post-pin-offset'));
      const offset = Number.isFinite(offsetVar) ? offsetVar : 0;
      window.scrollTo({
        top: Math.max(0, mainTop - offset),
        behavior: 'instant'
      });
    }
  }

  // Remove 'from=home' parameter when clicking internal links
  document.addEventListener('click', function(e) {
    const link = e.target.closest('a');
    if (link && link.href) {
      const linkUrl = new URL(link.href);
      const currentHost = window.location.hostname;

      // Check if it's an internal link
      if (linkUrl.hostname === currentHost) {
        // Remove 'from=home' parameter if present
        linkUrl.searchParams.delete('from');
        link.href = linkUrl.toString();
      }
    }
  });
});