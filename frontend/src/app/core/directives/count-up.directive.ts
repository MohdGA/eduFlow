import { Directive, ElementRef, inject, input, OnDestroy, OnInit } from '@angular/core';

/**
 * Animated number counter — increments from 0 to target when scrolled into view.
 *
 * Usage:
 *   <span appCountUp [end]="84300" [duration]="2"></span>
 *   <span appCountUp [end]="4.8" [decimals]="1" [suffix]="' ★'"></span>
 */
@Directive({
  selector: '[appCountUp]',
  standalone: true,
})
export class CountUpDirective implements OnInit, OnDestroy {
  private readonly el = inject(ElementRef<HTMLElement>);

  readonly end      = input.required<number>();
  readonly duration = input<number>(1.6);       // seconds
  readonly decimals = input<number>(0);
  readonly prefix   = input<string>('');
  readonly suffix   = input<string>('');
  readonly separator = input<string>(',');

  private observer?: IntersectionObserver;
  private started = false;

  ngOnInit(): void {
    const node = this.el.nativeElement;
    node.textContent = this.format(0);
    this.observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !this.started) {
        this.started = true;
        this.animate();
        this.observer?.disconnect();
      }
    }, { threshold: 0.3 });
    this.observer.observe(node);
  }

  ngOnDestroy(): void { this.observer?.disconnect(); }

  private animate(): void {
    const target = this.end();
    const duration = this.duration() * 1000;
    const startTime = performance.now();
    const node = this.el.nativeElement;

    const step = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      // ease-out cubic — feels snappy
      const eased = 1 - Math.pow(1 - t, 3);
      const value = target * eased;
      node.textContent = this.format(value);
      if (t < 1) requestAnimationFrame(step);
      else node.textContent = this.format(target);
    };
    requestAnimationFrame(step);
  }

  private format(n: number): string {
    const decimals = this.decimals();
    const fixed = n.toFixed(decimals);
    const [intPart, decPart] = fixed.split('.');
    const sep = this.separator();
    const withSep = sep ? intPart.replace(/\B(?=(\d{3})+(?!\d))/g, sep) : intPart;
    const num = decPart ? `${withSep}.${decPart}` : withSep;
    return `${this.prefix()}${num}${this.suffix()}`;
  }
}
