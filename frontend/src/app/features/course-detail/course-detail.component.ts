import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { INSTRUCTOR, REVIEWS } from '../../core/models/mock-data';
import { Course, Section } from '../../core/models/lms.models';
import { CourseService } from '../../core/services/course.service';
import { resolveMediaUrl } from '../../core/config/api.config';
import { AuthService } from '../../core/services/auth.service';

const THUMB_BY_CATEGORY: Record<string, string> = {
  Development: 'grad-blue', Design: 'grad-pink', 'Data Science': 'grad-purple',
  Cloud: 'grad-cyan', Marketing: 'grad-green', Mobile: 'grad-amber',
};
const initialFor = (name: string) => (name?.trim()?.[0]?.toUpperCase() ?? '?');

@Component({
  selector: 'app-course-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatButtonModule, MatTabsModule],
  template: `
  @if (course(); as c) {
  <div class="cd-wrap">

    <!-- ── Hero ── -->
    <div class="cd-hero afd">
      <div class="blob b1"></div>
      <div class="blob b2"></div>

      <div class="cd-hero-inner">
        <div class="cd-left">
          <a routerLink="/catalog" class="back-link">
            <mat-icon>arrow_back</mat-icon> Back to catalog
          </a>
          <div class="cd-badges">
            <span class="lms-badge purple">{{ c.category }}</span>
            <span class="lms-badge" [class]="levelBadge(c.level)">{{ c.level }}</span>
            @if (c.isBestseller) { <span class="lms-badge amber">⭐ Bestseller</span> }
          </div>
          <h1 class="cd-title">{{ c.title }}</h1>
          <p class="cd-sub">{{ c.subtitle }}</p>

          <div class="cd-meta">
            <div class="stars">{{ starStr(c.rating) }}</div>
            <span class="meta-val">{{ c.rating }}</span>
            <span class="meta-muted">({{ c.reviewCount | number }} reviews)</span>
            <span class="meta-dot">·</span>
            <span class="meta-muted">{{ c.studentCount | number }} students</span>
          </div>

          <div class="cd-instructor">
            <div class="instr-av-lg">{{ c.instructorAvatar }}</div>
            <div>
              <p class="instr-by">Created by</p>
              <p class="instr-name-lg">{{ c.instructor }}</p>
            </div>
          </div>
        </div>

        <!-- Sticky enroll card -->
        <aside class="enroll-card asi d2 tilt-3d">
          <div class="enroll-thumb" [class]="c.thumbnail" (click)="onPreview()" matTooltip="Watch course intro">
            @if (c.imageUrl) {
              <img [src]="c.imageUrl" [alt]="c.title" loading="lazy" class="thumb-img">
            }
            <div class="enroll-play"><mat-icon>play_circle_filled</mat-icon></div>
            <p class="preview-text">Preview this course</p>
          </div>
          <div class="enroll-body">
            <div class="price-row">
              <span class="price-main">\${{ c.price }}</span>
              <span class="price-old">\${{ c.price * 2 }}</span>
              <span class="price-off">50% off</span>
            </div>
            <button class="enroll-btn" (click)="enroll()" [disabled]="enrolling()">
              @if (enrolling()) {
                <mat-icon class="spin">progress_activity</mat-icon>
              } @else {
                <mat-icon>shopping_cart</mat-icon>
              }
              {{ enrolling() ? 'Enrolling…' : 'Enroll Now' }}
            </button>
            <a [routerLink]="['/learn', c.id]" class="enroll-secondary">
              <mat-icon>play_arrow</mat-icon> Start Learning
            </a>
            <div class="enroll-incl">
              <p class="incl-title">This course includes:</p>
              <ul>
                <li><mat-icon>play_lesson</mat-icon>{{ c.lessonCount }} on-demand lessons</li>
                <li><mat-icon>schedule</mat-icon>{{ c.duration }} of content</li>
                <li><mat-icon>workspace_premium</mat-icon>Certificate of completion</li>
                <li><mat-icon>all_inclusive</mat-icon>Lifetime access</li>
                <li><mat-icon>devices</mat-icon>Mobile and TV access</li>
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </div>

    <!-- ── Body ── -->
    <div class="cd-body">
      <div class="cd-main">
        <mat-tab-group animationDuration="250ms">
          <!-- Curriculum -->
          <mat-tab label="Curriculum">
            <div class="tab-content afi">
              <div class="curriculum-summary">
                <strong>{{ sections().length }} sections</strong> · {{ totalLessons() }} lessons · {{ c.duration }} total
              </div>
              @for (s of sections(); track s.id; let si = $index) {
                <div class="section-card afu" [style.animation-delay.s]="si * 0.05">
                  <button class="section-header" (click)="toggleSection(s.id)">
                    <div>
                      <mat-icon class="sh-chev" [class.open]="openSections.has(s.id)">chevron_right</mat-icon>
                      <span class="sh-title">{{ s.title }}</span>
                    </div>
                    <span class="sh-meta">{{ s.lessons.length }} lessons</span>
                  </button>
                  @if (openSections.has(s.id)) {
                    <ul class="lesson-list afi">
                      @for (l of s.lessons; track l.id) {
                        <li class="lesson-item" [class.locked]="l.locked">
                          <mat-icon class="lesson-type-icon" [class]="l.type">
                            {{ l.locked ? 'lock' : (l.completed ? 'check_circle' : iconFor(l.type)) }}
                          </mat-icon>
                          <span class="lesson-title">{{ l.title }}</span>
                          <span class="lesson-duration">{{ l.duration }}</span>
                        </li>
                      }
                    </ul>
                  }
                </div>
              }
            </div>
          </mat-tab>

          <!-- Description -->
          <mat-tab label="About">
            <div class="tab-content afi">
              <h3 class="about-h">What you'll learn</h3>
              <div class="learn-grid">
                @for (item of learningOutcomes; track item) {
                  <div class="learn-item"><mat-icon>check</mat-icon><span>{{ item }}</span></div>
                }
              </div>

              <h3 class="about-h">Course description</h3>
              <p class="about-p">
                Master {{ c.title.toLowerCase() }} through hands-on projects, real-world examples, and expert guidance.
                This {{ c.duration }} course covers everything from fundamentals to advanced techniques.
              </p>
              <p class="about-p">
                Designed for {{ c.level.toLowerCase() }} learners, you'll build {{ c.lessonCount }} lessons worth of
                practical skills that translate directly to professional work.
              </p>

              <h3 class="about-h">Skills you'll gain</h3>
              <div class="skill-tags">
                @for (t of c.tags; track t) { <span class="skill-tag">{{ t }}</span> }
              </div>
            </div>
          </mat-tab>

          <!-- Instructor -->
          <mat-tab label="Instructor">
            <div class="tab-content afi">
              <div class="instr-card">
                <div class="instr-av-xl">{{ c.instructorAvatar }}</div>
                <div class="instr-info">
                  <h3 class="instr-title">{{ instructor.name }}</h3>
                  <p class="instr-role">{{ instructor.title }}</p>
                  <div class="instr-stats">
                    <div><mat-icon>star</mat-icon><strong>{{ instructor.rating }}</strong> rating</div>
                    <div><mat-icon>group</mat-icon><strong>{{ instructor.students | number }}</strong> students</div>
                    <div><mat-icon>menu_book</mat-icon><strong>{{ instructor.courses }}</strong> courses</div>
                  </div>
                  <p class="instr-bio">{{ instructor.bio }}</p>
                </div>
              </div>
            </div>
          </mat-tab>

          <!-- Reviews -->
          <mat-tab [label]="'Reviews (' + reviews.length + ')'">
            <div class="tab-content afi">
              <div class="reviews-summary">
                <div class="rs-main">
                  <span class="rs-rating">{{ c.rating }}</span>
                  <div class="stars" style="font-size:24px">{{ starStr(c.rating) }}</div>
                  <p class="rs-count">{{ c.reviewCount | number }} reviews</p>
                </div>
              </div>
              <div class="reviews-list">
                @for (r of reviews; track r.id) {
                  <div class="review-item afu">
                    <div class="rev-av">{{ r.avatar }}</div>
                    <div class="rev-body">
                      <div class="rev-head">
                        <strong>{{ r.user }}</strong>
                        <span class="stars">{{ starStr(r.rating) }}</span>
                        <span class="rev-date">{{ r.date }}</span>
                      </div>
                      <p class="rev-text">{{ r.comment }}</p>
                    </div>
                  </div>
                }
              </div>
            </div>
          </mat-tab>
        </mat-tab-group>
      </div>
    </div>

  </div>
  } @else {
    <div class="empty-state">
      <mat-icon>error_outline</mat-icon>
      <p>Course not found.</p>
      <a routerLink="/catalog" mat-raised-button color="primary">Back to catalog</a>
    </div>
  }
  `,
  styles: [`
    .cd-wrap { padding-bottom: 60px; }

    /* ── Hero ── */
    .cd-hero {
      position:relative; background:var(--lms-surface);
      border-bottom: 1px solid var(--lms-border);
      padding: 32px 40px 56px; overflow:hidden;
    }
    .blob {
      &.b1 { width:500px; height:500px; background:rgba(124,58,237,0.13); top:-150px; left:-150px; animation:floatBlob 14s ease-in-out infinite; }
      &.b2 { width:400px; height:400px; background:rgba(59,130,246,0.13); bottom:-200px; right:-100px; animation:floatBlob 16s ease-in-out infinite reverse; }
    }
    .cd-hero-inner { max-width:1300px; margin:0 auto; display:grid; grid-template-columns:1fr 380px; gap:48px; position:relative; z-index:1; }

    .back-link { display:inline-flex; align-items:center; gap:4px; font-size:13px; color:var(--lms-text-2); text-decoration:none; margin-bottom:20px;
      mat-icon { font-size:16px; width:16px; height:16px; }
      &:hover { color:var(--lms-text); }
    }
    .cd-badges { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:14px; }
    .cd-title { font-size:36px; font-weight:900; line-height:1.2; margin:0 0 10px; letter-spacing:-.6px; }
    .cd-sub   { font-size:16px; color:var(--lms-text-2); margin:0 0 18px; line-height:1.5; }

    .cd-meta  { display:flex; align-items:center; gap:6px; font-size:13px; margin-bottom:24px; flex-wrap:wrap; }
    .meta-val { font-weight:700; color:var(--lms-amber); }
    .meta-muted { color:var(--lms-text-2); }
    .meta-dot { color:var(--lms-text-muted); }

    .cd-instructor { display:flex; align-items:center; gap:12px; }
    .instr-av-lg {
      width:44px; height:44px; border-radius:99px; background:var(--lms-gradient); color:#fff;
      font-size:16px; font-weight:700; display:flex; align-items:center; justify-content:center;
    }
    .instr-by { font-size:11px; color:var(--lms-text-muted); margin:0; text-transform:uppercase; letter-spacing:.5px; }
    .instr-name-lg { font-size:14px; font-weight:700; margin:2px 0 0; }

    /* ── Enroll card ── */
    .enroll-card {
      background:var(--lms-surface-2); border:1px solid var(--lms-border);
      border-radius:var(--lms-radius); overflow:hidden;
      position:sticky; top:84px; align-self:start;
      box-shadow: 0 20px 60px rgba(0,0,0,0.4);
    }
    .enroll-thumb {
      height:200px; position:relative;
      display:flex; align-items:center; justify-content:center; flex-direction:column;
    }
    .enroll-play {
      width:64px; height:64px; border-radius:99px;
      background:rgba(0,0,0,0.5); backdrop-filter:blur(8px);
      display:flex; align-items:center; justify-content:center;
      transition:transform .2s; cursor:pointer;
      mat-icon { color:#fff; font-size:36px; width:36px; height:36px; }
      &:hover { transform:scale(1.1); }
    }
    .preview-text { color:#fff; font-size:13px; font-weight:600; margin:10px 0 0; opacity:.9; }

    .enroll-body { padding:24px; }
    .price-row { display:flex; align-items:baseline; gap:8px; margin-bottom:18px; }
    .price-main { font-size:32px; font-weight:900; letter-spacing:-1px; }
    .price-old  { font-size:14px; color:var(--lms-text-muted); text-decoration:line-through; }
    .price-off  { font-size:11px; font-weight:700; background:var(--lms-red-dim); color:var(--lms-red); padding:2px 8px; border-radius:6px; }

    .enroll-btn {
      width:100%; padding:14px; border-radius:var(--lms-radius-sm); border:none;
      background:var(--lms-gradient); color:#fff; font-size:14px; font-weight:700;
      cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;
      box-shadow:var(--lms-shadow-purple);
      transition:opacity .2s, transform .15s;
      animation: btnPulse3d 2.5s ease-in-out infinite;
      mat-icon { font-size:18px; width:18px; height:18px; }
      &:hover { opacity:.9; transform:translateY(-1px); }
    }
    .enroll-secondary {
      display:flex; align-items:center; justify-content:center; gap:6px;
      width:100%; padding:12px; border-radius:var(--lms-radius-sm);
      border:1px solid var(--lms-border); background:transparent;
      font-size:13px; font-weight:600; color:var(--lms-text-2); text-decoration:none;
      margin-top:10px; transition:all .2s;
      mat-icon { font-size:16px; width:16px; height:16px; }
      &:hover { border-color:var(--lms-purple); color:var(--lms-text); }
    }

    .enroll-incl { margin-top:24px; padding-top:20px; border-top:1px solid var(--lms-border); }
    .incl-title { font-size:13px; font-weight:700; margin:0 0 12px; }
    .enroll-incl ul { list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:10px; }
    .enroll-incl li { display:flex; align-items:center; gap:10px; font-size:13px; color:var(--lms-text-2);
      mat-icon { font-size:16px; width:16px; height:16px; color:var(--lms-purple-2); }
    }

    /* ── Body ── */
    .cd-body { max-width:1300px; margin:0 auto; padding:0 40px; }
    .cd-main { padding-top:32px; max-width:820px; }
    .tab-content { padding-top:24px; }

    /* ── Curriculum ── */
    .curriculum-summary { font-size:13px; color:var(--lms-text-2); margin-bottom:16px;
      strong { color:var(--lms-text); }
    }
    .section-card { background:var(--lms-surface); border:1px solid var(--lms-border); border-radius:var(--lms-radius-sm); margin-bottom:8px; overflow:hidden; }
    .section-header {
      width:100%; padding:14px 18px;
      display:flex; justify-content:space-between; align-items:center;
      background:transparent; border:none; cursor:pointer; color:var(--lms-text);
      transition:background .15s;
      > div { display:flex; align-items:center; gap:10px; }
      &:hover { background:var(--lms-surface-2); }
    }
    .sh-chev { transition: transform .2s; color:var(--lms-text-2);
      &.open { transform: rotate(90deg); color:var(--lms-purple-2); }
    }
    .sh-title { font-size:14px; font-weight:700; }
    .sh-meta  { font-size:12px; color:var(--lms-text-muted); }

    .lesson-list { list-style:none; padding:0; margin:0; border-top:1px solid var(--lms-border); }
    .lesson-item {
      display:flex; align-items:center; gap:12px;
      padding:12px 18px 12px 42px;
      transition:background .15s; cursor:pointer;
      &:hover { background:var(--lms-surface-2); }
      &.locked { opacity:.5; cursor:not-allowed; }
    }
    .lesson-type-icon { font-size:18px; width:18px; height:18px; color:var(--lms-text-muted); }
    .lesson-type-icon.video { color:var(--lms-blue); }
    .lesson-type-icon.quiz { color:var(--lms-amber); }
    .lesson-title { flex:1; font-size:13.5px; color:var(--lms-text-2); }
    .lesson-duration { font-size:12px; color:var(--lms-text-muted); }

    /* ── About ── */
    .about-h { font-size:18px; font-weight:800; margin:24px 0 14px;
      &:first-child { margin-top:0; }
    }
    .learn-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:8px; }
    .learn-item { display:flex; align-items:flex-start; gap:8px; font-size:13.5px; color:var(--lms-text-2); line-height:1.5;
      mat-icon { font-size:16px; width:16px; height:16px; color:var(--lms-green); margin-top:2px; flex-shrink:0; }
    }
    .about-p { font-size:14px; line-height:1.7; color:var(--lms-text-2); margin:0 0 14px; }
    .skill-tags { display:flex; gap:8px; flex-wrap:wrap; }
    .skill-tag {
      padding:6px 14px; border-radius:99px;
      background:var(--lms-surface-2); border:1px solid var(--lms-border);
      font-size:12.5px; color:var(--lms-text-2);
    }

    /* ── Instructor ── */
    .instr-card { display:flex; gap:24px; padding:24px; background:var(--lms-surface); border:1px solid var(--lms-border); border-radius:var(--lms-radius); }
    .instr-av-xl {
      width:80px; height:80px; border-radius:99px;
      background:var(--lms-gradient); color:#fff;
      font-size:30px; font-weight:700;
      display:flex; align-items:center; justify-content:center; flex-shrink:0;
    }
    .instr-info { flex:1; }
    .instr-title { font-size:20px; font-weight:800; margin:0 0 4px; }
    .instr-role  { font-size:13px; color:var(--lms-text-2); margin:0 0 14px; }
    .instr-stats { display:flex; gap:20px; margin-bottom:16px; flex-wrap:wrap;
      div { display:flex; align-items:center; gap:6px; font-size:13px; color:var(--lms-text-2);
        mat-icon { font-size:16px; width:16px; height:16px; color:var(--lms-purple-2); }
        strong { color:var(--lms-text); }
      }
    }
    .instr-bio { font-size:14px; line-height:1.65; color:var(--lms-text-2); margin:0; }

    /* ── Reviews ── */
    .reviews-summary { display:flex; padding:24px; background:var(--lms-surface); border:1px solid var(--lms-border); border-radius:var(--lms-radius); margin-bottom:18px; }
    .rs-main { display:flex; flex-direction:column; align-items:center; gap:6px; }
    .rs-rating { font-size:48px; font-weight:900; color:var(--lms-amber); letter-spacing:-1.5px; line-height:1; }
    .rs-count  { font-size:13px; color:var(--lms-text-2); margin:0; }

    .reviews-list { display:flex; flex-direction:column; gap:12px; }
    .review-item { display:flex; gap:14px; padding:20px; background:var(--lms-surface); border:1px solid var(--lms-border); border-radius:var(--lms-radius-sm); }
    .rev-av { width:40px; height:40px; border-radius:99px; background:var(--lms-gradient); color:#fff; font-size:14px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .rev-body { flex:1; }
    .rev-head { display:flex; align-items:center; gap:10px; margin-bottom:6px; font-size:13px;
      strong { color:var(--lms-text); }
      .rev-date { color:var(--lms-text-muted); font-size:12px; margin-left:auto; }
    }
    .rev-text { font-size:13.5px; line-height:1.6; color:var(--lms-text-2); margin:0; }

    /* ── Thumbnails ── */
    .grad-blue   { background: linear-gradient(135deg,#1e3a8a 0%,#3b82f6 100%); }
    .grad-pink   { background: linear-gradient(135deg,#831843 0%,#ec4899 100%); }
    .grad-purple { background: linear-gradient(135deg,#4c1d95 0%,#7c3aed 100%); }
    .grad-amber  { background: linear-gradient(135deg,#78350f 0%,#f59e0b 100%); }
    .grad-cyan   { background: linear-gradient(135deg,#164e63 0%,#06b6d4 100%); }
    .grad-green  { background: linear-gradient(135deg,#064e3b 0%,#10b981 100%); }
  `]
})
export class CourseDetailComponent implements OnInit {
  private route  = inject(ActivatedRoute);
  private router = inject(Router);
  private api    = inject(CourseService);
  private auth   = inject(AuthService);
  private snack  = inject(MatSnackBar);

