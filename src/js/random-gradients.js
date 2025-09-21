// Random gradient for body background
function generateRandomGradient() {
  // Angle between 0 and 360 degrees
  function randomAngle() {
    return Math.floor(Math.random() * 360);
  }

  // Generate colour
  function randomLightColor() {
    const hue = Math.floor(Math.random() * 360); // 0-360 degrees
    const saturation = Math.floor(Math.random() * 40) + 20; // 20-60% saturation
    const lightness = Math.floor(Math.random() * 20) + 75; // 75-95% lightness (very light)
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }

  // Apply gradient to body
  const angle = randomAngle();
  const firstColor = 'var(--color-background)';
  const secondColor = randomLightColor();

  document.body.style.setProperty('--gradient-angle', `${angle}deg`);
  document.body.style.setProperty('--gradient-color', secondColor);
  document.body.style.setProperty('--gradient-start', '75%');
  document.body.style.setProperty('--gradient-end', '100%');
}

// Run
document.addEventListener('DOMContentLoaded', generateRandomGradient);
