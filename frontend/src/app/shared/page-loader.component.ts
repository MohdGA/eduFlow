import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Branded loading screen — covers the page for the first ~1.4s,
 * then slides up out of view revealing the app.
 */
@Component({
  selector: 'app-page-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (visible()) {
      <div class="loader" [class.is-out]="leaving()">
        <div class="loader-inner">
          <div class="logo-3d">
            <span class="cube-face f-front">E</span>
            <span class="cube-face f-back">E</span>
            <span class="cube-face f-right">E</span>
            <span class="cube-face f-left">E</span>
            <span class="cube-face f-top">E</span>
            <span class="cube-face f-bottom">E</span>
          </div>
          <p class="logo-name">EduFlow</p>
          <div class="loader-bar">
            <div class="loader-fill" [style.width.%]="progress()"></div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .loader {
      position: fixed; inset: 0; z-index: 10000;
      background: radial-gradient(ellipse at center, #1A0E3A 0%, #0A0518 100%);
      display: flex; align-items: center; justify-content: center;
      transition: transform .9s cubic-bezier(.7,0,.2,1), opacity .6s ease .3s;
    }
    .loader.is-out { transform: translateY(-105%); opacity: 0; }

    .loader-inner { text-align: center; perspective: 800px; }
    .logo-3d {
      width: 60px; height: 60px; position: relative; margin: 0 auto 18px;
      transform-style: preserve-3d;
      animation: logoSpin 2.2s linear infinite;
    }
    @keyframes logoSpin {
      0%   { transform: rotateX(-15deg) rotateY(0); }
      100% { transform: rotateX(-15deg) rotateY(360deg); }
    }
    .cube-face {
      position: absolute; inset: 0;
      display: flex; align-items: center; justify-content: center;
      border: 1px solid rgba(255,255,255,0.18);
      background: linear-gradient(135deg, #7C3AED, #3B82F6);
      box-shadow: inset 0 -8px 16px rgba(0,0,0,0.25), 0 8px 24px rgba(124,58,237,0.4);
      color: #fff; font-weight: 900; font-size: 22px;
      border-radius: 8px;
    }
    .f-front  { transform: translateZ(30px); }
    .f-back   { transform: rotateY(180deg) translateZ(30px); }
    .f-right  { transform: rotateY(90deg)  translateZ(30px); background: linear-gradient(135deg,#3B82F6,#06B6D4); }
    .f-left   { transform: rotateY(-90deg) translateZ(30px); background: linear-gradient(135deg,#EC4899,#7C3AED); }
    .f-top    { transform: rotateX(90deg)  translateZ(30px); background: linear-gradient(135deg,#F59E0B,#EF4444); }
    .f-bottom { transform: rotateX(-90deg) translateZ(30px); background: linear-gradient(135deg,#10B981,#06B6D4); }

    .logo-name {
      font-size: 22px; font-weight: 900; color: #fff; margin: 0 0 14px;
      letter-spacing: 1px;
      background: linear-gradient(90deg, #A78BFA, #60A5FA);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    }
    .loader-bar {
      width: 160px; height: 3px; border-radius: 99px;
      background: rgba(255,255,255,0.12); overflow: hidden;
      margin: 0 auto;
    }
    .loader-fill {
      height: 100%; border-radius: 99px;
      background: linear-gradient(90deg, #7C3AED, #3B82F6);
      box-shadow: 0 0 12px rgba(124,58,237,0.7);
      transition: width .15s linear;
    }
  `]
})
export class PageLoaderComponent implements OnInit {
  visible  = signal(true);
  leaving  = signal(false);
  progress = signal(0);

  ngOnInit(): void {
    const total = 1300;
    const step = 30;
    const tick = setInterval(() => {
      this.progress.update(p => Math.min(100, p + (100 / (total / step))));
    }, step);

    setTimeout(() => {
      clearInterval(tick);
      this.progress.set(100);
      this.leaving.set(true);
      setTimeout(() => this.visible.set(false), 900);
    }, total);
  }
}
