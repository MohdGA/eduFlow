import { Injectable, OnDestroy } from '@angular/core';
import Lenis from 'lenis';

/**
 * Lenis-powered butter-smooth scrolling.
 * Hooks into rAF so it composes cleanly with GSAP/Three.js render loops.
 */
@Injectable({ providedIn: 'root' })
export class SmoothScrollService implements OnDestroy {
  private lenis?: Lenis;
  private rafId = 0;

  init(): void {
    if (this.lenis || typeof window === 'undefined') return;
    this.lenis = new Lenis({
      duration: 1.15,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 2,
      wheelMultiplier: 1,
    });
    const tick = (time: number) => {
      this.lenis?.raf(time);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  scrollTo(target: number | string | HTMLElement): void { this.lenis?.scrollTo(target); }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.rafId);
    this.lenis?.destroy();
  }
}
