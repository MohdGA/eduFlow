import { Directive, ElementRef, inject, input, OnDestroy, OnInit } from '@angular/core';

/**
 * Reveals an element with a soft fade+rise once it enters the viewport.
 * Powered by IntersectionObserver — efficient, no scroll listeners.
 *
 * Usage:
 *   <div appScrollReveal>...</div>
 *   <div appScrollReveal [delay]="0.2" [variant]="'slide-left'">...</div>
 */
@Directive({
  selector: '[appScrollReveal]',
  standalone: true,
})
export class ScrollRevealDirective implements OnInit, OnDestroy {
  private readonly el = inject(ElementRef<HTMLElement>);

  readonly delay   = input<number>(0);          // seconds
  readonly variant = input<'fade-up' | 'fade' | 'slide-left' | 'slide-right' | 'scale'>('fade-up');
  readonly threshold = input<number>(0.12);

  private observer?: IntersectionObserver;

  ngOnInit(): void {
    const node = this.el.nativeElement;
    node.classList.add('reveal', 'reveal--' + this.variant());
    if (this.delay()) node.style.setProperty('--reveal-delay', this.delay() + 's');

    this.observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          (entry.target as HTMLElement).classList.add('is-revealed');
          this.observer?.unobserve(entry.target);
        }
      }
    }, { threshold: this.threshold(), rootMargin: '0px 0px -10% 0px' });

    this.observer.observe(node);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
