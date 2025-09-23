// Random gradient for body background
function generateRandomGradient() {
  // Angle between 90 and 270 degrees
  function randomAngle() {
    return Math.floor(Math.random() * 180) + 90;
  }

  // Generate colour (avoiding green: 90-150 degrees)
  function randomLightColor() {
    let hue;
    if (Math.random() < 0.5) {
      hue = Math.floor(Math.random() * 70);
    } else {
      hue = Math.floor(Math.random() * 190) + 170;
    }
    const saturation = Math.floor(Math.random() * 40) + 20; // 20-60% saturation
    const lightness = Math.floor(Math.random() * 20) + 75; // 75-95% lightness (very light)
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }

  // Apply gradient to body
  const angle = randomAngle();
  const firstColor = randomLightColor();
  const secondColor = 'var(--color-background)';

  document.body.style.setProperty('--gradient-angle', `${angle}deg`);
  document.body.style.setProperty('--gradient-color', firstColor);
  document.body.style.setProperty('--gradient-start', '0%');
  document.body.style.setProperty('--gradient-end', '100%');
}

// Run
document.addEventListener('DOMContentLoaded', generateRandomGradient);
