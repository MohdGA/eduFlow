import { Component, OnInit, ElementRef, inject, signal, computed, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { COURSES, COURSE_SECTIONS } from '../../core/models/mock-data';
import { Course, Lesson, Section } from '../../core/models/lms.models';
import { CourseService } from '../../core/services/course.service';
import { EnrollmentService } from '../../core/services/enrollment.service';
import { resolveMediaUrl } from '../../core/config/api.config';

@Component({
  selector: 'app-learn',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  template: `
  @if (course(); as c) {
  <div class="learn-wrap">

    <!-- ── Top bar ── -->
    <header class="learn-topbar afd">
      <a routerLink="/my-courses" class="back-btn">
        <mat-icon>arrow_back</mat-icon>
      </a>
      <div class="lt-info">
        <p class="lt-cat">{{ c.category }}</p>
        <h2 class="lt-title">{{ c.title }}</h2>
      </div>
      <div class="lt-progress">
        <div class="lms-progress" style="width:200px"><div class="fill" [style.width.%]="progress()"></div></div>
        <span class="lt-pct">{{ progress() }}%</span>
      </div>
    </header>

    <div class="learn-body">

      <!-- ── Video / content area ── -->
      <main class="learn-main">
        @if (activeLesson(); as l) {
        <div class="player-wrap asi">
          @if (videoFileSrc(); as src) {
            <!-- Native HTML5 video player for /media uploads and direct .mp4 URLs -->
            <div class="player real" #playerEl>
              <video [src]="src" controls preload="metadata"
                     [poster]="''" class="real-video"></video>
            </div>
          } @else if (videoEmbedSrc(); as embed) {
            <!-- YouTube / Vimeo iframe embed -->
            <div class="player real iframe" #playerEl>
              <iframe [src]="embed" frameborder="0" allowfullscreen
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>
            </div>
            <a class="open-external" [href]="l.videoUrl" target="_blank" rel="noopener">
              <mat-icon>open_in_new</mat-icon> Trouble playing? Open video on YouTube
            </a>
          } @else {
            <!-- Placeholder when no video has been attached yet -->
            <div class="player" [class]="c.thumbnail" #playerEl>
              <div class="player-overlay">
                <button class="play-big" (click)="togglePlay()">
                  <mat-icon>{{ playing() ? 'pause' : 'play_arrow' }}</mat-icon>
                </button>
              </div>
              <div class="no-video-note">
                <mat-icon>movie</mat-icon>
                <p>No video attached yet</p>
                <small>An instructor can add a video URL or upload one from the Curriculum editor.</small>
              </div>
              <div class="player-controls">
                <button class="ctrl-btn" (click)="togglePlay()" [matTooltip]="playing() ? 'Pause' : 'Play'">
                  <mat-icon>{{ playing() ? 'pause' : 'play_arrow' }}</mat-icon>
                </button>
                <span class="time">{{ currentTime() }}</span>
                <div class="seek-bar" (click)="seekTo($event)"><div class="seek-fill" [style.width.%]="seekPct()"></div></div>
                <span class="time">{{ l.duration }}</span>
                <button class="ctrl-btn" matTooltip="Subtitles" (click)="toggleSubtitles()" [class.is-on]="subtitlesOn()">
                  <mat-icon>subtitles</mat-icon>
                </button>
                <button class="ctrl-btn" matTooltip="Playback speed" (click)="cyclePlaybackSpeed()">
                  <mat-icon>speed</mat-icon>
                </button>
                <button class="ctrl-btn" matTooltip="Fullscreen" (click)="toggleFullscreen()">
                  <mat-icon>{{ isFullscreen() ? 'fullscreen_exit' : 'fullscreen' }}</mat-icon>
                </button>
              </div>
              @if (subtitlesOn()) {
                <div class="subtitle-line">In this lesson, you'll learn the fundamentals of {{ l.title.toLowerCase() }}…</div>
              }
              @if (playbackSpeed() !== 1) {
                <div class="speed-pill">{{ playbackSpeed() }}×</div>
              }
            </div>
          }

          <!-- Lesson info -->
          <div class="lesson-info afu d2">
            <div class="li-head">
              <div>
                <span class="lms-badge purple">Lesson {{ activeLessonIndex() + 1 }}</span>
                <h1 class="li-title">{{ l.title }}</h1>
                <p class="li-meta">
                  <mat-icon>schedule</mat-icon>{{ l.duration }}
                  <span class="dot">·</span>
                  <mat-icon>{{ iconFor(l.type) }}</mat-icon>{{ l.type }}
                </p>
              </div>
              <div class="li-actions">
                <button class="lia-btn" [class.is-on]="isBookmarked(l.id)"
                        [matTooltip]="isBookmarked(l.id) ? 'Bookmarked' : 'Save bookmark'"
                        (click)="toggleBookmark(l.id)">
                  <mat-icon>{{ isBookmarked(l.id) ? 'bookmark' : 'bookmark_border' }}</mat-icon>
                </button>
                <button class="lia-btn" matTooltip="Open notes" (click)="setTab('Notes')">
                  <mat-icon>edit_note</mat-icon>
                </button>
                <button class="lia-btn" matTooltip="Download transcript" (click)="downloadTranscript(c, l)">
                  <mat-icon>download</mat-icon>
                </button>
              </div>
            </div>

            <p class="li-desc">
              In this lesson, you'll learn the fundamentals of {{ l.title.toLowerCase() }}.
              We'll cover the core concepts, walk through hands-on examples, and build something
              practical you can use in your own projects.
            </p>

            <!-- Tabs: Overview / Resources / Q&A / Notes -->
            <div class="li-tabs">
              @for (t of tabs; track t) {
                <button class="li-tab" [class.active]="activeTab() === t" (click)="setTab(t)">{{ t }}</button>
              }
            </div>

            <div class="li-tab-content afi">
              @switch (activeTab()) {
                @case ('Resources') {
                  <ul class="res-list">
                    <li>
                      <mat-icon>picture_as_pdf</mat-icon><span>Lesson notes.pdf</span>
                      <button class="res-dl" (click)="downloadResource('lesson-notes.txt', resourceTextFor(l, 'notes'))" matTooltip="Download">
                        <mat-icon>download</mat-icon>
                      </button>
                    </li>
                    <li>
                      <mat-icon>code</mat-icon><span>Starter code snippet</span>
                      <button class="res-dl" (click)="downloadResource('starter-code.txt', resourceTextFor(l, 'code'))" matTooltip="Download">
                        <mat-icon>download</mat-icon>
                      </button>
                    </li>
                    <li>
                      <mat-icon>link</mat-icon><span>Reference docs</span>
                      <button class="res-dl" (click)="openReference()" matTooltip="Open external">
                        <mat-icon>open_in_new</mat-icon>
                      </button>
                    </li>
                  </ul>
                }
                @case ('Q&A') {
                  <div class="qa-list">
                    <div class="qa-item">
                      <div class="qa-av">M</div>
                      <div>
                        <p class="qa-q">How do I handle async errors here?</p>
                        <p class="qa-a">Wrap the call in try/catch and use a typed error boundary above the component.</p>
                        <p class="qa-meta">Marcus · 2 days ago · 3 replies</p>
                      </div>
                    </div>
                  </div>
                }
                @case ('Notes') {
                  <textarea
                    class="notes-area"
                    placeholder="Take notes during the lesson…"
                    [ngModel]="notesForActive()"
                    (ngModelChange)="saveNotes($event)"
                    maxlength="20000">
                  </textarea>
                  <p class="notes-hint">
                    @if (notesSaved()) { <mat-icon style="font-size:14px;width:14px;height:14px;color:var(--lms-green)">check_circle</mat-icon> Saved · stored on your device }
                    @else { Notes save automatically as you type }
                  </p>
                }
                @default {
                  <div class="overview-grid">
                    <div class="ov-card">
                      <mat-icon>track_changes</mat-icon>
                      <h4>Learning Goals</h4>
                      <ul>
                        <li>Understand core concepts</li>
                        <li>Apply to a real project</li>
                        <li>Identify common pitfalls</li>
                      </ul>
                    </div>
                    <div class="ov-card">
                      <mat-icon>build</mat-icon>
                      <h4>Prerequisites</h4>
                      <ul>
                        <li>Basic programming knowledge</li>
                        <li>Familiarity with the language</li>
                        <li>A code editor installed</li>
                      </ul>
                    </div>
                  </div>
                }
              }
            </div>

            <!-- Next / Prev -->
            <div class="lesson-nav">
              <button class="ln-btn prev" (click)="prevLesson()" [disabled]="activeLessonIndex() === 0">
                <mat-icon>chevron_left</mat-icon> Previous
              </button>
              <button class="ln-btn next" (click)="markComplete(); nextLesson()">
                {{ l.completed ? 'Next Lesson' : 'Mark as Complete' }}
                <mat-icon>chevron_right</mat-icon>
              </button>
            </div>
          </div>
        </div>
        }
      </main>

      <!-- ── Sidebar curriculum ── -->
      <aside class="curriculum-side asr d2">
        <div class="side-head">
          <h3>Course content</h3>
          <p>{{ totalLessons() }} lessons · {{ c.duration }}</p>
        </div>
        <div class="side-list">
          @for (s of sections; track s.id; let si = $index) {
            <div class="side-section">
              <button class="ss-head" (click)="toggleSection(s.id)">
                <div>
                  <mat-icon class="ss-chev" [class.open]="openSections.has(s.id)">chevron_right</mat-icon>
                  <span class="ss-title">{{ s.title }}</span>
                </div>
                <span class="ss-count">{{ completedIn(s) }}/{{ s.lessons.length }}</span>
              </button>
              @if (openSections.has(s.id)) {
                <ul class="ss-lessons">
                  @for (l of s.lessons; track l.id) {
                    <li class="ssl-item"
                        [class.active]="l.id === activeLessonId()"
                        [class.locked]="l.locked"
                        (click)="selectLesson(l)">
                      <mat-icon class="ssl-icon" [class]="l.completed ? 'done' : ''">
                        {{ l.locked ? 'lock' : (l.completed ? 'check_circle' : iconFor(l.type)) }}
                      </mat-icon>
                      <div class="ssl-info">
                        <p class="ssl-title">{{ l.title }}</p>
                        <p class="ssl-meta">{{ l.duration }}</p>
                      </div>
                    </li>
                  }
                </ul>
              }
            </div>
          }
        </div>
      </aside>

    </div>
  </div>
  }
  `,
  styles: [`
    .learn-wrap { display:flex; flex-direction:column; height: calc(100vh - var(--lms-topnav-h)); }

    /* ── Topbar ── */
    .learn-topbar {
      display:flex; align-items:center; gap:18px;
      padding:14px 32px; border-bottom:1px solid var(--lms-border);
      background:var(--lms-surface); flex-shrink:0;
    }
    .back-btn {
      width:38px; height:38px; border-radius:var(--lms-radius-sm);
      border:1px solid var(--lms-border); background:var(--lms-surface-2);
      display:flex; align-items:center; justify-content:center; color:var(--lms-text-2);
      transition:all .15s;
      mat-icon { font-size:18px; width:18px; height:18px; }
      &:hover { color:var(--lms-text); border-color:var(--lms-border-hover); }
    }
    .lt-info { flex:1; }
    .lt-cat   { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:var(--lms-purple-2); margin:0; }
    .lt-title { font-size:15px; font-weight:700; margin:2px 0 0; color:var(--lms-text); }
    .lt-progress { display:flex; align-items:center; gap:10px; }
    .lt-pct      { font-size:13px; font-weight:700; color:var(--lms-purple-2); min-width:38px; }

    /* ── Body ── */
    .learn-body { display:grid; grid-template-columns:1fr 360px; flex:1; overflow:hidden; }
    .learn-main { overflow-y:auto; padding:24px 32px; }

    /* ── Player ── */
    .player-wrap { max-width:1000px; margin:0 auto; }
    .player {
      position:relative; aspect-ratio:16/9; border-radius:var(--lms-radius);
      overflow:hidden; box-shadow: 0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px var(--lms-border);
      transform-style:preserve-3d;
    }
    .player.real { background: #000; }
    .player.real .real-video, .player.real iframe { width:100%; height:100%; display:block; }
    .open-external { display:inline-flex; align-items:center; gap:6px; margin-top:8px;
      font-size: 12px; color: var(--lms-text-2); text-decoration: none; opacity: .7; }
    .open-external:hover { opacity: 1; color: var(--lms-purple-2); }
    .open-external mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .no-video-note {
      position:absolute; inset:0; display:flex; flex-direction:column; gap:6px;
      align-items:center; justify-content:center; pointer-events:none; text-align:center; padding: 20px;
      color: rgba(255,255,255,0.7); z-index: 2;
    }
    .no-video-note mat-icon { font-size: 48px; width:48px; height:48px; opacity: .35; }
    .no-video-note p { margin: 0; font-weight: 600; }
    .no-video-note small { opacity: .6; max-width: 320px; }
    .player-overlay {
      position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
      background:linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.4));
    }
    .play-big {
      width:88px; height:88px; border-radius:99px; border:none; cursor:pointer;
      background:rgba(255,255,255,0.95); backdrop-filter:blur(12px);
      display:flex; align-items:center; justify-content:center;
      transition:transform .25s;
      animation: btnPulse3d 2.5s ease-in-out infinite;
      mat-icon { color:#0A0A14; font-size:44px; width:44px; height:44px; }
      &:hover { transform:scale(1.08); }
    }
    .player-controls {
      position:absolute; left:0; right:0; bottom:0;
      display:flex; align-items:center; gap:10px;
      padding:14px 18px;
      background:linear-gradient(180deg, transparent, rgba(0,0,0,0.85));
    }
    .ctrl-btn {
      width:34px; height:34px; border-radius:8px; border:none; cursor:pointer;
      background:transparent; color:#fff;
      display:flex; align-items:center; justify-content:center;
      transition:background .15s;
      mat-icon { font-size:18px; width:18px; height:18px; }
      &:hover { background:rgba(255,255,255,0.1); }
    }
    .time { color:#fff; font-size:12px; font-variant-numeric:tabular-nums; opacity:.85; }
    .seek-bar {
      flex:1; height:5px; background:rgba(255,255,255,0.2); border-radius:99px; overflow:hidden;
      cursor:pointer;
    }
    .seek-fill { height:100%; background:var(--lms-gradient); border-radius:99px; }

    /* ── Lesson info ── */
    .lesson-info { padding:32px 4px 24px; }
    .li-head { display:flex; justify-content:space-between; align-items:flex-start; gap:20px; margin-bottom:18px; }
    .li-title { font-size:28px; font-weight:900; margin:10px 0 8px; letter-spacing:-.5px; line-height:1.2; }
    .li-meta  { display:flex; align-items:center; gap:6px; font-size:13px; color:var(--lms-text-2); margin:0;
      .dot { color:var(--lms-text-muted); }
      mat-icon { font-size:15px; width:15px; height:15px; }
    }
    .li-actions { display:flex; gap:6px; }
    .lia-btn {
      width:38px; height:38px; border-radius:var(--lms-radius-sm);
      border:1px solid var(--lms-border); background:var(--lms-surface-2);
      cursor:pointer; color:var(--lms-text-2);
      display:flex; align-items:center; justify-content:center;
      transition:all .15s;
      mat-icon { font-size:18px; width:18px; height:18px; }
      &:hover { color:var(--lms-purple-2); border-color:var(--lms-purple); }
      &.is-on { color: var(--lms-amber); border-color: var(--lms-amber); }
    }
    .ctrl-btn.is-on { background: rgba(167,139,250,0.2); color: var(--lms-purple-2); }
    .subtitle-line {
      position: absolute; left: 50%; bottom: 64px;
      transform: translateX(-50%);
      max-width: 80%; padding: 8px 16px;
      background: rgba(0,0,0,0.75); color: #fff;
      font-size: 13px; border-radius: 6px;
      text-align: center;
    }
    .speed-pill {
      position: absolute; top: 12px; right: 12px;
      padding: 4px 10px; border-radius: 99px;
      background: rgba(0,0,0,0.7); backdrop-filter: blur(8px);
      color: #fff; font-size: 11px; font-weight: 800;
      letter-spacing: .5px;
    }
    .notes-hint { font-size: 11px; color: var(--lms-text-muted); margin-top: 6px;
                  display: flex; align-items: center; gap: 4px; }
    .li-desc { font-size:14.5px; line-height:1.7; color:var(--lms-text-2); margin:0 0 24px; }

    /* Tabs */
    .li-tabs { display:flex; gap:2px; border-bottom:1px solid var(--lms-border); margin-bottom:20px; }
    .li-tab {
      padding:10px 18px; background:none; border:none; cursor:pointer;
      font-size:13.5px; font-weight:600; color:var(--lms-text-2);
      border-bottom:2px solid transparent; margin-bottom:-1px;
      transition:all .15s;
      &:hover { color:var(--lms-text); }
      &.active { color:var(--lms-text); border-color:var(--lms-purple); }
    }

    /* Overview cards */
    .overview-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
    .ov-card {
      background:var(--lms-surface); border:1px solid var(--lms-border);
      border-radius:var(--lms-radius-sm); padding:20px;
      transition:transform .25s, border-color .2s;
      &:hover { transform:translateY(-3px) perspective(800px) rotateX(2deg); border-color:var(--lms-purple); }
      mat-icon { color:var(--lms-purple-2); font-size:22px; width:22px; height:22px; }
      h4 { font-size:14px; font-weight:700; margin:10px 0 12px; }
      ul { margin:0; padding-left:20px; }
      li { font-size:13px; color:var(--lms-text-2); line-height:1.7; }
    }

    /* Resources */
    .res-list { list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:8px; }
    .res-list li {
      display:flex; align-items:center; gap:12px;
      padding:14px 16px; background:var(--lms-surface); border:1px solid var(--lms-border); border-radius:var(--lms-radius-sm);
      transition:border-color .15s;
      &:hover { border-color:var(--lms-purple); }
      > mat-icon { color:var(--lms-purple-2); font-size:20px; width:20px; height:20px; }
      span { flex:1; font-size:13.5px; }
    }
    .res-dl {
      width:34px; height:34px; border-radius:8px; border:none; cursor:pointer;
      background:var(--lms-surface-2); color:var(--lms-text-2);
      display:flex; align-items:center; justify-content:center;
      mat-icon { font-size:17px; width:17px; height:17px; }
      &:hover { color:var(--lms-purple-2); }
    }

    /* Q&A */
    .qa-list { display:flex; flex-direction:column; gap:14px; }
    .qa-item { display:flex; gap:14px; padding:18px; background:var(--lms-surface); border:1px solid var(--lms-border); border-radius:var(--lms-radius-sm); }
    .qa-av  { width:36px; height:36px; border-radius:99px; background:var(--lms-gradient); color:#fff; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .qa-q   { font-size:14px; font-weight:700; margin:0 0 6px; }
    .qa-a   { font-size:13px; color:var(--lms-text-2); margin:0 0 6px; line-height:1.6; }
    .qa-meta { font-size:11px; color:var(--lms-text-muted); margin:0; }

    /* Notes */
    .notes-area {
      width:100%; min-height:200px;
      background:var(--lms-surface); border:1px solid var(--lms-border); border-radius:var(--lms-radius-sm);
      color:var(--lms-text); font-family:inherit; font-size:14px; padding:16px; resize:vertical;
      &:focus { outline:none; border-color:var(--lms-purple); }
    }

    /* Lesson nav */
    .lesson-nav { display:flex; justify-content:space-between; gap:10px; margin-top:32px; padding-top:24px; border-top:1px solid var(--lms-border); }
    .ln-btn {
      display:flex; align-items:center; gap:6px;
      padding:12px 22px; border-radius:var(--lms-radius-sm);
      font-size:13.5px; font-weight:700; cursor:pointer;
      transition:all .15s;
      mat-icon { font-size:18px; width:18px; height:18px; }
      &.prev { background:var(--lms-surface-2); border:1px solid var(--lms-border); color:var(--lms-text); }
      &.prev:hover:not(:disabled) { border-color:var(--lms-border-hover); }
      &.prev:disabled { opacity:.4; cursor:not-allowed; }
      &.next { background:var(--lms-gradient); border:none; color:#fff; box-shadow:var(--lms-shadow-purple); }
      &.next:hover { opacity:.9; transform:translateY(-1px); }
    }

    /* ── Sidebar ── */
    .curriculum-side { background:var(--lms-surface); border-left:1px solid var(--lms-border); overflow-y:auto; }
    .side-head { padding:20px; border-bottom:1px solid var(--lms-border); position:sticky; top:0; background:var(--lms-surface); z-index:2;
      h3 { font-size:16px; font-weight:800; margin:0 0 4px; }
      p  { font-size:12px; color:var(--lms-text-2); margin:0; }
    }
    .side-list { padding:8px; }
    .side-section { margin-bottom:4px; }
    .ss-head {
      width:100%; padding:12px 14px;
      background:none; border:none; cursor:pointer; color:var(--lms-text);
      display:flex; justify-content:space-between; align-items:center;
      border-radius:var(--lms-radius-sm);
      transition:background .15s;
      > div { display:flex; align-items:center; gap:6px; }
      &:hover { background:var(--lms-surface-2); }
    }
    .ss-chev { font-size:18px; width:18px; height:18px; color:var(--lms-text-2); transition:transform .2s;
      &.open { transform:rotate(90deg); color:var(--lms-purple-2); }
    }
    .ss-title { font-size:13px; font-weight:700; }
    .ss-count { font-size:11px; color:var(--lms-text-muted); }

    .ss-lessons { list-style:none; padding:4px 0 0 24px; margin:0; }
    .ssl-item {
      display:flex; align-items:center; gap:10px; padding:9px 12px; cursor:pointer;
      border-radius:var(--lms-radius-xs); transition:all .15s;
      &:hover { background:var(--lms-surface-2); }
      &.active { background:var(--lms-purple-dim); .ssl-title { color:var(--lms-purple-2); font-weight:700; } }
      &.locked { opacity:.4; cursor:not-allowed; }
    }
    .ssl-icon { font-size:16px; width:16px; height:16px; color:var(--lms-text-muted); flex-shrink:0;
      &.done { color:var(--lms-green); }
    }
    .ssl-info { flex:1; min-width:0; }
    .ssl-title { font-size:12.5px; margin:0; color:var(--lms-text-2); line-height:1.3; }
    .ssl-meta  { font-size:11px; color:var(--lms-text-muted); margin:1px 0 0; }

    /* ── Thumbnails ── */
    .grad-blue   { background: linear-gradient(135deg,#1e3a8a 0%,#3b82f6 100%); }
    .grad-pink   { background: linear-gradient(135deg,#831843 0%,#ec4899 100%); }
    .grad-purple { background: linear-gradient(135deg,#4c1d95 0%,#7c3aed 100%); }
    .grad-amber  { background: linear-gradient(135deg,#78350f 0%,#f59e0b 100%); }
    .grad-cyan   { background: linear-gradient(135deg,#164e63 0%,#06b6d4 100%); }
    .grad-green  { background: linear-gradient(135deg,#064e3b 0%,#10b981 100%); }
  `]
})
export class LearnComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private snack = inject(MatSnackBar);
  private courseApi = inject(CourseService);
  private enrollApi = inject(EnrollmentService);

  playerEl = viewChild<ElementRef<HTMLElement>>('playerEl');

  course = signal<Course | null>(null);
  enrollmentId = signal<string | null>(null);
  sections: Section[] = JSON.parse(JSON.stringify(COURSE_SECTIONS));
  openSections = new Set<string>();

  activeLessonId = signal<string>('');
  activeTab = signal<'Overview' | 'Resources' | 'Q&A' | 'Notes'>('Overview');
  tabs: Array<'Overview' | 'Resources' | 'Q&A' | 'Notes'> = ['Overview', 'Resources', 'Q&A', 'Notes'];

  playing = signal(false);
  currentTime = signal('0:00');
  seekPct = signal(0);

  // ── Player extras ──
  subtitlesOn   = signal(false);
  playbackSpeed = signal(1);
  isFullscreen  = signal(false);
  private playbackSpeeds = [1, 1.25, 1.5, 1.75, 2];

  // ── Bookmarks / Notes state ──
  private bookmarks  = signal<Set<string>>(new Set());
  private notesById  = signal<Record<string, string>>({});
  notesSaved         = signal(false);
  private notesSaveDebounce: ReturnType<typeof setTimeout> | null = null;
  private progressSaveDebounce: ReturnType<typeof setTimeout> | null = null;

  // Storage keys are namespaced per course
  private bookmarkKey(courseId: string): string { return `eduflow.bookmarks.${courseId}`; }
  private notesKey(courseId: string):    string { return `eduflow.notes.${courseId}`; }

  allLessons = computed<Lesson[]>(() => this.sections.flatMap(s => s.lessons));

  activeLesson = computed<Lesson | undefined>(() => this.allLessons().find(l => l.id === this.activeLessonId()));

  activeLessonIndex = computed<number>(() => this.allLessons().findIndex(l => l.id === this.activeLessonId()));

  progress = computed<number>(() => {
    const all = this.allLessons();
    if (!all.length) return 0;
    return Math.round((all.filter(l => l.completed).length / all.length) * 100);
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.course.set(COURSES[0]); return; }

    // Load real course (sections + lessons) from backend
    this.courseApi.get(id).subscribe({
      next: detail => {
        const sections: Section[] = detail.sections.map(s => ({
          id: s.id, title: s.title,
          lessons: s.lessons.map(l => ({
            id: l.id, title: l.title, duration: l.duration,
            type: l.type.toLowerCase() as 'video' | 'reading' | 'quiz',
            completed: false, locked: false,
            videoUrl: l.videoUrl ?? null,
            description: l.description ?? '',
          })),
        }));
        this.sections = sections;
        const c: Course = {
          id: detail.id, title: detail.title, subtitle: detail.subtitle,
          instructor: detail.instructorName, instructorAvatar: (detail.instructorAvatar || '?'),
          thumbnail: detail.thumbnailGradient || 'grad-purple',
          category: detail.category, level: detail.level,
          rating: detail.rating, reviewCount: detail.reviewCount, studentCount: detail.studentCount,
          duration: detail.duration,
          lessonCount: sections.reduce((s, sec) => s + sec.lessons.length, 0),
          price: detail.price, tags: [],
        };
        this.course.set(c);
        for (const s of this.sections) this.openSections.add(s.id);
        this.loadBookmarks(c.id);
        this.loadNotes(c.id);

        // Re-apply completed flags from saved progress (localStorage cache)
        this.applyCompletedFromCache(c.id);

        const first = this.allLessons().find(l => !l.completed && !l.locked) ?? this.allLessons()[0];
        if (first) this.activeLessonId.set(first.id);
      },
      error: () => {
        // Fallback to mock if API fails
        const fallback = COURSES.find(co => co.id === id) ?? COURSES[0];
        this.course.set(fallback);
        for (const s of this.sections) this.openSections.add(s.id);
        const first = this.allLessons().find(l => !l.completed && !l.locked) ?? this.allLessons()[0];
        if (first) this.activeLessonId.set(first.id);
      },
    });

    // Find the user's enrollment for this course so we can save progress
    this.enrollApi.myEnrollments().subscribe({
      next: list => {
        const en = list.find(e => e.courseId === id);
        if (en) this.enrollmentId.set(en.id);
      },
      error: () => { /* not logged in or no enrollment — feature still works locally */ },
    });
  }

  // ── Player controls ──
  togglePlay(): void {
    this.playing.update(p => !p);
    // Simulated playback: animate seek bar while playing
    if (this.playing()) this.simulatePlayback();
  }

  private simulatePlayback(): void {
    const step = () => {
      if (!this.playing()) return;
      const next = Math.min(100, this.seekPct() + (this.playbackSpeed() * 0.4));
      this.seekPct.set(next);
      const lessonSecs = this.parseDurationSecs(this.activeLesson()?.duration ?? '0:00');
      this.currentTime.set(this.formatSecs(Math.round(lessonSecs * next / 100)));
      if (next >= 100) {
        this.playing.set(false);
        this.snack.open('Lesson finished — auto-marked complete', 'OK', { duration: 2200, panelClass: 'snack-ok' });
        this.markComplete();
        return;
      }
      requestAnimationFrame(() => setTimeout(step, 250));
    };
    step();
  }

  private parseDurationSecs(d: string): number {
    if (d.includes(':')) {
      const [m, s] = d.split(':').map(Number);
      return m * 60 + (s || 0);
    }
    const m = parseInt(d, 10) || 0;
    return m * 60;
  }
  private formatSecs(secs: number): string {
    const m = Math.floor(secs / 60), s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  seekTo(e: MouseEvent): void {
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    this.seekPct.set(pct);
    const lessonSecs = this.parseDurationSecs(this.activeLesson()?.duration ?? '0:00');
    this.currentTime.set(this.formatSecs(Math.round(lessonSecs * pct / 100)));
  }

  toggleSubtitles(): void { this.subtitlesOn.update(v => !v); }

  cyclePlaybackSpeed(): void {
    const cur = this.playbackSpeed();
    const idx = this.playbackSpeeds.indexOf(cur);
    const next = this.playbackSpeeds[(idx + 1) % this.playbackSpeeds.length];
    this.playbackSpeed.set(next);
    this.snack.open(`Playback speed: ${next}×`, 'OK', { duration: 1500 });
  }

  toggleFullscreen(): void {
    const el = this.playerEl()?.nativeElement;
    if (!el) return;
    const doc = document as Document & { webkitExitFullscreen?: () => Promise<void> };
    const elx = el as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
    if (this.isFullscreen() || document.fullscreenElement) {
      (doc.exitFullscreen?.() ?? doc.webkitExitFullscreen?.())?.catch(() => {});
      this.isFullscreen.set(false);
    } else {
      (elx.requestFullscreen?.() ?? elx.webkitRequestFullscreen?.())?.catch(() => {});
      this.isFullscreen.set(true);
    }
  }

  // ── Bookmarks ──
  isBookmarked(lessonId: string): boolean { return this.bookmarks().has(lessonId); }
  toggleBookmark(lessonId: string): void {
    const c = this.course(); if (!c) return;
    const set = new Set(this.bookmarks());
    if (set.has(lessonId)) set.delete(lessonId); else set.add(lessonId);
    this.bookmarks.set(set);
    try { localStorage.setItem(this.bookmarkKey(c.id), JSON.stringify([...set])); } catch { /* ignore */ }
    this.snack.open(set.has(lessonId) ? 'Bookmark added' : 'Bookmark removed', 'OK', { duration: 1500 });
  }
  private loadBookmarks(courseId: string): void {
    try {
      const raw = localStorage.getItem(this.bookmarkKey(courseId));
      if (raw) this.bookmarks.set(new Set(JSON.parse(raw)));
    } catch { /* ignore */ }
  }

  // ── Notes ──
  notesForActive(): string {
    const id = this.activeLessonId();
    return this.notesById()[id] ?? '';
  }
  saveNotes(value: string): void {
    const c = this.course(); if (!c) return;
    const id = this.activeLessonId();
    const updated = { ...this.notesById(), [id]: value };
    this.notesById.set(updated);
    this.notesSaved.set(false);
    if (this.notesSaveDebounce) clearTimeout(this.notesSaveDebounce);
    this.notesSaveDebounce = setTimeout(() => {
      try { localStorage.setItem(this.notesKey(c.id), JSON.stringify(updated)); } catch { /* ignore */ }
      this.notesSaved.set(true);
    }, 350);
  }
  private loadNotes(courseId: string): void {
    try {
      const raw = localStorage.getItem(this.notesKey(courseId));
      if (raw) this.notesById.set(JSON.parse(raw));
    } catch { /* ignore */ }
  }

  // ── Resources ──
  downloadTranscript(c: Course, l: Lesson): void {
    const text = `${c.title}\n${'='.repeat(c.title.length)}\n\nLesson: ${l.title}\nDuration: ${l.duration}\n\n` +
                 `In this lesson, you'll learn the fundamentals of ${l.title.toLowerCase()}.\n` +
                 `We'll cover core concepts, walk through hands-on examples, and build something practical.\n`;
    this.downloadResource(`${l.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-transcript.txt`, text);
  }

  resourceTextFor(l: Lesson, kind: 'notes' | 'code'): string {
    if (kind === 'code') {
      return `// Starter code for: ${l.title}\n// Generated from EduFlow\n\nfunction main() {\n  console.log('Starting…');\n}\n\nmain();\n`;
    }
    return `Lesson notes: ${l.title}\n${'-'.repeat(l.title.length + 14)}\n\n- Key concept #1\n- Key concept #2\n- Practice exercise\n`;
  }

  downloadResource(filename: string, content: string): void {
    try {
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      this.snack.open(`Downloaded ${filename}`, 'OK', { duration: 2000, panelClass: 'snack-ok' });
    } catch {
      this.snack.open('Download failed', 'OK', { duration: 2500, panelClass: 'snack-err' });
    }
  }

  // ── Video source resolution ─────────────────────────────────────────────
  private sanitizer = inject(DomSanitizer);

  /** Direct file URL for a <video> tag, or null. Handles /media/... and direct .mp4/.webm. */
  videoFileSrc(): string | null {
    const url = this.activeLesson()?.videoUrl ?? null;
    if (!url) return null;
    const resolved = resolveMediaUrl(url);
    if (!resolved) return null;
    if (/^https?:\/\/(www\.)?(youtube\.com|youtu\.be|player\.vimeo\.com|vimeo\.com)/i.test(resolved)) return null;
    return resolved;
  }

  /** Iframe embed URL for YouTube / Vimeo, sanitized for srcdoc binding. */
  videoEmbedSrc(): SafeResourceUrl | null {
    const url = this.activeLesson()?.videoUrl ?? null;
    if (!url) return null;
    let embed: string | null = null;

    // YouTube — both watch and short URLs
    const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i);
    if (yt) embed = `https://www.youtube.com/embed/${yt[1]}`;

    // Vimeo
    const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
    if (vm) embed = `https://player.vimeo.com/video/${vm[1]}`;

    return embed ? this.sanitizer.bypassSecurityTrustResourceUrl(embed) : null;
  }

  hasRealVideo(): boolean {
    return !!(this.videoFileSrc() || this.videoEmbedSrc());
  }

  openReference(): void {
    const l = this.activeLesson();
    const c = this.course();
    const query = encodeURIComponent(`${c?.category ?? ''} ${l?.title ?? 'documentation'}`.trim());
    const url = `https://www.google.com/search?q=${query}+docs`;
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (!win) {
      this.snack.open('Pop-ups are blocked — allow pop-ups to open reference docs', 'OK', { duration: 3000, panelClass: 'snack-err' });
    }
  }

  // ── Progress ──
  private applyCompletedFromCache(courseId: string): void {
    try {
      const raw = localStorage.getItem(`eduflow.completed.${courseId}`);
      if (!raw) return;
      const done = new Set<string>(JSON.parse(raw));
      for (const l of this.allLessons()) l.completed = done.has(l.id);
    } catch { /* ignore */ }
  }
  private saveCompletedLocal(courseId: string): void {
    try {
      const done = this.allLessons().filter(l => l.completed).map(l => l.id);
      localStorage.setItem(`eduflow.completed.${courseId}`, JSON.stringify(done));
    } catch { /* ignore */ }
  }

  private syncProgressToBackend(): void {
    const enrollmentId = this.enrollmentId();
    if (!enrollmentId) return;
    const pct = this.progress();
    if (this.progressSaveDebounce) clearTimeout(this.progressSaveDebounce);
    this.progressSaveDebounce = setTimeout(() => {
      this.enrollApi.updateProgress(enrollmentId, pct).subscribe({
        next: () => { /* silent — keep UI clean */ },
        error: () => { /* ignore */ },
      });
    }, 500);
  }

  // (progress percent is computed by the existing `progress` signal above)

  selectLesson(l: Lesson): void {
    if (l.locked) return;
    this.activeLessonId.set(l.id);
    this.playing.set(false);
    this.seekPct.set(0);
  }

  setTab(t: typeof this.tabs[number]): void { this.activeTab.set(t); }
  toggleSection(id: string): void {
    if (this.openSections.has(id)) this.openSections.delete(id);
    else this.openSections.add(id);
  }

  markComplete(): void {
    const l = this.activeLesson();
    const c = this.course();
    if (!l || !c) return;
    if (!l.completed) {
      l.completed = true;
      this.saveCompletedLocal(c.id);
      this.syncProgressToBackend();
      this.snack.open(`✓ "${l.title}" complete`, 'OK', { duration: 2000, panelClass: 'snack-ok' });
    }
  }

  nextLesson(): void {
    const all = this.allLessons();
    const idx = this.activeLessonIndex();
    const next = all.slice(idx + 1).find(l => !l.locked);
    if (next) this.selectLesson(next);
  }

  prevLesson(): void {
    const all = this.allLessons();
    const idx = this.activeLessonIndex();
    if (idx > 0) this.selectLesson(all[idx - 1]);
  }

  completedIn(s: Section): number { return s.lessons.filter(l => l.completed).length; }
  totalLessons(): number { return this.allLessons().length; }
  iconFor(type: string): string { return type === 'video' ? 'play_circle_outline' : type === 'quiz' ? 'quiz' : 'article'; }
}
