import ShaderBackground from "./shader-background.js";

let slides = [];
let totalSlides = 0;
let currentSlide = 1;
let shaderInstance = null;
let footerVisible = true;

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

  if (state.prevBtn) {
    state.prevBtn.disabled = currentSlide === 1;
  }

  if (state.nextBtn) {
    state.nextBtn.disabled = currentSlide === totalSlides;
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
  showSlide(currentSlide + delta);
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
    case "End":
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

