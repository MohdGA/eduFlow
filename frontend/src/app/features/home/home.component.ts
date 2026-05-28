import { Component, ElementRef, HostListener, OnInit, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { NgApexchartsModule } from 'ng-apexcharts';
import { MY_COURSES, COURSES } from '../../core/models/mock-data';
import { CourseService } from '../../core/services/course.service';
import { resolveMediaUrl } from '../../core/config/api.config';
import { EnrollmentService } from '../../core/services/enrollment.service';
import { AuthService } from '../../core/services/auth.service';
import { Course } from '../../core/models/lms.models';
import { Tilt3dDirective } from '../../core/directives/tilt-3d.directive';
import { MagneticDirective } from '../../core/directives/magnetic.directive';
import { ScrollRevealDirective } from '../../core/directives/scroll-reveal.directive';
import { CountUpDirective } from '../../core/directives/count-up.directive';
import { Hero3dComponent } from '../../shared/hero-3d.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatButtonModule, NgApexchartsModule,
            Tilt3dDirective, MagneticDirective, ScrollRevealDirective, CountUpDirective, Hero3dComponent],
  template: `
  <div class="home-wrap" (mousemove)="onParallaxMove($event)">

    <!-- ── HERO with REAL Three.js 3D scene ── -->
    <div class="hero" #heroEl>
      <!-- WebGL 3D scene fills the right side -->
      <div class="hero-3d-stage">
        <app-hero-3d></app-hero-3d>
      </div>
      <!-- Parallax floating 3D shapes -->
      <div class="shapes-bg">
        <div class="shape shape-cube" [style.transform]="parallax(20, 30)"></div>
        <div class="shape shape-sphere" [style.transform]="parallax(-15, 25)"></div>
        <div class="shape shape-prism" [style.transform]="parallax(10, -20)"></div>
        <div class="shape shape-ring" [style.transform]="parallax(-25, 15)"></div>
      </div>
      <div class="hero-blob b1"></div>
      <div class="hero-blob b2"></div>

      <div class="hero-content afd">
        <span class="lms-badge purple">✦ Welcome back, Alex</span>
        <h1 class="hero-h1">Keep the momentum<br><span class="gradient-text">going strong</span></h1>
        <p class="hero-sub">You're on a 7-day streak. Pick up where you left off.</p>
        <div class="hero-actions">
          <a routerLink="/my-courses" class="btn-primary" appMagnetic [strength]="0.4">
            <mat-icon>play_circle</mat-icon> Continue Learning
          </a>
          <a routerLink="/catalog" class="btn-ghost" appMagnetic [strength]="0.25">Browse Catalog</a>
        </div>
      </div>

    </div>

    <!-- ── Stats — 3D flip cards ── -->
    <div class="hero-stats-3d afu d2">
      @for (s of stats; track s.label; let i = $index) {
        <a class="flip-card" [routerLink]="['/my-courses']" [style.animation-delay.s]="i * 0.1">
          <div class="flip-inner">
            <div class="flip-front" [style.background]="s.color">
              <mat-icon>{{ s.icon }}</mat-icon>
              <div class="fc-val">{{ s.value }}</div>
              <div class="fc-label">{{ s.label }}</div>
            </div>
            <div class="flip-back" [style.background]="s.color">
              <p class="fc-back-msg">{{ s.detail }}</p>
              <div class="fc-back-cta">Open my courses →</div>
            </div>
          </div>
        </a>
      }
    </div>

    <!-- ── Continue Learning — mouse-tracking 3D tilt ── -->
    <section class="section" appScrollReveal>
      <div class="section-header">
        <h2 class="section-title">Continue Learning</h2>
        <a routerLink="/my-courses" class="see-all">View all <mat-icon>arrow_forward</mat-icon></a>
      </div>
      <div class="continue-grid">
        @for (c of myCourses().slice(0,3); track c.id) {
          <a class="continue-card tilt-card" [routerLink]="['/learn', c.id]" appTilt3d [maxTilt]="8" [translateZ]="14" [glare]="0.18">
            <div class="cc-glare"></div>
            <div class="cc-thumb" [class]="c.thumbnail">
              <div class="cc-play"><mat-icon>play_circle</mat-icon></div>
              <span class="lms-badge" [class]="levelBadge(c.level)">{{ c.level }}</span>
            </div>
            <div class="cc-body">
              <p class="cc-cat">{{ c.category }}</p>
              <h3 class="cc-title">{{ c.title }}</h3>
              <div class="cc-progress-row">
                <div class="lms-progress" style="flex:1"><div class="fill" [style.width.%]="c.progress"></div></div>
                <span class="cc-pct">{{ c.progress }}%</span>
              </div>
              <p class="cc-last">{{ c.lastAccessed }}</p>
            </div>
          </a>
        }
      </div>
    </section>

    <!-- ── KPI + Activity row ── -->
    <section class="stats-activity" appScrollReveal>
      <div class="kpi-grid">
        @for (s of kpiCards; track s.label) {
          <div class="kpi-card-3d" appTilt3d [maxTilt]="6" [translateZ]="10" [glare]="0.12">
            <div class="kpi-glare"></div>
            <div class="kpi-icon-3d" [style.background]="s.gradient">
              <mat-icon>{{ s.icon }}</mat-icon>
            </div>
            <div class="kpi-val">
              @if (s.countTo !== null) {
                <span appCountUp [end]="s.countTo" [suffix]="s.suffix" [duration]="2.2"></span>
              } @else {
                {{ s.value }}
              }
            </div>
            <div class="kpi-label">{{ s.label }}</div>
            <div class="kpi-change" [class.pos]="s.positive" [class.neg]="!s.positive">
              <mat-icon>{{ s.positive ? 'trending_up' : 'trending_down' }}</mat-icon>{{ s.change }}
            </div>
          </div>
        }
      </div>

      <div class="activity-chart glass-card">
        <div class="chart-hdr">
          <span class="section-title" style="font-size:16px">Weekly Activity</span>
          <span class="lms-badge purple">This week</span>
        </div>
        <apx-chart
          [series]="activitySeries"
          [chart]="{ type:'area', height:200, toolbar:{show:false}, background:'transparent' }"
          [colors]="['#7C3AED','#3B82F6']"
          [fill]="{ type:'gradient', gradient:{ shadeIntensity:1, opacityFrom:.4, opacityTo:.02, stops:[0,100] } }"
          [stroke]="{ curve:'smooth', width:2 }"
          [xaxis]="{ categories:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], labels:{style:{colors:'#555'}}, axisBorder:{show:false}, axisTicks:{show:false} }"
          [yaxis]="{ labels:{style:{colors:'#555'}} }"
          [grid]="{ borderColor:'rgba(255,255,255,0.04)', strokeDashArray:4 }"
          [dataLabels]="{ enabled:false }"
          [legend]="{ labels:{colors:'#9090B0'} }"
          [theme]="{ mode:'dark' }"
          [tooltip]="{ theme:'dark' }">
        </apx-chart>
      </div>
    </section>

    <!-- ── Achievement medal — 3D rotating ── -->
    <section class="achievement-row" appScrollReveal [variant]="'scale'">
      <div class="medal-stage">
        <div class="medal-3d">
          <div class="medal-front">
            <mat-icon>local_fire_department</mat-icon>
            <span class="medal-num">7</span>
            <span class="medal-text">Day Streak</span>
          </div>
          <div class="medal-back">
            <mat-icon>workspace_premium</mat-icon>
            <span class="medal-text">Keep going!</span>
          </div>
          <div class="medal-edge"></div>
        </div>
        <div class="medal-glow"></div>
      </div>
      <div class="achievement-text">
        <span class="lms-badge amber">🔥 Achievement unlocked</span>
        <h2>7-day learning streak!</h2>
        <p>You've shown up every day this week. Hit 14 days to earn a special badge.</p>
        <div class="streak-week">
          @for (d of weekDays; track d.label) {
            <div class="sw-day" [class.active]="d.active">
              <span class="sw-label">{{ d.label }}</span>
              <div class="sw-dot"><mat-icon>{{ d.active ? 'check' : 'circle' }}</mat-icon></div>
            </div>
          }
        </div>
      </div>
    </section>

    <!-- ── Recommended ── -->
    <section class="section" appScrollReveal>
      <div class="section-header">
        <h2 class="section-title">Recommended for You</h2>
        <a routerLink="/catalog" class="see-all">See all <mat-icon>arrow_forward</mat-icon></a>
      </div>
      <div class="course-grid">
        @for (c of featured(); track c.id) {
          <a class="course-card tilt-card" [routerLink]="['/course', c.id]" appTilt3d [maxTilt]="10" [translateZ]="18" [glare]="0.2">
            <div class="cc-glare"></div>
            <div class="course-thumb" [class]="c.thumbnail">
              @if (c.imageUrl) {
                <img [src]="c.imageUrl" [alt]="c.title" loading="lazy" class="thumb-img">
              }
              @if (c.isBestseller) { <span class="thumb-badge amber">Bestseller</span> }
              @if (c.isNew) { <span class="thumb-badge green">New</span> }
            </div>
            <div class="course-body">
              <div class="course-top">
                <span class="lms-badge" [class]="catColor(c.category)">{{ c.category }}</span>
                <span class="lms-badge" [class]="levelBadge(c.level)">{{ c.level }}</span>
              </div>
              <h3 class="course-title">{{ c.title }}</h3>
              <p class="course-sub">{{ c.subtitle }}</p>
              <div class="course-meta">
                <span class="stars">{{ starStr(c.rating) }}</span>
                <span class="meta-val">{{ c.rating }}</span>
                <span class="meta-muted">({{ c.reviewCount | number }})</span>
              </div>
              <div class="course-footer">
                <div class="instructor-row">
                  <div class="instr-av">{{ c.instructorAvatar }}</div>
                  <span class="instr-name">{{ c.instructor }}</span>
                </div>
                <span class="course-price">\${{ c.price }}</span>
              </div>
            </div>
          </a>
        }
      </div>
    </section>

  </div>
  `,
  styles: [`
    .home-wrap { padding: 0 40px 60px; max-width:1300px; margin:0 auto; }

    /* ═══════════════════════════════════════════════════
       HERO with 3D scene
       ═══════════════════════════════════════════════════ */
    .hero {
      position:relative; border-radius:var(--lms-radius);
      background: linear-gradient(135deg, #15152A 0%, #0D0D1A 100%);
      border: 1px solid var(--lms-border);
      padding: 56px 56px; margin: 32px 0 16px;
      overflow: hidden; min-height:440px;
      display:flex; align-items:center;
      perspective: 1500px;
      transform-style: preserve-3d;
    }
    .hero-3d-stage {
      position:absolute; top:0; right:0; bottom:0;
      width: 55%;
      pointer-events: none;
      z-index: 1;
    }
    .hero-content { position:relative; z-index:2; max-width: 55%; }
    .hero-blob {
      position:absolute; border-radius:99px; filter:blur(80px); pointer-events:none;
      animation: floatBlob 12s ease-in-out infinite;
      &.b1 { width:400px; height:400px; background:rgba(124,58,237,0.22); top:-100px; right:200px; }
      &.b2 { width:300px; height:300px; background:rgba(59,130,246,0.18); bottom:-80px; right:400px; animation-delay:-5s; }
    }
    .hero-content { flex:1; position:relative; z-index:2; }
    .hero-h1 { font-size:46px; font-weight:900; line-height:1.12; margin:16px 0 12px; letter-spacing:-.9px; }
    .hero-sub { font-size:15px; color:var(--lms-text-2); margin:0 0 28px; }
    .hero-actions { display:flex; gap:12px; align-items:center; }
    .btn-primary {
      display:inline-flex; align-items:center; gap:8px;
      padding:13px 30px; border-radius:var(--lms-radius-sm);
      background:var(--lms-gradient); color:#fff; font-weight:700; font-size:14px;
      text-decoration:none; box-shadow:var(--lms-shadow-purple);
      transition:opacity .2s, transform .15s;
      mat-icon { font-size:18px; width:18px; height:18px; }
      &:hover { opacity:.9; transform:translateY(-2px); box-shadow:0 12px 40px rgba(124,58,237,0.5); }
    }
    .btn-ghost {
      display:inline-flex; align-items:center;
      padding:13px 26px; border-radius:var(--lms-radius-sm);
      border:1px solid var(--lms-border); color:var(--lms-text-2);
      font-size:14px; font-weight:600; text-decoration:none;
      transition:all .15s;
      &:hover { border-color:var(--lms-border-hover); color:var(--lms-text); }
    }

    /* ── Parallax 3D shapes ── */
    .shapes-bg { position:absolute; inset:0; pointer-events:none; z-index:1; }
    .shape {
      position:absolute;
      transition: transform .25s cubic-bezier(.16,1,.3,1);
    }
    .shape-cube {
      width:80px; height:80px;
      background: linear-gradient(135deg, #7C3AED, #3B82F6);
      top:20%; right:38%;
      box-shadow: 0 20px 60px rgba(124,58,237,0.4), inset 0 -8px 16px rgba(0,0,0,0.25);
      border-radius:10px;
      animation: rotate3dSlow 14s linear infinite;
    }
    .shape-sphere {
      width:60px; height:60px; border-radius:99px;
      background: radial-gradient(circle at 30% 30%, #EC4899, #831843);
      top:65%; right:48%;
      box-shadow: 0 18px 50px rgba(236,72,153,0.4), inset -8px -8px 16px rgba(0,0,0,0.3);
      animation: floatY 5s ease-in-out infinite;
    }
    .shape-prism {
      width:0; height:0; top:75%; right:30%;
      border-left:35px solid transparent; border-right:35px solid transparent;
      border-bottom:60px solid #F59E0B;
      filter: drop-shadow(0 18px 30px rgba(245,158,11,0.4));
      animation: rotate3dSlow 18s linear infinite reverse;
    }
    .shape-ring {
      width:90px; height:90px; border-radius:99px;
      border:8px solid transparent;
      background: conic-gradient(from 0deg, #10B981, #06B6D4, #10B981) border-box;
      mask: linear-gradient(#000 0 0) padding-box, linear-gradient(#000 0 0);
      mask-composite: exclude;
      -webkit-mask-composite: xor;
      top:15%; right:55%;
      animation: spin 8s linear infinite;
    }

    @keyframes rotate3dSlow {
      0%   { transform: perspective(800px) rotateX(0deg) rotateY(0deg); }
      100% { transform: perspective(800px) rotateX(360deg) rotateY(360deg); }
    }

    /* ═══════════════════════════════════════════════════
       3D ROTATING CUBE
       ═══════════════════════════════════════════════════ */
    .cube-scene {
      position:relative; width:240px; height:240px;
      perspective: 1000px;
      flex-shrink: 0;
      margin-left: 24px;
      z-index: 2;
    }
    .cube {
      position:absolute; inset:0;
      transform-style: preserve-3d;
      animation: cubeRotate 14s linear infinite;
    }
    .cube-face {
      position:absolute; inset:0;
      display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px;
      border-radius: 14px;
      border: 1px solid rgba(255,255,255,0.18);
      box-shadow: inset 0 -20px 40px rgba(0,0,0,0.25), 0 10px 40px rgba(0,0,0,0.4);
      backface-visibility: visible;
      mat-icon { color:#fff; font-size:48px; width:48px; height:48px;
                 filter: drop-shadow(0 4px 12px rgba(0,0,0,0.4)); }
      span { color:#fff; font-weight:800; font-size:14px; letter-spacing:.3px;
             text-shadow: 0 2px 8px rgba(0,0,0,0.5); }
    }
    .face-0 { transform: translateZ(120px); }                            /* front */
    .face-1 { transform: rotateY( 90deg) translateZ(120px); }            /* right */
    .face-2 { transform: rotateY(180deg) translateZ(120px); }            /* back */
    .face-3 { transform: rotateY(-90deg) translateZ(120px); }            /* left */
    .face-4 { transform: rotateX( 90deg) translateZ(120px); }            /* top */
    .face-5 { transform: rotateX(-90deg) translateZ(120px); }            /* bottom */

    @keyframes cubeRotate {
      0%   { transform: rotateX(-20deg) rotateY(0deg); }
      100% { transform: rotateX(-20deg) rotateY(360deg); }
    }
    .cube-shadow {
      position:absolute; bottom:-30px; left:50%; transform:translateX(-50%);
      width:170px; height:24px; border-radius:99px;
      background: radial-gradient(ellipse, rgba(124,58,237,0.55), transparent 70%);
      filter: blur(10px);
      animation: shadowPulse 14s ease-in-out infinite;
    }
    @keyframes shadowPulse {
      0%,100% { width:170px; opacity:.8; }
      50%     { width:130px; opacity:.5; }
    }

    /* ═══════════════════════════════════════════════════
       3D FLIP STAT CARDS
       ═══════════════════════════════════════════════════ */
    .hero-stats-3d {
      display:grid; grid-template-columns:repeat(3,1fr); gap:14px;
      margin: 8px 0 40px;
      perspective: 1200px;
    }
    .flip-card {
      display: block; text-decoration: none;
      height:130px; position:relative;
      animation: fadeInUp .5s cubic-bezier(.16,1,.3,1) both;
      cursor: pointer;
    }
    .flip-inner {
      position:absolute; inset:0;
      transform-style: preserve-3d;
      transition: transform .8s cubic-bezier(.4,0,.2,1);
    }
    .flip-card:hover .flip-inner { transform: rotateY(180deg); }
    .flip-front, .flip-back {
      position:absolute; inset:0;
      backface-visibility: hidden;
      border-radius: var(--lms-radius);
      padding:20px; overflow:hidden;
      display:flex; flex-direction:column; justify-content:space-between;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3), inset 0 -4px 8px rgba(0,0,0,0.2);
      mat-icon { color:#fff; font-size:28px; width:28px; height:28px;
                 filter: drop-shadow(0 3px 8px rgba(0,0,0,0.4)); }
    }
    .flip-back { transform: rotateY(180deg); align-items:center; justify-content:center; text-align:center; }
    .fc-val   { font-size:32px; font-weight:900; color:#fff; letter-spacing:-1px; line-height:1;
                text-shadow: 0 3px 12px rgba(0,0,0,0.3); }
    .fc-label { font-size:12px; color:rgba(255,255,255,0.8); margin-top:4px; font-weight:600; }
    .fc-back-msg { color:#fff; font-size:14px; font-weight:600; margin:0; line-height:1.4; }
    .fc-back-cta { color:rgba(255,255,255,0.85); font-size:12px; margin-top:10px; font-weight:700; }

    /* ═══════════════════════════════════════════════════
       Section
       ═══════════════════════════════════════════════════ */
    .section { margin-bottom:44px; }
    .section-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; }
    .section-title  { font-size:22px; font-weight:800; margin:0; letter-spacing:-.4px; }
    .see-all {
      display:flex; align-items:center; gap:4px; font-size:13px; font-weight:600;
      color:var(--lms-purple-2); text-decoration:none; transition:gap .15s;
      mat-icon { font-size:16px; width:16px; height:16px; }
      &:hover { gap:8px; }
    }

    /* ═══════════════════════════════════════════════════
       Continue Learning — tilt cards
       ═══════════════════════════════════════════════════ */
    .continue-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:18px; }
    .tilt-card {
      position:relative; display:flex; flex-direction:column;
      border-radius:var(--lms-radius);
      background:var(--lms-surface); border:1px solid var(--lms-border);
      text-decoration:none; overflow:hidden;
      transform-style: preserve-3d;
      transition: box-shadow .25s, border-color .2s;
      --tilt-glare-x: 50%;
      --tilt-glare-y: 50%;
      --tilt-glare-opacity: 0;
      will-change: transform;
      &:hover {
        border-color: var(--lms-purple);
        box-shadow: 0 25px 60px rgba(124,58,237,0.25), 0 0 0 1px rgba(124,58,237,0.3);
      }
    }
    .cc-glare {
      position:absolute; inset:0; pointer-events:none; z-index:3; border-radius:inherit;
      background: radial-gradient(circle 250px at var(--tilt-glare-x) var(--tilt-glare-y),
                                  rgba(255,255,255,0.18), transparent 60%);
      opacity: var(--tilt-glare-opacity);
      transition: opacity .25s;
      mix-blend-mode: overlay;
    }
    .cc-thumb {
      height:140px; position:relative;
      display:flex; align-items:flex-end; padding:12px;
      transform: translateZ(20px);
    }
    .cc-play {
      position:absolute; top:50%; left:50%; transform:translate(-50%,-50%) translateZ(40px);
      width:48px; height:48px; border-radius:99px;
      background:rgba(0,0,0,0.55); backdrop-filter:blur(8px);
      display:flex; align-items:center; justify-content:center;
      mat-icon { color:#fff; font-size:24px; width:24px; height:24px; }
    }
    .cc-body { padding:18px; display:flex; flex-direction:column; gap:8px; transform:translateZ(15px); }
    .cc-cat   { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:var(--lms-purple-2); margin:0; }
    .cc-title { font-size:15px; font-weight:700; margin:0; color:var(--lms-text); line-height:1.3; }
    .cc-progress-row { display:flex; align-items:center; gap:10px; }
    .cc-pct   { font-size:12px; font-weight:700; color:var(--lms-purple-2); flex-shrink:0; }
    .cc-last  { font-size:11px; color:var(--lms-text-muted); margin:0; }

    /* ═══════════════════════════════════════════════════
       KPI cards with mouse tilt
       ═══════════════════════════════════════════════════ */
    .stats-activity { display:grid; grid-template-columns:1.1fr 1.4fr; gap:16px; margin-bottom:44px; }
    .kpi-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .kpi-card-3d {
      position:relative;
      background:var(--lms-surface); border:1px solid var(--lms-border);
      border-radius:var(--lms-radius); padding:20px; overflow:hidden;
      transform-style:preserve-3d;
      transition: border-color .2s, box-shadow .2s;
      --tilt-glare-x: 50%; --tilt-glare-y: 50%; --tilt-glare-opacity: 0;
      will-change: transform;
      &:hover { border-color:var(--lms-purple); }
    }
    .kpi-glare {
      position:absolute; inset:0; pointer-events:none; border-radius:inherit;
      background: radial-gradient(circle 200px at var(--tilt-glare-x) var(--tilt-glare-y),
                                  rgba(255,255,255,0.15), transparent 60%);
      opacity: var(--tilt-glare-opacity);
      mix-blend-mode: overlay;
      transition: opacity .25s;
    }
    .kpi-icon-3d {
      width:42px; height:42px; border-radius:12px;
      display:flex; align-items:center; justify-content:center;
      margin-bottom:14px;
      box-shadow: 0 8px 20px rgba(0,0,0,0.35), inset 0 -4px 8px rgba(0,0,0,0.2);
      transform: translateZ(20px);
      mat-icon { color:#fff; font-size:20px; width:20px; height:20px;
                 filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); }
    }
    .kpi-val   { font-size:32px; font-weight:900; letter-spacing:-1px; transform:translateZ(12px); }
    .kpi-label { font-size:12px; color:var(--lms-text-2); margin:4px 0 10px; transform:translateZ(8px); }
    .kpi-change {
      display:inline-flex; align-items:center; gap:3px;
      font-size:12px; font-weight:600; border-radius:6px; padding:2px 8px;
      transform:translateZ(8px);
      mat-icon { font-size:13px; width:13px; height:13px; }
      &.pos { background:var(--lms-green-dim); color:var(--lms-green); }
      &.neg { background:var(--lms-red-dim);   color:var(--lms-red); }
    }
    .activity-chart { padding:20px 20px 8px; }
    .chart-hdr { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; }

    /* ═══════════════════════════════════════════════════
       Achievement medal — 3D rotating coin
       ═══════════════════════════════════════════════════ */
    .achievement-row {
      display:grid; grid-template-columns:280px 1fr; gap:48px;
      padding:40px; margin-bottom:44px;
      background: linear-gradient(135deg, rgba(245,158,11,0.08), rgba(124,58,237,0.06));
      border:1px solid var(--lms-border);
      border-radius: var(--lms-radius);
      position: relative; overflow:hidden;
    }
    .medal-stage {
      position:relative; height:200px;
      perspective: 1000px;
      display:flex; align-items:center; justify-content:center;
    }
    .medal-3d {
      width:160px; height:160px; position:relative;
      transform-style: preserve-3d;
      animation: medalSpin 6s linear infinite;
    }
    .medal-front, .medal-back {
      position:absolute; inset:0;
      border-radius:99px;
      display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px;
      backface-visibility: hidden;
      background: radial-gradient(circle at 35% 35%, #FCD34D, #F59E0B 50%, #B45309);
      box-shadow: inset -15px -15px 30px rgba(0,0,0,0.3), inset 10px 10px 20px rgba(255,255,255,0.25),
                  0 20px 60px rgba(245,158,11,0.45);
      mat-icon { color:#7C2D12; font-size:42px; width:42px; height:42px;
                 filter: drop-shadow(0 2px 4px rgba(255,255,255,0.4)); }
    }
    .medal-back { transform: rotateY(180deg);
      background: radial-gradient(circle at 35% 35%, #DDD6FE, #7C3AED 50%, #4C1D95);
      box-shadow: inset -15px -15px 30px rgba(0,0,0,0.3), inset 10px 10px 20px rgba(255,255,255,0.25),
                  0 20px 60px rgba(124,58,237,0.5);
      mat-icon { color:#1E1B4B; }
    }
    .medal-num  { font-size:34px; font-weight:900; color:#7C2D12; line-height:1;
                  text-shadow: 0 2px 4px rgba(255,255,255,0.5); }
    .medal-text { font-size:11px; font-weight:800; color:#7C2D12; text-transform:uppercase; letter-spacing:.6px; }
    .medal-back .medal-text { color:#1E1B4B; }
    .medal-edge {
      position:absolute; inset:0; border-radius:99px;
      border: 4px solid rgba(0,0,0,0.15);
      transform: translateZ(-4px);
    }
    @keyframes medalSpin {
      0%   { transform: rotateY(0deg)   rotateX(8deg); }
      50%  { transform: rotateY(180deg) rotateX(-8deg); }
      100% { transform: rotateY(360deg) rotateX(8deg); }
    }
    .medal-glow {
      position:absolute; inset:0;
      background: radial-gradient(circle, rgba(245,158,11,0.25), transparent 60%);
      filter: blur(40px);
      animation: pulse 3s ease-in-out infinite;
      pointer-events:none;
    }

    .achievement-text h2 { font-size:30px; font-weight:900; margin:12px 0 8px; letter-spacing:-.5px; }
    .achievement-text p  { font-size:14px; color:var(--lms-text-2); margin:0 0 22px; line-height:1.6; }
    .streak-week { display:flex; gap:8px; }
    .sw-day { display:flex; flex-direction:column; align-items:center; gap:6px; }
    .sw-label { font-size:10px; color:var(--lms-text-muted); text-transform:uppercase; letter-spacing:.5px; }
    .sw-dot {
      width:32px; height:32px; border-radius:99px;
      background:var(--lms-surface-3); display:flex; align-items:center; justify-content:center;
      transition: all .3s;
      mat-icon { font-size:15px; width:15px; height:15px; color:var(--lms-text-muted); }
    }
    .sw-day.active .sw-dot {
      background: linear-gradient(135deg, #F59E0B, #EF4444);
      box-shadow: 0 6px 16px rgba(245,158,11,0.5);
      transform: translateY(-2px);
      mat-icon { color:#fff; }
    }

    /* ═══════════════════════════════════════════════════
       Course grid — tilt cards
       ═══════════════════════════════════════════════════ */
    .course-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:18px; }
    .course-card { position:relative; display:flex; flex-direction:column; border-radius:var(--lms-radius);
      background:var(--lms-surface); border:1px solid var(--lms-border);
      text-decoration:none; overflow:hidden; transform-style:preserve-3d;
      --tilt-glare-x: 50%; --tilt-glare-y: 50%; --tilt-glare-opacity: 0;
      will-change: transform;
      transition: border-color .2s, box-shadow .25s;
      &:hover { border-color: var(--lms-purple); box-shadow: 0 25px 60px rgba(124,58,237,0.25); }
    }
    .course-thumb {
      height:150px; position:relative;
      display:flex; align-items:flex-start; justify-content:flex-end; padding:10px;
      transform: translateZ(20px);
    }
    .thumb-badge {
      padding:3px 10px; border-radius:6px; font-size:11px; font-weight:700;
      &.amber { background:#92400E; color:#FDE68A; }
      &.green { background:#065F46; color:#6EE7B7; }
    }
    .course-body { padding:16px; flex:1; display:flex; flex-direction:column; gap:8px; transform:translateZ(14px); }
    .course-top  { display:flex; gap:6px; flex-wrap:wrap; }
    .course-title { font-size:14px; font-weight:700; margin:0; color:var(--lms-text); line-height:1.3; }
    .course-sub   { font-size:12px; color:var(--lms-text-2); margin:0; line-height:1.4;
      display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
    .course-meta  { display:flex; align-items:center; gap:5px; }
    .meta-val     { font-size:13px; font-weight:700; color:var(--lms-amber); }
    .meta-muted   { font-size:12px; color:var(--lms-text-muted); }
    .course-footer { display:flex; justify-content:space-between; align-items:center; margin-top:auto; padding-top:8px; border-top:1px solid var(--lms-border); }
    .instructor-row { display:flex; align-items:center; gap:7px; }
    .instr-av   { width:22px; height:22px; border-radius:99px; background:var(--lms-gradient); color:#fff; font-size:10px; font-weight:700; display:flex; align-items:center; justify-content:center; }
    .instr-name { font-size:12px; color:var(--lms-text-2); }
    .course-price { font-size:15px; font-weight:800; color:var(--lms-text); }

    /* ═══════════════════════════════════════════════════
       Thumbnail gradients
       ═══════════════════════════════════════════════════ */
    .grad-blue   { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); }
    .grad-pink   { background: linear-gradient(135deg, #831843 0%, #ec4899 100%); }
    .grad-purple { background: linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%); }
    .grad-amber  { background: linear-gradient(135deg, #78350f 0%, #f59e0b 100%); }
    .grad-cyan   { background: linear-gradient(135deg, #164e63 0%, #06b6d4 100%); }
    .grad-green  { background: linear-gradient(135deg, #064e3b 0%, #10b981 100%); }

    /* ── Responsive ── */
    @media (max-width: 1023px) {
      .home-wrap { padding: 0 24px 48px; }
      .hero { padding: 40px 36px; min-height: 360px; }
      .hero-3d-stage { width: 40%; }
      .hero-h1 { font-size: 36px; }
      .hero-stats-3d { grid-template-columns: repeat(3, 1fr); }
      .continue-grid { grid-template-columns: repeat(2, 1fr); }
      .stats-activity { grid-template-columns: 1fr; }
      .achievement-row { grid-template-columns: 1fr; gap: 24px; padding: 28px; }
      .medal-stage { height: 150px; }
      .achievement-text h2 { font-size: 24px; }
    }
    @media (max-width: 768px) {
      .hero { padding: 32px 24px; min-height: 260px; }
      .hero-3d-stage { display: none; }
      .hero-content { max-width: 100% !important; }
      .hero-h1 { font-size: 30px; }
      .hero-stats-3d { grid-template-columns: repeat(2, 1fr); gap: 10px; }
      .continue-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 640px) {
      .home-wrap { padding: 0 14px 32px; }
      .hero { padding: 24px 20px; margin: 12px 0 8px; }
      .hero-h1 { font-size: 26px; }
      .hero-stats-3d { grid-template-columns: repeat(3, 1fr); gap: 8px; }
      .flip-card { height: 110px; }
      .fc-val { font-size: 24px; }
      .kpi-grid { grid-template-columns: 1fr 1fr; }
      .achievement-row { padding: 18px; gap: 16px; }
      .medal-stage { height: 120px; }
      .achievement-text h2 { font-size: 20px; }
      .streak-week { gap: 4px; flex-wrap: wrap; }
    }
  `]
})
export class HomeComponent implements OnInit {
  private courseApi = inject(CourseService);
  private enrollApi = inject(EnrollmentService);
  private auth = inject(AuthService);

