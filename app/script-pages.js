// Theme toggle functionality
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const htmlElement = document.documentElement;

// Initialize theme from localStorage
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  htmlElement.setAttribute('data-theme', savedTheme);
  updateThemeButton(savedTheme);
}

function updateThemeButton(theme) {
  if (theme === 'light') {
    themeToggleBtn.textContent = 'Dark';
  } else {
    themeToggleBtn.textContent = 'Light';
  }
}

function toggleTheme() {
  const currentTheme = htmlElement.getAttribute('data-theme') || 'dark';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  htmlElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeButton(newTheme);
}

themeToggleBtn.addEventListener('click', toggleTheme);

// Menu toggle functionality
const menuToggleBtn = document.getElementById('menu-toggle-btn');
const mainNav = document.getElementById('main-nav');
const navLinks = document.getElementById('main-nav-links');

menuToggleBtn.addEventListener('click', () => {
  const isOpen = mainNav.classList.contains('menu-open');
  if (isOpen) {
    mainNav.classList.remove('menu-open');
    menuToggleBtn.setAttribute('aria-expanded', 'false');
  } else {
    mainNav.classList.add('menu-open');
    menuToggleBtn.setAttribute('aria-expanded', 'true');
  }
});

// Close menu when link is clicked
navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    mainNav.classList.remove('menu-open');
    menuToggleBtn.setAttribute('aria-expanded', 'false');
  });
});

// Scroll to top functionality
const brandLink = document.querySelector('.brand');
if (brandLink && brandLink.dataset.scrollTop === 'true') {
  brandLink.addEventListener('click', (e) => {
    if (brandLink.getAttribute('href') === '#') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
}

// Initialize theme on page load
initTheme();

// Draw iridescent canvas if present
const iridescentCanvas = document.getElementById('iridescent-canvas');
if (iridescentCanvas) {
  const ctx = iridescentCanvas.getContext('2d');
  const container = iridescentCanvas.parentElement;

  function resizeCanvas() {
    iridescentCanvas.width = container.offsetWidth;
    iridescentCanvas.height = container.offsetHeight;
  }

  function drawIridescent() {
    const width = iridescentCanvas.width;
    const height = iridescentCanvas.height;

    // Clear canvas
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillRect(0, 0, width, height);

    // Draw iridescent gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, 'rgba(18, 179, 166, 0.1)');
    gradient.addColorStop(0.5, 'rgba(18, 179, 166, 0.05)');
    gradient.addColorStop(1, 'rgba(18, 179, 166, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  resizeCanvas();
  drawIridescent();

  window.addEventListener('resize', () => {
    resizeCanvas();
    drawIridescent();
  });
}

// Draw beam canvas if present
const beamCanvas = document.getElementById('beam-canvas');
if (beamCanvas) {
  const ctx = beamCanvas.getContext('2d');
  const container = beamCanvas.parentElement;

  function resizeBeamCanvas() {
    beamCanvas.width = container.offsetWidth;
    beamCanvas.height = container.offsetHeight;
  }

  function drawBeam() {
    const width = beamCanvas.width;
    const height = beamCanvas.height;

    // Clear canvas
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillRect(0, 0, width, height);

    // Draw beam effect
    const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height));
    gradient.addColorStop(0, 'rgba(18, 179, 166, 0.15)');
    gradient.addColorStop(0.5, 'rgba(18, 179, 166, 0.05)');
    gradient.addColorStop(1, 'rgba(18, 179, 166, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  resizeBeamCanvas();
  drawBeam();

  window.addEventListener('resize', () => {
    resizeBeamCanvas();
    drawBeam();
  });
}

// Hero section background fade in
const heroBg = document.getElementById('hero-three');
if (heroBg) {
  setTimeout(() => {
    heroBg.classList.add('loaded');
  }, 100);
}

// Fade in hero content
const heroSubtitle = document.getElementById('hero-subtitle');
const heroCta = document.getElementById('hero-cta');

if (heroSubtitle) {
  setTimeout(() => {
    heroSubtitle.style.opacity = '1';
    heroSubtitle.style.transition = 'opacity 1s ease-out';
  }, 200);
}

if (heroCta) {
  setTimeout(() => {
    heroCta.style.opacity = '1';
    heroCta.style.transition = 'opacity 1s ease-out';
  }, 400);
}
