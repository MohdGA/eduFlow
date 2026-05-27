import { Component, signal, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

interface Particle { id: number; x: number; y: number; size: number; delay: number; duration: number; }

@Component({
  selector: 'app-journey',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatButtonModule],
  template: `
  <div class="journey-wrap" (mousemove)="onMouseMove($event)">

    <!-- ═══ Ambient backdrop ═══ -->
    <div class="bg">
      <div class="bg-blob bb1"></div>
      <div class="bg-blob bb2"></div>
      <div class="bg-blob bb3"></div>
    </div>

    <!-- ═══ Animated grid floor (perspective) ═══ -->
    <div class="grid-floor" [style.transform]="parallax(-10, -4)">
      <div class="grid-lines"></div>
    </div>

    <!-- ═══ Particle field ═══ -->
    @for (p of particles(); track p.id) {
      <div class="particle"
           [style.left.%]="p.x" [style.top.%]="p.y"
           [style.width.px]="p.size" [style.height.px]="p.size"
           [style.animation-delay.s]="p.delay"
           [style.animation-duration.s]="p.duration"></div>
    }

    <!-- ═══ 3D Stage (the vibe) ═══ -->
    <div class="stage-3d" [style.transform]="parallax(14, 6)">

      <!-- ─── Central rotating cube ─── -->
      <div class="cube-container">
        <div class="cube-ring r-outer"></div>
        <div class="cube-ring r-inner"></div>

        <div class="cube">
          <div class="cube-face cf-front"><span class="cf-symbol">⚡</span><span class="cf-label">Code</span></div>
          <div class="cube-face cf-back"><span class="cf-symbol">🎨</span><span class="cf-label">Design</span></div>
          <div class="cube-face cf-right"><span class="cf-symbol">📊</span><span class="cf-label">Data</span></div>
          <div class="cube-face cf-left"><span class="cf-symbol">☁️</span><span class="cf-label">Cloud</span></div>
          <div class="cube-face cf-top"><span class="cf-symbol">🚀</span><span class="cf-label">AI</span></div>
          <div class="cube-face cf-bottom"><span class="cf-symbol">📚</span><span class="cf-label">Learn</span></div>
        </div>

        <div class="cube-shadow"></div>
      </div>

      <!-- ─── Orbiting 3D shapes ─── -->
      <div class="orbit orbit-1">
        <div class="orbit-item">
          <div class="shape-sphere"></div>
        </div>
      </div>

      <div class="orbit orbit-2">
        <div class="orbit-item">
          <div class="shape-pyramid">
            <span class="face f1"></span>
            <span class="face f2"></span>
            <span class="face f3"></span>
            <span class="face f4"></span>
          </div>
        </div>
      </div>

      <div class="orbit orbit-3">
        <div class="orbit-item">
          <div class="shape-torus"></div>
        </div>
      </div>

      <div class="orbit orbit-4">
        <div class="orbit-item">
          <div class="shape-mini-cube">
            <span class="mc-face mc-front"></span>
            <span class="mc-face mc-back"></span>
            <span class="mc-face mc-right"></span>
            <span class="mc-face mc-left"></span>
            <span class="mc-face mc-top"></span>
            <span class="mc-face mc-bottom"></span>
          </div>
        </div>
      </div>

      <div class="orbit orbit-5">
        <div class="orbit-item">
          <div class="shape-diamond"></div>
        </div>
      </div>

    </div>

    <!-- ═══ HUD overlay ═══ -->
    <div class="hud">

      <div class="hud-tl">
        <p class="hud-chapter">CHAPTER 7 · {{ today }}</p>
        <h1 class="hud-title">Your Learning <span class="gradient-text">Journey</span></h1>
        <p class="hud-sub">"Every master was once a beginner."</p>
      </div>

      <div class="hud-bl">
        <div class="stat-bar">
          <div class="stat-row">
            <span class="stat-icon">⚡</span>
            <div class="stat-info">
              <p class="stat-label">XP</p>
              <div class="bar"><div class="bar-fill xp" style="width:72%"></div></div>
              <p class="stat-val">7,240 / 10,000</p>
            </div>
          </div>
          <div class="stat-row">
            <span class="stat-icon">📚</span>
            <div class="stat-info">
              <p class="stat-label">Knowledge</p>
              <div class="bar"><div class="bar-fill know" style="width:54%"></div></div>
              <p class="stat-val">Level 14</p>
            </div>
          </div>
          <div class="stat-row">
            <span class="stat-icon">🔥</span>
            <div class="stat-info">
              <p class="stat-label">Focus Streak</p>
              <div class="bar"><div class="bar-fill streak" style="width:87%"></div></div>
              <p class="stat-val">7 days</p>
            </div>
          </div>
        </div>
      </div>

      <div class="hud-tr">
        <div class="quest-card">
          <div class="quest-head">
            <span class="quest-dot"></span>
            <span class="quest-tag">ACTIVE QUEST</span>
          </div>
          <p class="quest-title">Complete React Hooks chapter</p>
          <div class="quest-meta">
            <span>3/5 lessons</span>
            <div class="bar mini"><div class="bar-fill xp" style="width:60%"></div></div>
            <span class="quest-reward">+250 XP</span>
          </div>
        </div>
        <div class="quest-card secondary">
          <div class="quest-head">
            <span class="quest-dot blue"></span>
            <span class="quest-tag">UPCOMING</span>
          </div>
          <p class="quest-title">Build first portfolio project</p>
          <span class="quest-reward small">+1000 XP · Badge</span>
        </div>
      </div>

      <div class="hud-br">
        <a routerLink="/my-courses" class="cta-button">
          <span class="cta-glow"></span>
          <mat-icon>auto_awesome</mat-icon>
          <span class="cta-text">Continue Adventure</span>
          <mat-icon class="cta-arrow">arrow_forward</mat-icon>
        </a>
      </div>

    </div>

  </div>
  `,
  styles: [`
    /* ═══════════════════════════════════════════
       JOURNEY — 3D vibe dashboard
       ═══════════════════════════════════════════ */
    .journey-wrap {
      position:relative; height: calc(100vh - var(--lms-topnav-h));
      overflow:hidden;
      background:
        radial-gradient(ellipse at top, #1A0E3A 0%, #0A0518 60%, #050410 100%);
      perspective: 1500px;
    }

    /* ── Backdrop nebula blobs ── */
    .bg { position:absolute; inset:0; }
    .bg-blob {
      position:absolute; border-radius:99px;
      filter:blur(80px); mix-blend-mode:screen;
    }
    .bb1 { width:700px; height:700px; background:rgba(124,58,237,.35); top:-200px; left:-150px;
           animation: nebDrift 22s ease-in-out infinite; }
    .bb2 { width:550px; height:550px; background:rgba(59,130,246,.3); bottom:-150px; right:-150px;
           animation: nebDrift 26s ease-in-out infinite reverse; }
    .bb3 { width:400px; height:400px; background:rgba(236,72,153,.22); top:30%; right:35%;
           animation: nebDrift 20s ease-in-out infinite; }
    @keyframes nebDrift {
      0%,100% { transform: translate(0,0) scale(1); }
      33%     { transform: translate(60px,-40px) scale(1.1); }
      66%     { transform: translate(-50px,50px) scale(.92); }
    }

    /* ── Grid floor (perspective) ── */
    .grid-floor {
      position:absolute; bottom:-10%; left:-20%; right:-20%;
      height:65%;
      transform: perspective(900px) rotateX(60deg);
      transform-origin: center top;
      will-change: transform;
      transition: transform .35s cubic-bezier(.16,1,.3,1);
    }
    .grid-lines {
      width:100%; height:100%;
      background-image:
        linear-gradient(rgba(167,139,250,.4) 1px, transparent 1px),
        linear-gradient(90deg, rgba(167,139,250,.4) 1px, transparent 1px);
      background-size: 60px 60px;
      mask: linear-gradient(180deg, transparent, black 30%, black 70%, transparent);
      animation: gridScroll 12s linear infinite;
    }
    @keyframes gridScroll {
      0%   { background-position: 0 0; }
      100% { background-position: 0 60px; }
    }

    /* ── Particles ── */
    .particle {
      position:absolute; border-radius:99px;
      background: radial-gradient(circle, #FFFFFF, transparent 70%);
      box-shadow: 0 0 12px rgba(255,255,255,.7);
      mix-blend-mode: screen;
      animation: particleFloat ease-in-out infinite;
    }
    @keyframes particleFloat {
      0%,100% { opacity:0; transform: translate(0,0) scale(.5); }
      30%,70% { opacity:.9; transform: translate(10px,-20px) scale(1); }
    }

    /* ═══════════════════════════════════════════
       3D STAGE
       ═══════════════════════════════════════════ */
    .stage-3d {
      position:absolute; left:50%; top:50%;
      transform: translate(-50%, -50%);
      width:600px; height:600px;
      transform-style: preserve-3d;
      perspective: 1000px;
      will-change: transform;
      transition: transform .35s cubic-bezier(.16,1,.3,1);
      animation: stageEntry 1.5s cubic-bezier(.16,1,.3,1) .3s both;
    }
    @keyframes stageEntry {
      0%   { opacity:0; transform: translate(-50%,-50%) scale(.85) rotateY(-30deg); }
      100% { opacity:1; transform: translate(-50%,-50%) scale(1)    rotateY(0); }
    }

    /* ── Central cube ── */
    .cube-container {
      position:absolute; top:50%; left:50%;
      width:200px; height:200px;
      transform: translate(-50%, -50%);
      transform-style: preserve-3d;
    }

    /* Outer/inner rings around cube */
    .cube-ring {
      position:absolute; left:50%; top:50%;
      border-radius: 99px;
      border: 2px solid transparent;
      background:
        conic-gradient(from 0deg, transparent, #A78BFA, transparent 30%, #3B82F6, transparent 60%, #EC4899, transparent) border-box;
      mask: linear-gradient(#000 0 0) padding-box, linear-gradient(#000 0 0);
      mask-composite: exclude;
      -webkit-mask-composite: xor;
    }
    .r-outer {
      width: 340px; height:340px;
      transform: translate(-50%,-50%) rotateX(70deg);
      animation: ringSpinX 10s linear infinite;
    }
    .r-inner {
      width: 260px; height:260px;
      transform: translate(-50%,-50%) rotateX(70deg) rotateZ(45deg);
      animation: ringSpinX 6s linear infinite reverse;
      opacity:.7;
    }
    @keyframes ringSpinX {
      from { transform: translate(-50%,-50%) rotateX(70deg) rotateZ(0); }
      to   { transform: translate(-50%,-50%) rotateX(70deg) rotateZ(360deg); }
    }

    /* The cube */
    .cube {
      position:absolute; inset:0;
      transform-style: preserve-3d;
      animation: cubeRotate 24s linear infinite;
    }
    @keyframes cubeRotate {
      0%   { transform: rotateX(-15deg) rotateY(0); }
      100% { transform: rotateX(-15deg) rotateY(360deg); }
    }
    .cube-face {
      position:absolute; inset:0;
      display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px;
      border-radius: 14px;
      border: 1px solid rgba(255,255,255,.18);
      box-shadow:
        inset 0 -25px 50px rgba(0,0,0,.3),
        inset 0 25px 50px rgba(255,255,255,.05),
        0 20px 50px rgba(0,0,0,.4);
      backdrop-filter: blur(10px);
      .cf-symbol { font-size:54px; filter:drop-shadow(0 4px 12px rgba(0,0,0,.4)); }
      .cf-label  { font-size:13px; font-weight:800; letter-spacing:1.5px; color:#fff;
                   text-shadow:0 2px 8px rgba(0,0,0,.6); text-transform:uppercase; }
    }
    .cf-front  { transform: translateZ(100px); background:linear-gradient(135deg,#7C3AED,#3B82F6); }
    .cf-back   { transform: rotateY(180deg) translateZ(100px); background:linear-gradient(135deg,#EC4899,#7C3AED); }
    .cf-right  { transform: rotateY(90deg)  translateZ(100px); background:linear-gradient(135deg,#3B82F6,#06B6D4); }
    .cf-left   { transform: rotateY(-90deg) translateZ(100px); background:linear-gradient(135deg,#06B6D4,#10B981); }
    .cf-top    { transform: rotateX(90deg)  translateZ(100px); background:linear-gradient(135deg,#F59E0B,#EF4444); }
    .cf-bottom { transform: rotateX(-90deg) translateZ(100px); background:linear-gradient(135deg,#10B981,#06B6D4); }

    .cube-shadow {
      position:absolute; bottom:-60px; left:50%;
      transform: translateX(-50%);
      width:180px; height:24px;
      background: radial-gradient(ellipse, rgba(124,58,237,.6), transparent 70%);
      filter: blur(15px);
      animation: shadowBob 24s ease-in-out infinite;
    }
    @keyframes shadowBob {
      0%,100% { width:180px; opacity:.8; }
      50%     { width:140px; opacity:.4; }
    }

    /* ═══ Orbits ═══ */
    .orbit {
      position:absolute; left:50%; top:50%;
      width:0; height:0;
      transform-origin: 0 0;
    }
    .orbit-item {
      position:absolute;
      transform-style: preserve-3d;
    }
    .orbit-1 { animation: orbitSpin 16s linear infinite; }
    .orbit-1 .orbit-item { transform: translateX(220px); animation: counterSpin1 16s linear infinite; }

    .orbit-2 { animation: orbitSpin 22s linear infinite reverse; transform: rotateX(35deg); }
    .orbit-2 .orbit-item { transform: translateX(260px); animation: counterSpin2 22s linear infinite; }

    .orbit-3 { animation: orbitSpin 28s linear infinite; transform: rotateZ(20deg); }
    .orbit-3 .orbit-item { transform: translateX(280px); animation: counterSpin3 28s linear infinite; }

    .orbit-4 { animation: orbitSpin 20s linear infinite reverse; transform: rotateY(45deg); }
    .orbit-4 .orbit-item { transform: translateX(240px); animation: counterSpin4 20s linear infinite; }

    .orbit-5 { animation: orbitSpin 18s linear infinite; transform: rotateZ(-30deg) rotateX(20deg); }
    .orbit-5 .orbit-item { transform: translateX(200px); animation: counterSpin5 18s linear infinite; }

    @keyframes orbitSpin    { to { transform: rotate(360deg); } }
    @keyframes counterSpin1 { from { transform: translateX(220px) rotate(0); }    to { transform: translateX(220px) rotate(-360deg); } }
    @keyframes counterSpin2 { from { transform: translateX(260px) rotate(0); }    to { transform: translateX(260px) rotate(360deg); } }
    @keyframes counterSpin3 { from { transform: translateX(280px) rotate(0); }    to { transform: translateX(280px) rotate(-360deg); } }
    @keyframes counterSpin4 { from { transform: translateX(240px) rotate(0); }    to { transform: translateX(240px) rotate(360deg); } }
    @keyframes counterSpin5 { from { transform: translateX(200px) rotate(0); }    to { transform: translateX(200px) rotate(-360deg); } }

    /* ── Orbiting shapes ── */
    .shape-sphere {
      width:48px; height:48px; border-radius:99px;
      background: radial-gradient(circle at 30% 30%, #FFFFFF, #EC4899 50%, #831843);
      box-shadow:
        0 0 30px rgba(236,72,153,.7),
        inset -10px -10px 20px rgba(0,0,0,.4),
        inset 8px 8px 15px rgba(255,255,255,.25);
      animation: shapeFloat 5s ease-in-out infinite;
    }

    .shape-pyramid {
      width:0; height:0;
      position:relative;
      transform-style: preserve-3d;
      animation: shapeFloat 6s ease-in-out infinite, pyramidSpin 8s linear infinite;
      filter: drop-shadow(0 0 25px rgba(245,158,11,.7));
    }
    .shape-pyramid .face {
      position:absolute; width:0; height:0;
      border-left: 24px solid transparent;
      border-right: 24px solid transparent;
      border-bottom: 42px solid #F59E0B;
      transform-origin: 50% 100%;
    }
    .shape-pyramid .f1 { transform: translateX(-24px) translateY(-42px) rotateY(0deg)   translateZ(20px); border-bottom-color:#FBBF24; }
    .shape-pyramid .f2 { transform: translateX(-24px) translateY(-42px) rotateY(90deg)  translateZ(20px); border-bottom-color:#F59E0B; }
    .shape-pyramid .f3 { transform: translateX(-24px) translateY(-42px) rotateY(180deg) translateZ(20px); border-bottom-color:#EA580C; }
    .shape-pyramid .f4 { transform: translateX(-24px) translateY(-42px) rotateY(270deg) translateZ(20px); border-bottom-color:#EF4444; }
    @keyframes pyramidSpin { to { transform: rotateY(360deg); } }

    .shape-torus {
      width:54px; height:54px; border-radius:99px;
      border: 12px solid transparent;
      background:
        radial-gradient(circle at 30% 30%, #06B6D4, #1E3A8A) border-box;
      mask: radial-gradient(circle, transparent 35%, black 36%);
      box-shadow: 0 0 30px rgba(6,182,212,.7);
      animation: shapeFloat 7s ease-in-out infinite, torusSpin 9s linear infinite;
    }
    @keyframes torusSpin { to { transform: rotateY(360deg) rotateX(360deg); } }

    .shape-mini-cube {
      width:38px; height:38px; position:relative;
      transform-style: preserve-3d;
      animation: miniCubeSpin 7s linear infinite, shapeFloat 5s ease-in-out infinite;
      filter: drop-shadow(0 0 25px rgba(16,185,129,.7));
    }
    .mc-face {
      position:absolute; inset:0; border-radius:5px;
      border:1px solid rgba(255,255,255,.25);
      background: linear-gradient(135deg, #10B981, #047857);
      box-shadow: inset 0 -5px 10px rgba(0,0,0,.3), inset 0 5px 10px rgba(255,255,255,.15);
    }
    .mc-front  { transform: translateZ(19px); }
    .mc-back   { transform: rotateY(180deg) translateZ(19px); }
    .mc-right  { transform: rotateY(90deg)  translateZ(19px); }
    .mc-left   { transform: rotateY(-90deg) translateZ(19px); }
    .mc-top    { transform: rotateX(90deg)  translateZ(19px); }
    .mc-bottom { transform: rotateX(-90deg) translateZ(19px); }
    @keyframes miniCubeSpin {
      0%   { transform: rotateX(0) rotateY(0); }
      100% { transform: rotateX(360deg) rotateY(360deg); }
    }

    .shape-diamond {
      width:40px; height:40px;
      background: linear-gradient(135deg, #A78BFA, #7C3AED);
      transform: rotate(45deg);
      box-shadow:
        0 0 30px rgba(167,139,250,.8),
        inset -5px -5px 12px rgba(0,0,0,.3),
        inset 5px 5px 12px rgba(255,255,255,.3);
      animation: shapeFloat 6s ease-in-out infinite, diamondSpin 4s linear infinite;
    }
    @keyframes diamondSpin { to { transform: rotate(405deg); } }

    @keyframes shapeFloat {
      0%,100% { translate: 0 0; }
      50%     { translate: 0 -10px; }
    }

    /* ═══════════════════════════════════════════
       HUD
       ═══════════════════════════════════════════ */
    .hud { position:absolute; inset:0; z-index:50; pointer-events:none; }
    .hud > * { pointer-events:auto; }

    .hud-tl {
      position:absolute; top:32px; left:40px; max-width:380px;
      animation: hudSlideIn 1s cubic-bezier(.16,1,.3,1) .8s both;
    }
    @keyframes hudSlideIn  { 0% { opacity:0; transform:translateX(-30px); } 100% { opacity:1; transform:translateX(0); } }
    @keyframes hudSlideInR { 0% { opacity:0; transform:translateX(30px);  } 100% { opacity:1; transform:translateX(0); } }
    .hud-chapter {
      font-family:'Roboto Mono',monospace;
      font-size:11px; font-weight:700; letter-spacing:2px;
      color:#A78BFA; margin:0;
      text-shadow:0 0 12px rgba(124,58,237,.6);
    }
    .hud-title {
      font-size:42px; font-weight:900; line-height:1.1;
      margin:8px 0 10px; letter-spacing:-.8px; color:#fff;
      text-shadow:0 4px 24px rgba(0,0,0,.9);
    }
    .hud-sub {
      font-size:14px; color:var(--lms-text-2); font-style:italic; margin:0;
      text-shadow:0 2px 12px rgba(0,0,0,.85);
    }

    .hud-bl {
      position:absolute; bottom:32px; left:40px; width:320px;
      animation: hudSlideIn 1s cubic-bezier(.16,1,.3,1) 1.2s both;
    }
    .stat-bar {
      background: rgba(10,10,20,.55); backdrop-filter:blur(20px);
      border:1px solid rgba(167,139,250,.18); border-radius:var(--lms-radius);
      padding:18px; display:flex; flex-direction:column; gap:14px;
      box-shadow: 0 20px 50px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.06);
    }
    .stat-row { display:flex; align-items:center; gap:12px; }
    .stat-icon {
      width:36px; height:36px; border-radius:10px;
      background:var(--lms-surface-2);
      display:flex; align-items:center; justify-content:center;
      font-size:18px; flex-shrink:0;
    }
    .stat-info  { flex:1; min-width:0; }
    .stat-label { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:var(--lms-text-2); margin:0 0 4px; }
    .stat-val   { font-size:11px; color:var(--lms-text-muted); margin:3px 0 0; }
    .bar { height:6px; border-radius:99px; background:var(--lms-surface-3); overflow:hidden; &.mini { width:80px; } }
    .bar-fill {
      height:100%; border-radius:99px;
      animation: barLoad 1.5s cubic-bezier(.16,1,.3,1) 1.4s both;
      &.xp     { background:linear-gradient(90deg,#7C3AED,#A78BFA); box-shadow:0 0 12px rgba(167,139,250,.7); }
      &.know   { background:linear-gradient(90deg,#3B82F6,#06B6D4); box-shadow:0 0 12px rgba(59,130,246,.7); }
      &.streak { background:linear-gradient(90deg,#F59E0B,#EF4444); box-shadow:0 0 12px rgba(245,158,11,.7); }
    }
    @keyframes barLoad { from { width:0 !important; } }

    .hud-tr {
      position:absolute; top:32px; right:40px; width:280px;
      display:flex; flex-direction:column; gap:10px;
      animation: hudSlideInR 1s cubic-bezier(.16,1,.3,1) 1s both;
    }
    .quest-card {
      background:rgba(10,10,20,.6); backdrop-filter:blur(20px);
      border:1px solid rgba(167,139,250,.18); border-radius:var(--lms-radius);
      padding:16px; position:relative; overflow:hidden;
      box-shadow: 0 20px 50px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.06);
      &::before { content:''; position:absolute; left:0; top:0; bottom:0; width:3px; background:var(--lms-gradient); }
      &.secondary { padding:12px 16px; &::before { background:var(--lms-blue); } }
    }
    .quest-head { display:flex; align-items:center; gap:8px; margin-bottom:8px; }
    .quest-dot {
      width:7px; height:7px; border-radius:99px;
      background:var(--lms-amber); box-shadow:0 0 10px var(--lms-amber);
      animation:pulse 1.8s ease-in-out infinite;
      &.blue { background:var(--lms-blue); box-shadow:0 0 10px var(--lms-blue); }
    }
    .quest-tag { font-family:'Roboto Mono',monospace; font-size:10px; font-weight:700; letter-spacing:1.5px; color:var(--lms-text-2); }
    .quest-title { font-size:14px; font-weight:700; color:var(--lms-text); margin:0 0 10px; line-height:1.4; }
    .quest-meta  { display:flex; align-items:center; gap:8px; font-size:11px; color:var(--lms-text-2); }
    .quest-reward { margin-left:auto; font-size:11px; font-weight:700; color:var(--lms-amber);
      &.small { font-size:11px; color:var(--lms-blue); margin:0; }
    }

    .hud-br { position:absolute; bottom:32px; right:40px;
      animation: hudSlideInR 1s cubic-bezier(.16,1,.3,1) 1.6s both;
    }
    .cta-button {
      display:flex; align-items:center; gap:10px;
      padding:16px 26px; border-radius:14px;
      background: linear-gradient(135deg,#7C3AED 0%,#3B82F6 100%);
      color:#fff; font-weight:800; font-size:15px;
      text-decoration:none; position:relative; overflow:hidden;
      box-shadow:0 12px 32px rgba(124,58,237,.55), inset 0 -3px 8px rgba(0,0,0,.25), inset 0 2px 4px rgba(255,255,255,.2);
      transition: transform .2s, box-shadow .25s;
      mat-icon { font-size:20px; width:20px; height:20px; filter:drop-shadow(0 0 8px rgba(255,255,255,.8)); }
      .cta-arrow { transition:transform .2s; }
      &:hover { transform:translateY(-2px) scale(1.03); box-shadow:0 18px 50px rgba(124,58,237,.7);
        .cta-arrow { transform:translateX(4px); }
      }
    }
    .cta-glow { position:absolute; inset:0;
      background: linear-gradient(135deg, rgba(255,255,255,0), rgba(255,255,255,.35), rgba(255,255,255,0));
      transform: translateX(-100%); animation: ctaShine 3s ease-in-out infinite; pointer-events:none;
    }
    @keyframes ctaShine { 0%,100% { transform:translateX(-120%); } 50% { transform:translateX(120%); } }

    @media (max-width: 1200px) { .hud-tr, .hud-bl { display:none; } }
  `]
})
export class JourneyComponent implements OnInit {
  readonly today = new Date().toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });

  particles = signal<Particle[]>([]);

  private mouseX = 0;
  private mouseY = 0;

  ngOnInit(): void {
    const particles: Particle[] = Array.from({ length: 80 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1.5 + Math.random() * 3,
      delay: Math.random() * 8,
      duration: 6 + Math.random() * 8,
    }));
    this.particles.set(particles);
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(e: MouseEvent): void {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    this.mouseX = ((e.clientX - rect.left) / rect.width  - 0.5) * 2;
    this.mouseY = ((e.clientY - rect.top)  / rect.height - 0.5) * 2;
  }

  parallax(dx: number, dy: number): string {
    return `translate3d(${(this.mouseX * dx).toFixed(1)}px, ${(this.mouseY * dy).toFixed(1)}px, 0)`;
  }
}
