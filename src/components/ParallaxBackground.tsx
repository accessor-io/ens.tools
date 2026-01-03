import { useEffect } from 'react';

export function ParallaxBackground() {
  useEffect(() => {
    let rafId: number | null = null;
    let lastScrollY = window.scrollY;

    const updateParallax = () => {
      const scrollY = window.scrollY;

      // Only update if scroll position changed significantly
      if (Math.abs(scrollY - lastScrollY) > 0.5) {
        const parallaxOffset = scrollY * 0.2;
        document.documentElement.style.setProperty("--bg-scroll-y", `${parallaxOffset}px`);
        lastScrollY = scrollY;
      }

      // Allow new rAF to be scheduled on the next scroll event
      rafId = null;
    };

    const handleScroll = () => {
      if (rafId === null) {
        rafId = window.requestAnimationFrame(updateParallax);
      }
    };

    // Initial sync with current scroll position
    updateParallax();

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, []);

  return null;
}
