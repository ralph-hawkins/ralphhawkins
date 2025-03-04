// Script to handle scroll effects for header, main content, and footer

document.addEventListener('DOMContentLoaded', function() {
  const footer = document.querySelector('footer');
  const header = document.querySelector('header');
  const main = document.querySelector('main');

  // Handle scroll effects
  window.addEventListener('scroll', function() {
    const scrollTop = window.scrollY;

    // Parallax effect for header
    if (scrollTop <= header.offsetHeight) {
      const translateY = scrollTop * .75;
      header.style.transform = `translateY(${translateY}px)`;
    }
  });
});
