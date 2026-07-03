'use client';

const SCROLL_DURATION_MS = 750;

function easeInOutCubic(progress) {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

function animateScrollTo(targetTop, onComplete) {
  const startTop = window.scrollY;
  const distance = targetTop - startTop;
  const startTime = performance.now();

  function step(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / SCROLL_DURATION_MS, 1);
    const nextTop = startTop + distance * easeInOutCubic(progress);

    window.scrollTo(0, nextTop);

    if (progress < 1) {
      window.requestAnimationFrame(step);
      return;
    }

    onComplete?.();
  }

  window.requestAnimationFrame(step);
}

export function scrollToPricingSection() {
  const pricingSection = document.getElementById('pricing');

  if (!pricingSection) return;

  const targetTop = pricingSection.getBoundingClientRect().top + window.scrollY;

  animateScrollTo(targetTop, () => {
    if (window.location.hash !== '#pricing') {
      window.history.pushState(null, '', '#pricing');
    }
  });
}

export default function ComparePlansButton({ className = '', children = 'Compare plans' }) {
  return (
    <button
      type="button"
      onClick={scrollToPricingSection}
      className={className}
    >
      {children}
    </button>
  );
}