  // Initialized from mock data; replaced with real API data in ngOnInit.
  myCourses = signal<Course[]>(MY_COURSES);
  featured  = signal<Course[]>(COURSES.slice(0, 4));

  ngOnInit(): void {
    // ── Featured (top 4 published courses from the backend) ──
    this.courseApi.list({ pageSize: 4 }).subscribe({
      next: cs => {
        const mapped: Course[] = cs.slice(0, 4).map(c => ({
          id: c.id, title: c.title, subtitle: c.subtitle,
          instructor: c.instructorName, instructorAvatar: c.instructorAvatar || '?',
          thumbnail: c.thumbnailGradient || 'grad-purple',
          imageUrl: resolveMediaUrl(c.imageUrl),
          category: c.category, level: c.level,
          rating: c.rating, reviewCount: c.reviewCount, studentCount: c.studentCount,
          duration: c.duration, lessonCount: c.lessonCount, price: c.price,
          isBestseller: c.isBestseller, isNew: c.isNew, tags: [],
        }));
        if (mapped.length > 0) this.featured.set(mapped);
      },
      error: () => { /* keep mock fallback */ },
    });

    // ── Continue Learning (user's real enrollments) — only if logged in ──
    if (!this.auth.isLoggedIn()) return;
    this.enrollApi.myEnrollments().subscribe({
      next: enrollments => {
        if (enrollments.length === 0) { this.myCourses.set([]); return; }
        // For each enrollment, fetch course detail (already cached server-side).
        Promise.all(enrollments.slice(0, 4).map(en =>
          new Promise<Course | null>(resolve => {
            this.courseApi.get(en.courseId).subscribe({
              next: c => resolve({
                id: c.id, title: c.title, subtitle: c.subtitle,
                instructor: c.instructorName, instructorAvatar: c.instructorAvatar || '?',
                thumbnail: c.thumbnailGradient || 'grad-purple',
                imageUrl: resolveMediaUrl(c.imageUrl),
                category: c.category, level: c.level,
                rating: c.rating, reviewCount: c.reviewCount, studentCount: c.studentCount,
                duration: c.duration, lessonCount: c.sections.reduce((s, sec) => s + sec.lessons.length, 0),
                price: c.price, progress: en.progressPercent, tags: [],
              }),
              error: () => resolve(null),
            });
          })
        )).then(results => {
          const real = results.filter((c): c is Course => c !== null);
          if (real.length > 0) this.myCourses.set(real);
        });
      },
      error: () => { /* keep mock fallback */ },
    });
  }

