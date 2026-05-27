import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NgApexchartsModule } from 'ng-apexcharts';
import { Course } from '../../core/models/lms.models';
import { EnrollmentService, Enrollment } from '../../core/services/enrollment.service';
import { CourseService, CourseSummary } from '../../core/services/course.service';
import { AuthService } from '../../core/services/auth.service';
import { forkJoin } from 'rxjs';

const THUMB_BY_CATEGORY: Record<string, string> = {
  Development: 'grad-blue', Design: 'grad-pink', 'Data Science': 'grad-purple',
  Cloud: 'grad-cyan', Marketing: 'grad-green', Mobile: 'grad-amber',
};
const initialFor = (name: string) => (name?.trim()?.[0]?.toUpperCase() ?? '?');
const timeAgo = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 60) return mins <= 1 ? 'Just now' : `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  const weeks = Math.round(days / 7);
  return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
};

type LearningTab = 'In Progress' | 'Completed' | 'Wishlist' | 'Certificates';

@Component({
  selector: 'app-my-courses',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatButtonModule, NgApexchartsModule],
  template: `
  <div class="mc-wrap">

    <!-- ── Header ── -->
    <div class="mc-header afd">
      <div>
        <h1 class="mc-h1">My Learning</h1>
        <p class="mc-sub">Track your progress and continue where you left off</p>
      </div>
      <div class="mc-stats">
        <div class="ms-card">
          <div class="ms-icon purple"><mat-icon>menu_book</mat-icon></div>
          <div>
            <div class="ms-val">{{ inProgress().length }}</div>
            <div class="ms-label">In progress</div>
          </div>
        </div>
        <div class="ms-card">
          <div class="ms-icon green"><mat-icon>check_circle</mat-icon></div>
          <div>
            <div class="ms-val">{{ completedCount() }}</div>
            <div class="ms-label">Completed</div>
          </div>
        </div>
        <div class="ms-card">
          <div class="ms-icon amber"><mat-icon>workspace_premium</mat-icon></div>
          <div>
            <div class="ms-val">{{ certificateCount() }}</div>
            <div class="ms-label">Certificates</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Activity overview ── -->
    <div class="mc-overview afu d2">
      <div class="overview-card glass-card">
        <div class="oc-head">
          <h3>Learning Activity</h3>
          <span class="lms-badge purple">Last 30 days</span>
        </div>
        <apx-chart
          [series]="activitySeries"
          [chart]="{ type:'area', height:200, toolbar:{show:false}, background:'transparent' }"
          [colors]="['#7C3AED','#3B82F6']"
          [fill]="{ type:'gradient', gradient:{ shadeIntensity:1, opacityFrom:.4, opacityTo:.02, stops:[0,100] } }"
          [stroke]="{ curve:'smooth', width:2 }"
          [xaxis]="{ categories:weeks, labels:{style:{colors:'#555'}}, axisBorder:{show:false}, axisTicks:{show:false} }"
          [yaxis]="{ labels:{style:{colors:'#555'}} }"
          [grid]="{ borderColor:'rgba(255,255,255,0.04)', strokeDashArray:4 }"
          [dataLabels]="{ enabled:false }"
          [legend]="{ labels:{colors:'#9090B0'} }"
          [theme]="{ mode:'dark' }"
          [tooltip]="{ theme:'dark' }">
        </apx-chart>
      </div>

      <div class="streak-card glass-card">
        <div class="streak-icon-3d">
          <mat-icon>local_fire_department</mat-icon>
        </div>
        <h3>7-Day Streak!</h3>
        <p>Keep learning daily to build your streak</p>
        <div class="streak-week">
          @for (d of weekDays; track d.label) {
            <div class="sw-day" [class.active]="d.active">
              <span class="sw-label">{{ d.label }}</span>
              <div class="sw-dot"><mat-icon>{{ d.active ? 'check' : 'circle' }}</mat-icon></div>
            </div>
          }
        </div>
      </div>
    </div>

    <!-- ── Tabs ── -->
    <div class="mc-tabs afu d4">
      @for (t of tabs; track t) {
        <button class="mc-tab" [class.active]="activeTab() === t" (click)="setTab(t)">
          {{ t }}
          @if (countFor(t) > 0) { <span class="tab-count">{{ countFor(t) }}</span> }
        </button>
      }
    </div>

    <!-- ── Tab content ── -->
    @if (loading()) {
      <div class="empty-state"><mat-icon>hourglass_top</mat-icon><p>Loading your courses…</p></div>
    } @else if (error()) {
      <div class="empty-state"><mat-icon>error_outline</mat-icon><p>{{ error() }}</p></div>
    } @else if (activeTab() === 'In Progress' || activeTab() === 'Completed') {
      <div class="course-grid afi d5">
        @for (c of currentList(); track c.id; let i = $index) {
          <a class="mc-card card-hover" [routerLink]="['/learn', c.id]" [style.animation-delay.s]="i * 0.05">
            <div class="mc-thumb" [class]="c.thumbnail">
              <div class="mc-overlay">
                <button class="mc-play"><mat-icon>play_arrow</mat-icon></button>
              </div>
              <div class="mc-progress-overlay">
                <div class="mc-progress-bar" [style.width.%]="c.progress"></div>
              </div>
            </div>
            <div class="mc-body">
              <p class="mc-cat">{{ c.category }}</p>
              <h3 class="mc-title">{{ c.title }}</h3>
              <p class="mc-instr">{{ c.instructor }}</p>
              <div class="mc-progress-row">
                <span class="mc-pct">{{ c.progress }}% complete</span>
                <span class="mc-last">{{ c.lastAccessed }}</span>
              </div>
              <div class="lms-progress"><div class="fill" [style.width.%]="c.progress"></div></div>
              <button class="mc-continue">
                <mat-icon>play_arrow</mat-icon>
                {{ c.progress === 100 ? 'Review' : 'Continue' }}
              </button>
            </div>
          </a>
        } @empty {
          <div class="empty-state" style="grid-column: 1 / -1">
            <mat-icon>school</mat-icon>
            <p>No courses in {{ activeTab() }}.</p>
            <a routerLink="/catalog" mat-raised-button color="primary">Browse Catalog</a>
          </div>
        }
      </div>
    }

    @if (activeTab() === 'Certificates') {
      <div class="cert-grid afi d5">
        @for (cert of certificates; track cert.id; let i = $index) {
          <div class="cert-card asi" [style.animation-delay.s]="i * 0.08">
            <div class="cert-ribbon"><mat-icon>workspace_premium</mat-icon></div>
            <h3 class="cert-title">{{ cert.title }}</h3>
            <p class="cert-issued">Issued {{ cert.date }}</p>
            <div class="cert-stamp">
              <span class="gradient-text">EduFlow</span>
              <p>Certificate of Completion</p>
            </div>
            <button class="cert-dl" (click)="downloadCertificate(cert)">
              <mat-icon>download</mat-icon> Download
            </button>
          </div>
        }
      </div>
    }

    @if (activeTab() === 'Wishlist') {
      <div class="empty-state afi">
        <mat-icon>favorite_border</mat-icon>
        <p>Your wishlist is empty.</p>
        <a routerLink="/catalog" mat-raised-button color="primary">Discover Courses</a>
      </div>
    }

  </div>
  `,
  styles: [`
    .mc-wrap { max-width:1300px; margin:0 auto; padding: 32px 40px 60px; }

    /* ── Header ── */
    .mc-header { display:flex; justify-content:space-between; align-items:flex-end; gap:32px; margin-bottom:32px; flex-wrap:wrap; }
    .mc-h1  { font-size:32px; font-weight:900; margin:0 0 6px; letter-spacing:-.6px; }
    .mc-sub { font-size:14px; color:var(--lms-text-2); margin:0; }
    .mc-stats { display:flex; gap:12px; }
    .ms-card {
      display:flex; align-items:center; gap:12px;
      padding:14px 20px; border-radius:var(--lms-radius);
      background:var(--lms-surface); border:1px solid var(--lms-border);
      transition:transform .25s, border-color .2s;
      &:hover { transform:translateY(-3px); border-color:var(--lms-border-hover); }
    }
    .ms-icon {
      width:42px; height:42px; border-radius:12px;
      display:flex; align-items:center; justify-content:center;
      mat-icon { font-size:20px; width:20px; height:20px; }
      &.purple { background:var(--lms-purple-dim); mat-icon { color:var(--lms-purple-2); } }
      &.green  { background:var(--lms-green-dim);  mat-icon { color:var(--lms-green); } }
      &.amber  { background:var(--lms-amber-dim);  mat-icon { color:var(--lms-amber); } }
    }
    .ms-val   { font-size:22px; font-weight:900; line-height:1; }
    .ms-label { font-size:11px; color:var(--lms-text-2); margin-top:3px; text-transform:uppercase; letter-spacing:.4px; }

    /* ── Overview ── */
    .mc-overview { display:grid; grid-template-columns:1.6fr 1fr; gap:16px; margin-bottom:36px; }
    .overview-card { padding:20px; }
    .oc-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;
      h3 { font-size:16px; font-weight:800; margin:0; }
    }

    .streak-card { padding:28px; text-align:center; position:relative; overflow:hidden;
      h3 { font-size:22px; font-weight:900; margin:14px 0 6px; }
      p  { font-size:13px; color:var(--lms-text-2); margin:0 0 20px; }
    }
    .streak-icon-3d {
      width:72px; height:72px; border-radius:99px;
      background: linear-gradient(135deg, #F59E0B, #EF4444);
      display:flex; align-items:center; justify-content:center;
      margin:0 auto; position:relative;
      animation: floatY 3s ease-in-out infinite;
      box-shadow: 0 12px 32px rgba(239,68,68,0.45), inset 0 -4px 8px rgba(0,0,0,0.2);
      transform-style:preserve-3d;
      mat-icon { color:#fff; font-size:38px; width:38px; height:38px; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3)); }
    }
    .streak-week { display:flex; gap:6px; justify-content:center; }
    .sw-day { display:flex; flex-direction:column; align-items:center; gap:6px; flex:1; }
    .sw-label { font-size:10px; color:var(--lms-text-muted); text-transform:uppercase; letter-spacing:.5px; }
    .sw-dot {
      width:30px; height:30px; border-radius:99px;
      background:var(--lms-surface-3); display:flex; align-items:center; justify-content:center;
      transition:all .3s;
      mat-icon { font-size:14px; width:14px; height:14px; color:var(--lms-text-muted); }
    }
    .sw-day.active .sw-dot {
      background:var(--lms-gradient);
      box-shadow: 0 4px 12px rgba(124,58,237,0.4);
      mat-icon { color:#fff; }
    }

    /* ── Tabs ── */
    .mc-tabs {
      display:flex; gap:4px; margin-bottom:24px;
      border-bottom:1px solid var(--lms-border);
    }
    .mc-tab {
      display:flex; align-items:center; gap:8px;
      padding:12px 18px; background:none; border:none; cursor:pointer;
      font-size:14px; font-weight:600; color:var(--lms-text-2);
      border-bottom:2px solid transparent; margin-bottom:-1px;
      transition:color .15s;
      &:hover { color:var(--lms-text); }
      &.active { color:var(--lms-text); border-color:var(--lms-purple); }
    }
    .tab-count {
      padding:1px 8px; border-radius:99px;
      background:var(--lms-purple-dim); color:var(--lms-purple-2);
      font-size:11px; font-weight:700;
    }

    /* ── Course cards ── */
    .course-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:18px; }
    .mc-card {
      display:flex; flex-direction:column; border-radius:var(--lms-radius);
      background:var(--lms-surface); border:1px solid var(--lms-border);
      text-decoration:none; overflow:hidden; animation: fadeInUp .45s cubic-bezier(.16,1,.3,1) both;
    }
    .mc-thumb { height:140px; position:relative; overflow:hidden; }
    .mc-overlay { position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
      background:rgba(0,0,0,0.3); opacity:0; transition:opacity .2s; }
    .mc-card:hover .mc-overlay { opacity:1; }
    .mc-play {
      width:54px; height:54px; border-radius:99px; border:none; cursor:pointer;
      background:rgba(255,255,255,0.95); backdrop-filter:blur(8px);
      display:flex; align-items:center; justify-content:center;
      mat-icon { color:#0A0A14; font-size:28px; width:28px; height:28px; }
    }
    .mc-progress-overlay { position:absolute; left:0; right:0; bottom:0; height:4px; background:rgba(0,0,0,0.4); }
    .mc-progress-bar { height:100%; background:var(--lms-gradient); transition:width .5s ease; }

    .mc-body { padding:18px; flex:1; display:flex; flex-direction:column; gap:8px; }
    .mc-cat   { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:var(--lms-purple-2); margin:0; }
    .mc-title { font-size:15px; font-weight:700; margin:0; line-height:1.35; }
    .mc-instr { font-size:12px; color:var(--lms-text-2); margin:0; }
    .mc-progress-row { display:flex; justify-content:space-between; align-items:center; margin-top:auto; padding-top:4px; }
    .mc-pct  { font-size:12px; font-weight:700; color:var(--lms-purple-2); }
    .mc-last { font-size:11px; color:var(--lms-text-muted); }
    .mc-continue {
      width:100%; padding:10px; border:none; border-radius:var(--lms-radius-sm); cursor:pointer;
      background:var(--lms-gradient); color:#fff; font-weight:700; font-size:13px;
      display:flex; align-items:center; justify-content:center; gap:6px;
      margin-top:8px; box-shadow:var(--lms-shadow-purple);
      transition:opacity .2s, transform .15s;
      mat-icon { font-size:16px; width:16px; height:16px; }
      &:hover { opacity:.9; transform:translateY(-1px); }
    }

    /* ── Certificates ── */
    .cert-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:18px; }
    .cert-card {
      background: linear-gradient(135deg, var(--lms-surface) 0%, var(--lms-surface-2) 100%);
      border: 1px solid var(--lms-border);
      border-radius: var(--lms-radius);
      padding: 28px; position:relative; overflow:hidden;
      transition: transform .35s cubic-bezier(.16,1,.3,1), border-color .2s, box-shadow .25s;
      &:hover {
        transform: perspective(1000px) rotateY(-4deg) translateY(-6px);
        border-color: var(--lms-amber);
        box-shadow: 0 30px 60px rgba(245,158,11,0.15);
      }
      &::before {
        content:''; position:absolute; top:0; right:0; width:120px; height:120px;
        background:radial-gradient(circle, rgba(245,158,11,0.2), transparent 70%); pointer-events:none;
      }
    }
    .cert-ribbon {
      width:48px; height:48px; border-radius:12px;
      background: linear-gradient(135deg, #F59E0B, #EF4444);
      display:flex; align-items:center; justify-content:center;
      box-shadow: 0 8px 20px rgba(245,158,11,0.4);
      mat-icon { color:#fff; font-size:24px; width:24px; height:24px; }
    }
    .cert-title { font-size:16px; font-weight:800; margin:18px 0 6px; line-height:1.3; }
    .cert-issued { font-size:12px; color:var(--lms-text-2); margin:0 0 24px; }
    .cert-stamp { padding:14px 0; border-top:1px dashed var(--lms-border); border-bottom:1px dashed var(--lms-border); margin-bottom:18px; text-align:center;
      .gradient-text { font-size:20px; font-weight:900; letter-spacing:.5px; }
      p { font-size:11px; color:var(--lms-text-muted); margin:2px 0 0; text-transform:uppercase; letter-spacing:.5px; }
    }
    .cert-dl {
      width:100%; padding:10px; border:1px solid var(--lms-border); border-radius:var(--lms-radius-sm);
      background:transparent; color:var(--lms-text); font-size:13px; font-weight:600; cursor:pointer;
      display:flex; align-items:center; justify-content:center; gap:6px;
      transition:all .2s;
      mat-icon { font-size:16px; width:16px; height:16px; }
      &:hover { border-color:var(--lms-amber); color:var(--lms-amber); }
    }

    /* ── Thumbnails ── */
    .grad-blue   { background: linear-gradient(135deg,#1e3a8a 0%,#3b82f6 100%); }
    .grad-pink   { background: linear-gradient(135deg,#831843 0%,#ec4899 100%); }
    .grad-purple { background: linear-gradient(135deg,#4c1d95 0%,#7c3aed 100%); }
    .grad-amber  { background: linear-gradient(135deg,#78350f 0%,#f59e0b 100%); }
    .grad-cyan   { background: linear-gradient(135deg,#164e63 0%,#06b6d4 100%); }
    .grad-green  { background: linear-gradient(135deg,#064e3b 0%,#10b981 100%); }
  `]
})
export class MyCoursesComponent implements OnInit {
  private readonly enrollApi = inject(EnrollmentService);
  private readonly courseApi = inject(CourseService);
  private readonly auth = inject(AuthService);
  private readonly snack = inject(MatSnackBar);

  downloadCertificate(cert: { id: string; title: string; date: string }): void {
    const u = this.auth.currentUser();
    const name = u ? `${u.firstName} ${u.lastName}` : 'Student';
    const filename = `eduflow-certificate-${cert.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.txt`;
    const text =
`════════════════════════════════════════════════════
                  EduFlow LMS
            CERTIFICATE OF COMPLETION
════════════════════════════════════════════════════

This certifies that

                  ${name}

has successfully completed the course

           "${cert.title}"

issued on ${cert.date}.

Verification ID: ${cert.id.toUpperCase()}
                                     — EduFlow Team
════════════════════════════════════════════════════
`;
    try {
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      this.snack.open(`Certificate downloaded`, 'OK', { duration: 2000, panelClass: 'snack-ok' });
    } catch {
      this.snack.open('Could not start download', 'OK', { duration: 2500, panelClass: 'snack-err' });
    }
  }

  readonly tabs: LearningTab[] = ['In Progress', 'Completed', 'Wishlist', 'Certificates'];

  loading = signal(true);
  error   = signal<string | null>(null);
  courses = signal<Course[]>([]);
  activeTab = signal<LearningTab>('In Progress');

  inProgress = computed(() => this.courses().filter(c => (c.progress ?? 0) > 0 && (c.progress ?? 0) < 100));
  completed  = computed(() => this.courses().filter(c => (c.progress ?? 0) === 100));

  ngOnInit(): void {
    this.fetch();
  }

  private fetch(): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      enrollments: this.enrollApi.myEnrollments(),
      catalog:     this.courseApi.list({ pageSize: 100 }),
    }).subscribe({
      next: ({ enrollments, catalog }) => {
        this.courses.set(this.merge(enrollments, catalog));
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message ?? 'Could not load your courses');
        this.loading.set(false);
      },
    });
  }

  private merge(enrollments: Enrollment[], catalog: CourseSummary[]): Course[] {
    const byId = new Map(catalog.map(c => [c.id, c]));
    return enrollments.map(e => {
      const c = byId.get(e.courseId);
      return {
        id: e.courseId,
        title: e.courseTitle || c?.title || '—',
        subtitle: c?.subtitle ?? '',
        instructor: c?.instructorName ?? '',
        instructorAvatar: initialFor(c?.instructorName ?? ''),
        thumbnail: THUMB_BY_CATEGORY[c?.category ?? ''] ?? 'grad-purple',
        category: c?.category ?? '',
        level: c?.level ?? 'Beginner',
        rating: 4.7, reviewCount: 0, studentCount: 0,
        duration: '—',
        lessonCount: c?.lessonCount ?? 0,
        price: c?.price ?? 0,
        tags: [],
        progress: e.progressPercent,
        lastAccessed: timeAgo(e.enrolledAt),
      } as Course;
    });
  }

  readonly completedCount = computed(() => this.completed().length);
  readonly certificateCount = computed(() => this.completed().length);

  currentList = computed<Course[]>(() => {
    return this.activeTab() === 'Completed' ? this.completed() : this.inProgress();
  });

  countFor(tab: LearningTab): number {
    if (tab === 'In Progress') return this.inProgress().length;
    if (tab === 'Completed')   return this.completedCount();
    if (tab === 'Certificates') return this.certificateCount();
    return 0;
  }

  setTab(t: LearningTab): void { this.activeTab.set(t); }

  weeks = ['W1', 'W2', 'W3', 'W4'];
  activitySeries = [
    { name: 'Lessons', data: [12, 18, 9, 21] },
    { name: 'Hours',   data: [4, 7, 3, 8] },
  ];

  weekDays = [
    { label:'Mon', active:true },
    { label:'Tue', active:true },
    { label:'Wed', active:true },
    { label:'Thu', active:true },
    { label:'Fri', active:true },
    { label:'Sat', active:true },
    { label:'Sun', active:true },
  ];

  certificates = [
    { id:'c1', title:'Complete Web Dev Bootcamp', date:'Mar 14, 2026' },
    { id:'c2', title:'Python for Data Science',   date:'Feb 28, 2026' },
    { id:'c3', title:'AWS Cloud Practitioner',    date:'Jan 12, 2026' },
    { id:'c4', title:'Digital Marketing Strategy',date:'Dec 5, 2025' },
  ];
}
