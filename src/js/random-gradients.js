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

  document.body.style.background = `linear-gradient(${angle}deg, ${firstColor} 75%, ${secondColor} 100%)`;
  document.body.style.backgroundAttachment = 'fixed';
  document.body.style.backgroundSize = '100vw 100vh';
  document.body.style.backgroundRepeat = 'no-repeat';
  document.body.style.backgroundPosition = 'center';
  document.body.style.minHeight = '100vh';
}

// Run
document.addEventListener('DOMContentLoaded', generateRandomGradient);