  heroEl = viewChild<ElementRef<HTMLElement>>('heroEl');
  mouseX = signal(0);
  mouseY = signal(0);

  // Cube faces — 6 categories displayed on the rotating cube
  cubeFaces = [
    { label:'Code',      icon:'code',       gradient:'linear-gradient(135deg,#7C3AED,#3B82F6)' },
    { label:'Design',    icon:'palette',    gradient:'linear-gradient(135deg,#EC4899,#F87171)' },
    { label:'Data',      icon:'analytics',  gradient:'linear-gradient(135deg,#3B82F6,#06B6D4)' },
    { label:'Cloud',     icon:'cloud',      gradient:'linear-gradient(135deg,#06B6D4,#10B981)' },
    { label:'Marketing', icon:'campaign',   gradient:'linear-gradient(135deg,#F59E0B,#EF4444)' },
    { label:'AI',        icon:'auto_awesome', gradient:'linear-gradient(135deg,#A78BFA,#7C3AED)' },
  ];

  stats = [
    { label:'Hours Learned', value:'142h', icon:'schedule', color:'linear-gradient(135deg,#7C3AED,#A78BFA)',  detail:'You\'ve learned 142 hours total. Up 12h this week.' },
    { label:'Certificates',  value:'4',    icon:'workspace_premium', color:'linear-gradient(135deg,#F59E0B,#EF4444)', detail:'4 certificates earned. 2 more in progress.' },
    { label:'Day Streak',    value:'7 🔥', icon:'local_fire_department', color:'linear-gradient(135deg,#10B981,#06B6D4)', detail:'7-day streak. Hit 14 days for a special badge!' },
  ];

