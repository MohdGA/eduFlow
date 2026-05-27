import { Directive, ElementRef, HostListener, inject, input } from '@angular/core';

/**
 * Mouse-tracking 3D tilt directive.
 * Applies perspective rotation based on cursor position relative to the element.
 *
 * Usage: <div appTilt3d [maxTilt]="12">...</div>
 */
@Directive({
  selector: '[appTilt3d]',
  standalone: true,
})
export class Tilt3dDirective {
  private readonly el = inject(ElementRef<HTMLElement>);

  /** Maximum tilt angle in degrees on each axis. */
  readonly maxTilt = input<number>(10);
  /** How far the card "lifts" toward the viewer on hover. */
  readonly translateZ = input<number>(20);
  /** Glare intensity from 0 (off) to 1 (strong). */
  readonly glare = input<number>(0.15);

  private rafId = 0;

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    const node = this.el.nativeElement;
    const rect = node.getBoundingClientRect();

    const x = (event.clientX - rect.left) / rect.width;   // 0..1
    const y = (event.clientY - rect.top)  / rect.height;  // 0..1

    const maxTilt = this.maxTilt();
    const rotateY = (x - 0.5) * 2 * maxTilt;     // -max..+max
    const rotateX = -(y - 0.5) * 2 * maxTilt;

    cancelAnimationFrame(this.rafId);
    this.rafId = requestAnimationFrame(() => {
      node.style.transform =
        `perspective(1200px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateZ(${this.translateZ()}px)`;

      const glareOpacity = this.glare();
      if (glareOpacity > 0) {
        node.style.setProperty('--tilt-glare-x', `${(x * 100).toFixed(1)}%`);
        node.style.setProperty('--tilt-glare-y', `${(y * 100).toFixed(1)}%`);
        node.style.setProperty('--tilt-glare-opacity', `${glareOpacity}`);
      }
    });
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    cancelAnimationFrame(this.rafId);
    const node = this.el.nativeElement;
    node.style.transform = '';
    node.style.setProperty('--tilt-glare-opacity', '0');
  }
}
