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
let touchHandled = false; // Flag to prevent click after touch

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

function handleClick(event) {
  // Ignore if this was already handled by a touch event
  if (touchHandled) {
    return;
  }
  
  // Check if we clicked on a button, link, or navigation area
  const target = event.target;
  const isClickable = target.closest('button, a, input, textarea, select, .navigation');
  
  // Don't interfere with clickable elements or navigation
  if (isClickable) {
    return;
  }
  
  // Only handle clicks on slide content
  const isOnSlide = target.closest('.slide');
  if (!isOnSlide) {
    return;
  }
  
  // Determine which side of screen was clicked
  const screenWidth = window.innerWidth;
  const clickX = event.clientX;
  const isLeftSide = clickX < screenWidth / 2;
  
  // Navigate based on side
  if (isLeftSide) {
    changeSlide(-1); // Left side = previous
  } else {
    changeSlide(1);  // Right side = next
  }
}

function handleTouchStart(event) {
  // Cancel any pending tap timeout
  if (tapTimeout) {
    clearTimeout(tapTimeout);
    tapTimeout = null;
  }

  touchHandled = false; // Reset flag
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
  if (!touch) {
    return;
  }

  const deltaX = Math.abs(touch.clientX - touchStartX);
  const deltaY = Math.abs(touch.clientY - touchStartY);

  // Only prevent default if it's clearly a horizontal swipe (prevents page scroll)
  // Use a threshold to distinguish between scrolling and swiping
  if (deltaX > deltaY && deltaX > 15) {
    event.preventDefault();
  }
}

function handleTouchEnd(event) {
  if (touchStartX === null) {
    return;
  }

  const touch = event.changedTouches[0];
  if (!touch) {
    // Reset touch state
    touchStartX = null;
    touchStartY = null;
    touchEndX = null;
    touchEndY = null;
    return;
  }

  touchEndX = touch.clientX;
  touchEndY = touch.clientY;

  const deltaX = touchEndX - touchStartX;
  const deltaY = touchEndY - touchStartY;
  const absDeltaX = Math.abs(deltaX);
  const absDeltaY = Math.abs(deltaY);

  // Check if we clicked on a button or link first
  const target = event.target;
  const isClickable = target.closest('button, a, input, textarea, select');

  // Check if it's a horizontal swipe (more horizontal than vertical)
  // Reduced threshold for easier triggering on mobile
  if (absDeltaX > absDeltaY && absDeltaX > 40 && !isClickable) {
    // Swipe left = next slide
    if (deltaX < 0) {
      event.preventDefault();
      touchHandled = true;
      changeSlide(1);
    }
    // Swipe right = previous slide
    else if (deltaX > 0) {
      event.preventDefault();
      touchHandled = true;
      changeSlide(-1);
    }
  }
  // Check if it's a tap (small movement)
  // Increased threshold slightly to allow for natural finger movement
  else if (absDeltaX < 40 && absDeltaY < 40 && !isClickable) {
    // Tap to navigate based on screen position
    const currentTime = Date.now();
    const timeDiff = currentTime - lastTapTime;
    
    // Clear any pending tap timeout
    if (tapTimeout) {
      clearTimeout(tapTimeout);
      tapTimeout = null;
    }
    
    // If double tap (within 300ms), do nothing (user might be zooming)
    if (timeDiff < 300 && timeDiff > 0) {
      lastTapTime = 0;
      return;
    }
    
    // Determine which side of screen was tapped
    const screenWidth = window.innerWidth;
    const tapX = touchEndX;
    const isLeftSide = tapX < screenWidth / 2;
    
    // Single tap - navigate based on side after a short delay
    tapTimeout = setTimeout(() => {
      touchHandled = true;
      if (isLeftSide) {
        changeSlide(-1); // Left side = previous
      } else {
        changeSlide(1);  // Right side = next
      }
      tapTimeout = null;
      // Reset flag after a delay to allow click events later
      setTimeout(() => {
        touchHandled = false;
      }, 300);
    }, 100);
    
    lastTapTime = currentTime;
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
  // Attach to both container and individual slides for better coverage
  const handleTouchCancel = () => {
    // Reset touch state on cancel
    touchStartX = null;
    touchStartY = null;
    touchEndX = null;
    touchEndY = null;
    if (tapTimeout) {
      clearTimeout(tapTimeout);
      tapTimeout = null;
    }
  };

  // Attach touch events to container
  if (state.container) {
    state.container.addEventListener("touchstart", handleTouchStart, { passive: true });
    state.container.addEventListener("touchmove", handleTouchMove, { passive: false });
    state.container.addEventListener("touchend", handleTouchEnd, { passive: true });
    state.container.addEventListener("touchcancel", handleTouchCancel, { passive: true });
  }
  
  // Also attach to each slide for better touch detection
  slides.forEach((slide) => {
    slide.addEventListener("touchstart", handleTouchStart, { passive: true });
    slide.addEventListener("touchmove", handleTouchMove, { passive: false });
    slide.addEventListener("touchend", handleTouchEnd, { passive: true });
    slide.addEventListener("touchcancel", handleTouchCancel, { passive: true });
  });

  // Add click handler to container for desktop (events bubble from slides)
  if (state.container) {
    state.container.addEventListener("click", handleClick);
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

