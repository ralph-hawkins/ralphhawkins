document.addEventListener('DOMContentLoaded', function() {
  const footer = document.querySelector('footer');
  
  // Function to check if user has scrolled to the bottom
  function checkScrollPosition() {
    const scrollPosition = window.scrollY + window.innerHeight;
    const mainContent = document.querySelector('main');
    const mainBottom = mainContent.offsetTop + mainContent.offsetHeight;
    
    // If we're at the bottom of the main content (with a small buffer)
    if (scrollPosition >= mainBottom - 20) {
      footer.classList.add('visible');
    } else {
      footer.classList.remove('visible');
    }
  }
  
  // Check on scroll
  window.addEventListener('scroll', checkScrollPosition);
  
  // Check on initial load
  checkScrollPosition();
});
