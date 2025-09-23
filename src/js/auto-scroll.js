// Auto-scroll to first h2 for direct blog post visits
document.addEventListener('DOMContentLoaded', function() {
  const urlParams = new URLSearchParams(window.location.search);
  const cameFromHomePage = urlParams.get('from') === 'home';

  // Only position at date if user came directly to the post (not from home page)
  if (!cameFromHomePage) {
    const dateElement = document.querySelector('.date');
    if (dateElement) {
      const rect = dateElement.getBoundingClientRect();
      const elementTop = rect.top + window.pageYOffset;
      const offset = 40; // 40px from top
      window.scrollTo({
        top: elementTop - offset,
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