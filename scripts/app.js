import ShaderBackground from "./shader-background.js";

let slides = [];
let totalSlides = 0;
let currentSlide = 1;
let shaderInstance = null;
let footerVisible = true;

// Touch/swipe state
let touchStartX = null;
let touchStartY = null;
let touchEndX = null;
let touchEndY = null;
let lastTapTime = 0;
let tapTimeout = null;

const state = {
  currentIndicator: null,
  totalIndicator: null,
  prevBtn: null,
  nextBtn: null,
  footer: null,
  container: null,
};

function updateIndicators() {
  if (state.currentIndicator) {
    state.currentIndicator.textContent = String(currentSlide);
  }

  // Prev button is always enabled (wraps to last slide when on slide 1)
  if (state.prevBtn) {
    state.prevBtn.disabled = false;
  }

  // Next button is always enabled (wraps to first slide when on last slide)
  if (state.nextBtn) {
    state.nextBtn.disabled = false;
  }
}

function showSlide(target) {
  if (!slides.length) {
    return;
  }

  if (target < 1) {
    currentSlide = 1;
  } else if (target > totalSlides) {
    currentSlide = totalSlides;
  } else {
    currentSlide = target;
  }

  slides.forEach((slide) => slide.classList.remove("active"));
  const activeSlide = slides[currentSlide - 1];

  if (activeSlide) {
    activeSlide.classList.add("active");
    activeSlide.scrollTop = 0;
  }

  updateIndicators();
}

function changeSlide(delta) {
  let target = currentSlide + delta;
  
  // Wrap around: if going back from slide 1, go to last slide
  if (target < 1) {
    target = totalSlides;
  }
  // Wrap around: if going forward from last slide, go to slide 1
  else if (target > totalSlides) {
    target = 1;
  }
  
  showSlide(target);
}

function goToSlide(target) {
  showSlide(target);
}

function handleKeydown(event) {
  switch (event.key) {
    case "ArrowRight":
    case " ":
      event.preventDefault();
      changeSlide(1);
      break;
    case "ArrowLeft":
      event.preventDefault();
      changeSlide(-1);
      break;
    case "Home":
      event.preventDefault();
      goToSlide(1);
      break;
    case "e":
    case "E":
      event.preventDefault();
      goToSlide(totalSlides);
      break;
    case "h":
    case "H":
      event.preventDefault();
      toggleFooter();
      break;
    default:
      break;
  }
}

function setFooterVisibility(visible) {
  footerVisible = visible;

  if (state.footer) {
    state.footer.classList.toggle("is-hidden", !visible);
    state.footer.setAttribute("aria-hidden", visible ? "false" : "true");
  }

  if (state.container) {
    state.container.classList.toggle("footer-hidden", !visible);
  }
}

function toggleFooter() {
  setFooterVisibility(!footerVisible);
}

function handleTouchStart(event) {
  // Cancel any pending tap timeout
  if (tapTimeout) {
    clearTimeout(tapTimeout);
    tapTimeout = null;
  }

  const touch = event.touches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
  touchEndX = null;
  touchEndY = null;
}

function handleTouchMove(event) {
  if (touchStartX === null) {
    return;
  }

  const touch = event.touches[0];
  const deltaX = Math.abs(touch.clientX - touchStartX);
  const deltaY = Math.abs(touch.clientY - touchStartY);

  // Only prevent default if it's a horizontal swipe (prevents page scroll)
  if (deltaX > deltaY && deltaX > 10) {
    event.preventDefault();
  }
}

function handleTouchEnd(event) {
  if (touchStartX === null) {
    return;
  }

  const touch = event.changedTouches[0];
  touchEndX = touch.clientX;
  touchEndY = touch.clientY;

  const deltaX = touchEndX - touchStartX;
  const deltaY = touchEndY - touchStartY;
  const absDeltaX = Math.abs(deltaX);
  const absDeltaY = Math.abs(deltaY);

  // Check if it's a horizontal swipe (more horizontal than vertical)
  if (absDeltaX > absDeltaY && absDeltaX > 50) {
    // Swipe left = next slide
    if (deltaX < 0) {
      changeSlide(1);
    }
    // Swipe right = previous slide
    else if (deltaX > 0) {
      changeSlide(-1);
    }
  }
  // Check if it's a tap (small movement)
  else if (absDeltaX < 30 && absDeltaY < 30) {
    // Check if we clicked on a button or link
    const target = event.target;
    const isClickable = target.closest('button, a, input, textarea, select');
    
    if (!isClickable) {
      // Tap to advance - only if not on a clickable element
      const currentTime = Date.now();
      const timeDiff = currentTime - lastTapTime;
      
      // Clear any pending tap timeout
      if (tapTimeout) {
        clearTimeout(tapTimeout);
      }
      
      // If double tap (within 300ms), do nothing (user might be zooming)
      if (timeDiff < 300) {
        lastTapTime = 0;
        return;
      }
      
      // Single tap - advance after a short delay to avoid accidental taps
      tapTimeout = setTimeout(() => {
        changeSlide(1);
      }, 100);
      
      lastTapTime = currentTime;
    }
  }

  // Reset touch state
  touchStartX = null;
  touchStartY = null;
  touchEndX = null;
  touchEndY = null;
}

function initShader() {
  const container = document.getElementById("shader-background");

  if (!container) {
    return;
  }

  shaderInstance = new ShaderBackground(container);
  window.__presentationShader = shaderInstance;
}

function initNavigation() {
  slides = Array.from(document.querySelectorAll(".slide"));
  totalSlides = slides.length;

  if (!totalSlides) {
    return;
  }

  const firstActive = slides.findIndex((slide) => slide.classList.contains("active"));
  currentSlide = firstActive >= 0 ? firstActive + 1 : 1;

  state.container = document.querySelector(".presentation-container");
  state.currentIndicator = document.getElementById("currentSlide");
  state.totalIndicator = document.getElementById("totalSlides");
  state.prevBtn = document.getElementById("prevBtn");
  state.nextBtn = document.getElementById("nextBtn");
  state.footer = document.querySelector(".navigation");

  const resetBtn = document.getElementById("resetBtn");

  if (state.totalIndicator) {
    state.totalIndicator.textContent = String(totalSlides);
  }

  state.prevBtn?.addEventListener("click", () => changeSlide(-1));
  state.nextBtn?.addEventListener("click", () => changeSlide(1));
  resetBtn?.addEventListener("click", () => goToSlide(1));

  document.addEventListener("keydown", handleKeydown);

  // Add touch event listeners for mobile swipe and tap
  if (state.container) {
    state.container.addEventListener("touchstart", handleTouchStart, { passive: true });
    state.container.addEventListener("touchmove", handleTouchMove, { passive: false });
    state.container.addEventListener("touchend", handleTouchEnd, { passive: true });
  }

  setFooterVisibility(true);
  showSlide(currentSlide);
}

function init() {
  initShader();
  initNavigation();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}

export { changeSlide, goToSlide, showSlide };

