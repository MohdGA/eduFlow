import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';

/**
 * Custom cursor — a small dot follows the pointer instantly,
 * a larger circle trails it with easing, and expands on hover targets.
 * Hidden on touch devices.
 */
@Component({
  selector: 'app-cursor',
  standalone: true,
  template: `
    <div class="cursor-dot"  [style.transform]="dotTransform"></div>
    <div class="cursor-ring" [class.is-hover]="hovering" [style.transform]="ringTransform"></div>
  `,
  styles: [`
    :host {
      position: fixed; inset: 0; pointer-events: none; z-index: 9999;
      mix-blend-mode: difference;
    }
    @media (hover: none) { :host { display: none; } }

    .cursor-dot, .cursor-ring {
      position: fixed; top: 0; left: 0;
      pointer-events: none;
      border-radius: 99px;
      will-change: transform;
    }
    .cursor-dot {
      width: 6px; height: 6px;
      background: #FFFFFF;
      margin-left: -3px; margin-top: -3px;
    }
    .cursor-ring {
      width: 36px; height: 36px;
      border: 1.5px solid rgba(255,255,255,0.85);
      margin-left: -18px; margin-top: -18px;
      transition: width .25s cubic-bezier(.16,1,.3,1),
                  height .25s cubic-bezier(.16,1,.3,1),
                  border-color .2s, background .2s;
    }
    .cursor-ring.is-hover {
      width: 64px; height: 64px;
      margin-left: -32px; margin-top: -32px;
      background: rgba(255,255,255,0.18);
      border-color: rgba(255,255,255,0.0);
    }
  `]
})
export class CursorComponent implements OnInit, OnDestroy {
  dotTransform = 'translate3d(-100px,-100px,0)';
  ringTransform = 'translate3d(-100px,-100px,0)';
  hovering = false;

  private dotX = -100; private dotY = -100;
  private ringX = -100; private ringY = -100;
  private targetX = -100; private targetY = -100;
  private rafId = 0;

  ngOnInit(): void {
    this.loop = this.loop.bind(this);
    this.rafId = requestAnimationFrame(this.loop);
  }
  ngOnDestroy(): void { cancelAnimationFrame(this.rafId); }

  @HostListener('document:mousemove', ['$event'])
  onMove(e: MouseEvent): void {
    this.targetX = e.clientX; this.targetY = e.clientY;
    const t = e.target as HTMLElement | null;
    this.hovering = !!(t && (t.closest('a,button,input,select,textarea,[role="button"],[appMagnetic]')));
  }

  private loop(): void {
    // Dot follows instantly, ring eases (1-pole low pass)
    this.dotX = this.targetX; this.dotY = this.targetY;
    this.ringX += (this.targetX - this.ringX) * 0.18;
    this.ringY += (this.targetY - this.ringY) * 0.18;
    this.dotTransform  = `translate3d(${this.dotX.toFixed(2)}px, ${this.dotY.toFixed(2)}px, 0)`;
    this.ringTransform = `translate3d(${this.ringX.toFixed(2)}px, ${this.ringY.toFixed(2)}px, 0)`;
    this.rafId = requestAnimationFrame(this.loop);
  }
}
