import { Directive, ElementRef, HostListener, inject, input } from '@angular/core';

/**
 * Magnetic hover effect — element pulls toward cursor.
 * Award-winning sites use this on CTAs and important interactive elements.
 *
 * Usage: <button appMagnetic [strength]="0.4">...</button>
 */
@Directive({
  selector: '[appMagnetic]',
  standalone: true,
})
export class MagneticDirective {
  private readonly el = inject(ElementRef<HTMLElement>);

  /** How strongly the element follows the cursor (0..1). */
  readonly strength = input<number>(0.35);

  private rafId = 0;

  @HostListener('mousemove', ['$event'])
  onMove(e: MouseEvent): void {
    const node = this.el.nativeElement;
    const rect = node.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width  / 2;
    const y = e.clientY - rect.top  - rect.height / 2;
    const s = this.strength();
    cancelAnimationFrame(this.rafId);
    this.rafId = requestAnimationFrame(() => {
      node.style.transform = `translate3d(${(x * s).toFixed(2)}px, ${(y * s).toFixed(2)}px, 0)`;
    });
  }

  @HostListener('mouseleave')
  onLeave(): void {
    cancelAnimationFrame(this.rafId);
    const node = this.el.nativeElement;
    node.style.transition = 'transform .55s cubic-bezier(.16,1,.3,1)';
    node.style.transform  = 'translate3d(0,0,0)';
    setTimeout(() => { node.style.transition = ''; }, 600);
  }
}