  kpiCards: Array<{ label:string; value:string; countTo:number|null; suffix:string;
                    change:string; positive:boolean; icon:string; gradient:string; }> = [
    { label:'Courses Enrolled', value:'8',    countTo:8,   suffix:'',  change:'+2 this month', positive:true,  icon:'menu_book',    gradient:'linear-gradient(135deg,#7C3AED,#3B82F6)' },
    { label:'Lessons Done',     value:'214',  countTo:214, suffix:'',  change:'+28 this week', positive:true,  icon:'check_circle', gradient:'linear-gradient(135deg,#10B981,#06B6D4)' },
    { label:'Avg Score',        value:'87%',  countTo:87,  suffix:'%', change:'+3% vs last',   positive:true,  icon:'stars',        gradient:'linear-gradient(135deg,#F59E0B,#EF4444)' },
    { label:'Watch Time',       value:'38h',  countTo:38,  suffix:'h', change:'-2h this week', positive:false, icon:'play_circle',  gradient:'linear-gradient(135deg,#EC4899,#F87171)' },
  ];

  activitySeries = [
    { name:'Minutes Learned', data:[45,90,30,110,75,20,60] },
    { name:'Lessons Completed', data:[2,5,1,7,4,1,3] },
  ];

  weekDays = [
    { label:'Mon', active:true }, { label:'Tue', active:true }, { label:'Wed', active:true },
    { label:'Thu', active:true }, { label:'Fri', active:true }, { label:'Sat', active:true },
    { label:'Sun', active:true },
  ];

  @HostListener('mousemove', ['$event'])
  onParallaxMove(e: MouseEvent): void {
    const heroEl = this.heroEl()?.nativeElement;
    if (!heroEl) return;
    const rect = heroEl.getBoundingClientRect();
    if (e.clientY < rect.bottom + 80) {
      // Only track when cursor is near/over the hero
      this.mouseX.set((e.clientX - rect.left - rect.width / 2)  / rect.width);
      this.mouseY.set((e.clientY - rect.top  - rect.height / 2) / rect.height);
    }
  }

  parallax(dx: number, dy: number): string {
    return `translate3d(${(this.mouseX() * dx).toFixed(1)}px, ${(this.mouseY() * dy).toFixed(1)}px, 0)`;
  }

  starStr(r: number): string { return '★'.repeat(Math.round(r)) + '☆'.repeat(5 - Math.round(r)); }
  levelBadge(l: string): string { return l === 'Beginner' ? 'green' : l === 'Intermediate' ? 'amber' : 'red'; }
  catColor(c: string): string {
    const m: Record<string, string> = { Development:'blue', Design:'pink', 'Data Science':'purple', Cloud:'cyan', Marketing:'green', Mobile:'amber' };
    return m[c] ?? 'purple';
  }
}