  course      = signal<Course | null>(null);
  sections    = signal<Section[]>([]);
  loading     = signal(true);
  errorMsg    = signal<string | null>(null);
  enrolling   = signal(false);

  // Reuse mocked instructor bio / reviews shapes — replace with /Reviews endpoint when added
  instructor  = INSTRUCTOR;
  reviews     = REVIEWS;
  openSections = new Set<string>();

  learningOutcomes = [
    'Build production-ready projects from scratch',
    'Master modern frameworks and best practices',
    'Understand core concepts and design patterns',
    'Deploy real applications to the cloud',
    'Write clean, maintainable, scalable code',
    'Debug, test, and optimize like a pro',
  ];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.errorMsg.set('Missing course id'); this.loading.set(false); return; }
    this.api.get(id).subscribe({
      next: detail => {
        const sections: Section[] = detail.sections.map(s => ({
          id: s.id,
          title: s.title,
          lessons: s.lessons.map(l => ({
            id: l.id, title: l.title, duration: l.duration,
            type: l.type.toLowerCase() as 'video' | 'reading' | 'quiz',
            completed: false, locked: false,
          })),
        }));
        this.sections.set(sections);
        if (sections[0]) this.openSections.add(sections[0].id);
        this.course.set({
          id: detail.id,
          title: detail.title,
          subtitle: detail.subtitle,
          instructor: detail.instructorName,
          instructorAvatar: detail.instructorAvatar || initialFor(detail.instructorName),
          thumbnail: detail.thumbnailGradient || THUMB_BY_CATEGORY[detail.category] || 'grad-purple',
          imageUrl: resolveMediaUrl(detail.imageUrl),
          category: detail.category,
          level: detail.level,
          rating: detail.rating, reviewCount: detail.reviewCount, studentCount: detail.studentCount,
          duration: detail.duration,
          lessonCount: sections.reduce((s, sec) => s + sec.lessons.length, 0),
          price: detail.price,
          isBestseller: detail.isBestseller,
          isNew: detail.isNew,
          tags: [],
        });
        // Replace the mock instructor with real DB instructor data
        this.instructor = {
          ...this.instructor,
          name: detail.instructorName,
          avatar: detail.instructorAvatar || initialFor(detail.instructorName),
          title: detail.instructorTitle || this.instructor.title,
          bio: detail.instructorBio || this.instructor.bio,
          rating: detail.rating,
          students: detail.studentCount,
        };
        this.loading.set(false);
      },
      error: (err: { status?: number; message?: string }) => {
        // 404 → the course id in the URL no longer exists (typically a stale
        // bookmark after the DB was re-seeded). Redirect to the catalog so the
        // user lands somewhere useful.
        if (err?.status === 404) {
          this.snack.open('That course no longer exists. Browse the catalog for current courses.',
            'OK', { duration: 3500, panelClass: 'snack-err' });
          this.router.navigate(['/catalog'], { replaceUrl: true });
          return;
        }
        this.errorMsg.set(err?.message ?? 'Could not load course');
        this.loading.set(false);
      },
    });
  }

  onPreview(): void {
    const c = this.course();
    if (!c) return;
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login'], { queryParams: { redirect: '/learn/' + c.id } });
      return;
    }
    this.router.navigate(['/learn', c.id]);
  }

  enroll(): void {
    const c = this.course();
    if (!c) return;
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login'], { queryParams: { redirect: '/course/' + c.id } });
      return;
    }
    this.enrolling.set(true);
    this.api.enroll(c.id).subscribe({
      next: () => {
        this.enrolling.set(false);
        this.snack.open('Enrolled! Starting…', 'OK', { duration: 2000, panelClass: 'snack-ok' });
        this.router.navigate(['/learn', c.id]);
      },
      error: (err: { error?: { message?: string }; status?: number }) => {
        this.enrolling.set(false);
        const msg = err?.status === 409 ? 'You are already enrolled.' : (err?.error?.message ?? 'Could not enroll.');
        this.snack.open(msg, 'OK', { duration: 3000, panelClass: err?.status === 409 ? 'snack-ok' : 'snack-err' });
        if (err?.status === 409) this.router.navigate(['/learn', c.id]);
      },
    });
  }

  toggleSection(id: string): void {
    if (this.openSections.has(id)) this.openSections.delete(id);
    else this.openSections.add(id);
  }

  totalLessons(): number { return this.sections().reduce((sum, s) => sum + s.lessons.length, 0); }
  starStr(r: number): string { return '★'.repeat(Math.round(r)) + '☆'.repeat(5 - Math.round(r)); }
  levelBadge(l: string): string { return l === 'Beginner' ? 'green' : l === 'Intermediate' ? 'amber' : 'red'; }
  iconFor(type: string): string { return type === 'video' ? 'play_circle_outline' : type === 'quiz' ? 'quiz' : 'article'; }
}
