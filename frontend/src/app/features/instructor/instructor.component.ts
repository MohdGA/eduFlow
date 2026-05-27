import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NgApexchartsModule } from 'ng-apexcharts';
import { CourseService, CourseFormPayload, CourseSummary } from '../../core/services/course.service';
import { CourseFormDialogComponent } from '../../shared/course-form-dialog.component';
import { AnalyticsDialogComponent } from '../../shared/analytics-dialog.component';

@Component({
  selector: 'app-instructor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule, NgApexchartsModule],
  template: `
  <div class="ins-wrap">

    <!-- ── Header ── -->
    <div class="ins-header afd">
      <div>
        <h1 class="ins-h1">Instructor Studio</h1>
        <p class="ins-sub">Manage your courses, students, and revenue</p>
      </div>
      <button class="new-course-btn" (click)="openCreateDialog()">
        <mat-icon>add</mat-icon> Create Course
      </button>
    </div>

    <!-- ── KPI cards ── -->
    <div class="kpi-row afu d2">
      @for (k of kpis; track k.label; let i = $index) {
        <div class="kpi-card asi" [style.--grad]="k.gradient" [style.animation-delay.s]="i * 0.06">
          <div class="kpi-top">
            <div class="kpi-icon"><mat-icon>{{ k.icon }}</mat-icon></div>
            <span class="kpi-trend" [class.pos]="k.positive" [class.neg]="!k.positive">
              <mat-icon>{{ k.positive ? 'arrow_upward' : 'arrow_downward' }}</mat-icon>{{ k.change }}
            </span>
          </div>
          <div class="kpi-val">{{ k.value }}</div>
          <div class="kpi-label">{{ k.label }}</div>
        </div>
      }
    </div>

    <!-- ── Charts ── -->
    <div class="charts-row afu d4">
      <div class="chart-card glass-card">
        <div class="ch-head">
          <h3>Revenue Trend</h3>
          <span class="lms-badge purple">Last 6 months</span>
        </div>
        <apx-chart
          [series]="revenueSeries"
          [chart]="{ type:'area', height:240, toolbar:{show:false}, background:'transparent' }"
          [colors]="['#7C3AED']"
          [fill]="{ type:'gradient', gradient:{ shadeIntensity:1, opacityFrom:.5, opacityTo:.02, stops:[0,100] } }"
          [stroke]="{ curve:'smooth', width:3 }"
          [xaxis]="{ categories:revenueMonths, labels:{style:{colors:'#555'}}, axisBorder:{show:false}, axisTicks:{show:false} }"
          [yaxis]="{ labels:{style:{colors:'#555'}, formatter:formatRevenue} }"
          [grid]="{ borderColor:'rgba(255,255,255,0.04)', strokeDashArray:4 }"
          [dataLabels]="{ enabled:false }"
          [theme]="{ mode:'dark' }"
          [tooltip]="{ theme:'dark' }">
        </apx-chart>
      </div>

      <div class="chart-card glass-card">
        <div class="ch-head">
          <h3>Enrollments by Course</h3>
          <span class="lms-badge blue">This month</span>
        </div>
        <apx-chart
          [series]="[{ name:'Enrollments', data:enrollmentData }]"
          [chart]="{ type:'bar', height:240, toolbar:{show:false}, background:'transparent' }"
          [colors]="['#3B82F6']"
          [plotOptions]="{ bar:{ borderRadius:8, columnWidth:'58%', distributed:true } }"
          [fill]="{ colors:['#7C3AED','#3B82F6','#06B6D4','#10B981','#F59E0B'] }"
          [xaxis]="{ categories:enrollmentLabels, labels:{style:{colors:'#555'}}, axisBorder:{show:false}, axisTicks:{show:false} }"
          [yaxis]="{ labels:{style:{colors:'#555'}} }"
          [grid]="{ borderColor:'rgba(255,255,255,0.04)', strokeDashArray:4 }"
          [dataLabels]="{ enabled:false }"
          [legend]="{ show:false }"
          [theme]="{ mode:'dark' }"
          [tooltip]="{ theme:'dark' }">
        </apx-chart>
      </div>
    </div>

    <!-- ── My Courses table ── -->
    <div class="ins-courses afu d6">
      <div class="section-header">
        <h2 class="section-title">My Courses</h2>
        <div class="search-mini">
          <mat-icon>search</mat-icon>
          <input placeholder="Search courses..." [(ngModel)]="search" maxlength="80">
        </div>
      </div>

      <div class="ins-table">
        <div class="it-head">
          <span style="flex:2.5">Course</span>
          <span style="flex:1">Students</span>
          <span style="flex:1">Rating</span>
          <span style="flex:1">Revenue</span>
          <span style="flex:1">Status</span>
          <span style="flex:0.5"></span>
        </div>
        @for (c of filteredCourses(); track c.id; let i = $index) {
          <div class="it-row afu" [style.animation-delay.s]="i * 0.04">
            <div class="it-course" style="flex:2.5">
              <div class="it-thumb" [class]="c.thumbnailGradient"></div>
              <div>
                <p class="it-title">{{ c.title }}</p>
                <p class="it-cat">{{ c.category }} · {{ c.level }}</p>
              </div>
            </div>
            <div style="flex:1"><strong>{{ c.studentCount | number }}</strong></div>
            <div style="flex:1">
              <span class="stars">★</span>
              <strong style="margin-left:4px">{{ c.rating }}</strong>
              <span class="muted">({{ c.reviewCount | number }})</span>
            </div>
            <div style="flex:1"><strong>\${{ (c.studentCount * c.price * 0.7) | number:'1.0-0' }}</strong></div>
            <div style="flex:1">
              <span class="lms-badge green">Published</span>
            </div>
            <div style="flex:0.5; display:flex; gap:4px; justify-content:flex-end;">
              <a class="row-btn" [routerLink]="['/course', c.id]" matTooltip="View public page"><mat-icon>visibility</mat-icon></a>
              <a class="row-btn" [routerLink]="['/instructor/course', c.id, 'curriculum']" matTooltip="Manage curriculum"><mat-icon>menu_book</mat-icon></a>
              <button class="row-btn" matTooltip="Edit course" (click)="onEditCourse(c)"><mat-icon>edit</mat-icon></button>
              <button class="row-btn" matTooltip="Analytics" (click)="onAnalytics(c)"><mat-icon>insights</mat-icon></button>
            </div>
          </div>
        } @empty {
          <div style="padding:32px; text-align:center; color: var(--lms-text-2)">No courses match your search.</div>
        }
      </div>
    </div>

    <!-- ── Recent students ── -->
    <div class="ins-recent afu d8">
      <div class="recent-card glass-card">
        <div class="rc-head">
          <h3>Recent Enrollments</h3>
          <a class="see-all" routerLink="/my-courses">View all <mat-icon>arrow_forward</mat-icon></a>
        </div>
        @for (s of recentStudents; track s.id) {
          <div class="rec-item">
            <div class="rec-av">{{ s.avatar }}</div>
            <div class="rec-info">
              <p class="rec-name">{{ s.name }}</p>
              <p class="rec-course">enrolled in <strong>{{ s.course }}</strong></p>
            </div>
            <span class="rec-time">{{ s.time }}</span>
          </div>
        }
      </div>

      <div class="reviews-card glass-card">
        <div class="rc-head">
          <h3>Latest Reviews</h3>
          <a class="see-all" routerLink="/my-courses">View all <mat-icon>arrow_forward</mat-icon></a>
        </div>
        @for (r of latestReviews; track r.id) {
          <div class="rec-item">
            <div class="rec-av">{{ r.avatar }}</div>
            <div class="rec-info">
              <div class="rev-head-mini">
                <p class="rec-name">{{ r.user }}</p>
                <span class="stars">{{ stars(r.rating) }}</span>
              </div>
              <p class="rec-course">{{ r.text }}</p>
            </div>
          </div>
        }
      </div>
    </div>

  </div>
  `,
  styles: [`
    .ins-wrap { max-width:1300px; margin:0 auto; padding:32px 40px 60px; }

    /* ── Header ── */
    .ins-header { display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:32px; flex-wrap:wrap; gap:16px; }
    .ins-h1  { font-size:30px; font-weight:900; margin:0 0 6px; letter-spacing:-.6px; }
    .ins-sub { font-size:14px; color:var(--lms-text-2); margin:0; }
    .new-course-btn {
      display:inline-flex; align-items:center; gap:6px;
      padding:12px 22px; border-radius:var(--lms-radius-sm); border:none; cursor:pointer;
      background:var(--lms-gradient); color:#fff; font-weight:700; font-size:14px;
      box-shadow:var(--lms-shadow-purple);
      transition:opacity .2s, transform .15s;
      mat-icon { font-size:18px; width:18px; height:18px; }
      &:hover { opacity:.9; transform:translateY(-1px); }
    }

    /* ── KPI cards ── */
    .kpi-row { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:24px; }
    .kpi-card {
      background:var(--lms-surface); border:1px solid var(--lms-border);
      border-radius:var(--lms-radius); padding:20px;
      position:relative; overflow:hidden;
      transition:transform .25s, border-color .2s;
      &:hover { transform:translateY(-3px) perspective(1000px) rotateX(2deg); border-color:var(--lms-border-hover); }
      &::after {
        content:''; position:absolute; top:0; right:0; width:140px; height:140px;
        background: var(--grad); opacity:.08;
        border-radius:99px; transform:translate(40px,-40px); filter:blur(20px);
      }
    }
    .kpi-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; }
    .kpi-icon {
      width:38px; height:38px; border-radius:10px;
      background:var(--lms-purple-dim);
      display:flex; align-items:center; justify-content:center;
      mat-icon { color:var(--lms-purple-2); font-size:18px; width:18px; height:18px; }
    }
    .kpi-trend {
      display:inline-flex; align-items:center; gap:2px;
      font-size:11.5px; font-weight:700; padding:2px 8px; border-radius:6px;
      mat-icon { font-size:13px; width:13px; height:13px; }
      &.pos { background:var(--lms-green-dim); color:var(--lms-green); }
      &.neg { background:var(--lms-red-dim);   color:var(--lms-red); }
    }
    .kpi-val   { font-size:30px; font-weight:900; letter-spacing:-1px; line-height:1; }
    .kpi-label { font-size:12px; color:var(--lms-text-2); margin-top:6px; }

    /* ── Charts ── */
    .charts-row { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:36px; }
    .chart-card { padding:20px; }
    .ch-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;
      h3 { font-size:15px; font-weight:800; margin:0; }
    }

    /* ── Section header ── */
    .section-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; }
    .section-title  { font-size:18px; font-weight:800; margin:0; }
    .search-mini {
      display:flex; align-items:center; gap:8px;
      background:var(--lms-surface); border:1px solid var(--lms-border);
      border-radius:var(--lms-radius-sm); padding:8px 14px;
      mat-icon { font-size:18px; width:18px; height:18px; color:var(--lms-text-2); }
      input { background:transparent; border:none; outline:none; color:var(--lms-text); font-size:13px; min-width:220px;
        &::placeholder { color:var(--lms-text-muted); }
      }
    }
    .see-all {
      display:inline-flex; align-items:center; gap:3px;
      font-size:12.5px; font-weight:600; color:var(--lms-purple-2); cursor:pointer;
      mat-icon { font-size:15px; width:15px; height:15px; }
    }

    /* ── Table ── */
    .ins-courses { margin-bottom:36px; }
    .ins-table {
      background:var(--lms-surface); border:1px solid var(--lms-border);
      border-radius:var(--lms-radius); overflow:hidden;
    }
    .it-head, .it-row {
      display:flex; align-items:center; gap:14px; padding:14px 20px;
    }
    .it-head {
      background:var(--lms-surface-2); font-size:11px; font-weight:700;
      text-transform:uppercase; letter-spacing:.5px; color:var(--lms-text-muted);
      border-bottom:1px solid var(--lms-border);
    }
    .it-row {
      border-bottom:1px solid var(--lms-border);
      transition:background .15s; font-size:13.5px;
      &:hover { background:var(--lms-surface-2); }
      &:last-child { border-bottom:none; }
      strong { color:var(--lms-text); }
      .muted { color:var(--lms-text-muted); font-size:12px; margin-left:3px; }
      .stars { color:var(--lms-amber); }
    }
    .it-course { display:flex; align-items:center; gap:12px; }
    .it-thumb { width:46px; height:46px; border-radius:var(--lms-radius-xs); flex-shrink:0; }
    .it-title { font-size:13.5px; font-weight:700; margin:0; color:var(--lms-text); }
    .it-cat   { font-size:11.5px; color:var(--lms-text-2); margin:2px 0 0; }
    .row-btn {
      width:32px; height:32px; border-radius:8px; border:none; cursor:pointer;
      background:transparent; color:var(--lms-text-2);
      display:flex; align-items:center; justify-content:center;
      transition:all .15s;
      mat-icon { font-size:16px; width:16px; height:16px; }
      &:hover { background:var(--lms-surface-3); color:var(--lms-purple-2); }
    }

    /* ── Recent ── */
    .ins-recent { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
    .recent-card, .reviews-card { padding:20px; }
    .rc-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;
      h3 { font-size:15px; font-weight:800; margin:0; }
    }
    .rec-item {
      display:flex; align-items:center; gap:12px; padding:10px 0;
      border-bottom:1px solid var(--lms-border);
      &:last-child { border-bottom:none; }
    }
    .rec-av {
      width:36px; height:36px; border-radius:99px; flex-shrink:0;
      background:var(--lms-gradient); color:#fff;
      font-size:13px; font-weight:700;
      display:flex; align-items:center; justify-content:center;
    }
    .rec-info { flex:1; min-width:0; }
    .rec-name   { font-size:13px; font-weight:700; margin:0; color:var(--lms-text); }
    .rec-course { font-size:12px; color:var(--lms-text-2); margin:2px 0 0;
      strong { color:var(--lms-text); }
    }
    .rec-time   { font-size:11px; color:var(--lms-text-muted); flex-shrink:0; }
    .rev-head-mini { display:flex; align-items:center; gap:8px; }
    .stars { color:var(--lms-amber); font-size:13px; }

    /* ── Thumbnails ── */
    .grad-blue   { background: linear-gradient(135deg,#1e3a8a 0%,#3b82f6 100%); }
    .grad-pink   { background: linear-gradient(135deg,#831843 0%,#ec4899 100%); }
    .grad-purple { background: linear-gradient(135deg,#4c1d95 0%,#7c3aed 100%); }
    .grad-amber  { background: linear-gradient(135deg,#78350f 0%,#f59e0b 100%); }
    .grad-cyan   { background: linear-gradient(135deg,#164e63 0%,#06b6d4 100%); }
    .grad-green  { background: linear-gradient(135deg,#064e3b 0%,#10b981 100%); }
  `]
})
export class InstructorComponent implements OnInit {
  private readonly snack  = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly api    = inject(CourseService);

  searchSignal = signal('');
  get search(): string { return this.searchSignal(); }
  set search(v: string) { this.searchSignal.set(v); }

  myCourses = signal<CourseSummary[]>([]);
  loading   = signal(true);

  ngOnInit(): void { this.refresh(); }

  private refresh(): void {
    this.api.list({ pageSize: 100 }).subscribe({
      next: list => { this.myCourses.set(list); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  filteredCourses = computed(() => {
    const term = this.searchSignal().trim().toLowerCase();
    if (!term) return this.myCourses();
    return this.myCourses().filter(c =>
      c.title.toLowerCase().includes(term) ||
      c.category.toLowerCase().includes(term) ||
      c.level.toLowerCase().includes(term)
    );
  });

  openCreateDialog(): void {
    const ref = this.dialog.open(CourseFormDialogComponent, {
      width: '600px', data: { mode: 'create' },
    });
    ref.afterClosed().subscribe((payload?: CourseFormPayload | null) => {
      if (!payload) return;
      this.api.create(payload).subscribe({
        next: created => {
          this.snack.open(`"${created.title}" created (draft — admin can publish)`, 'OK', { duration: 3000, panelClass: 'snack-ok' });
          this.refresh();
        },
        error: (e: { error?: { message?: string } }) =>
          this.snack.open(e?.error?.message ?? 'Could not create course', 'OK', { duration: 3000, panelClass: 'snack-err' }),
      });
    });
  }

  onEditCourse(c: CourseSummary): void {
    this.api.get(c.id).subscribe({
      next: detail => {
        const ref = this.dialog.open(CourseFormDialogComponent, {
          width: '600px',
          data: {
            mode: 'edit',
            id: c.id,
            initial: {
              title: detail.title, subtitle: detail.subtitle, description: detail.description,
              category: detail.category, level: detail.level, price: detail.price,
              duration: detail.duration, thumbnailGradient: detail.thumbnailGradient,
              imageUrl: detail.imageUrl,
            },
          },
        });
        ref.afterClosed().subscribe((payload?: CourseFormPayload | null) => {
          if (!payload) return;
          this.api.update(c.id, payload).subscribe({
            next: () => { this.snack.open('Course updated', 'OK', { duration: 2500, panelClass: 'snack-ok' }); this.refresh(); },
            error: (e: { error?: { message?: string } }) =>
              this.snack.open(e?.error?.message ?? 'Could not save', 'OK', { duration: 3000, panelClass: 'snack-err' }),
          });
        });
      },
      error: () => this.snack.open('Could not load course', 'OK', { duration: 2500, panelClass: 'snack-err' }),
    });
  }

  onAnalytics(c: CourseSummary): void {
    this.dialog.open(AnalyticsDialogComponent, {
      data: {
        title: c.title,
        studentCount: c.studentCount,
        reviewCount: c.reviewCount,
        rating: c.rating,
        price: c.price,
        lessonCount: c.lessonCount,
        duration: c.duration,
      },
      maxWidth: '640px',
      width: '92vw',
      autoFocus: false,
    });
  }

  kpis = [
    { label:'Total Students',  value:'287k', change:'+12%', positive:true,  icon:'group',    gradient:'linear-gradient(135deg,#7C3AED,#3B82F6)' },
    { label:'Total Revenue',   value:'$84.2k', change:'+8.4%', positive:true,  icon:'paid',    gradient:'linear-gradient(135deg,#10B981,#06B6D4)' },
    { label:'Avg Rating',      value:'4.8',  change:'+0.1', positive:true,  icon:'star',    gradient:'linear-gradient(135deg,#F59E0B,#EF4444)' },
    { label:'Active Courses',  value:'12',   change:'+2',   positive:true,  icon:'menu_book', gradient:'linear-gradient(135deg,#EC4899,#F87171)' },
  ];

  revenueMonths = ['Dec','Jan','Feb','Mar','Apr','May'];
  revenueSeries = [{ name:'Revenue', data:[8400,11200,9800,14500,16800,18300] }];

  enrollmentLabels = ['Web Dev','UI/UX','Python','AWS','React'];
  enrollmentData = [842, 421, 1310, 297, 215];

  recentStudents = [
    { id:'1', avatar:'M', name:'Marcus T.',  course:'Complete Web Dev Bootcamp', time:'2 min ago' },
    { id:'2', avatar:'P', name:'Priya S.',   course:'Python for Data Science',   time:'14 min ago' },
    { id:'3', avatar:'D', name:'David K.',   course:'UI/UX Design Masterclass',  time:'1 hour ago' },
    { id:'4', avatar:'A', name:'Anna L.',    course:'React & TypeScript Advanced', time:'3 hours ago' },
    { id:'5', avatar:'J', name:'Jamal R.',   course:'AWS Cloud Practitioner',    time:'5 hours ago' },
  ];

  latestReviews = [
    { id:'r1', avatar:'M', user:'Marcus T.',  rating:5, text:'Best course I\'ve taken. Crystal clear explanations.' },
    { id:'r2', avatar:'P', user:'Priya S.',   rating:5, text:'Got my first dev job 3 months later!' },
    { id:'r3', avatar:'A', user:'Anna L.',    rating:5, text:'Went from zero to building full apps.' },
  ];

  formatRevenue = (v: number): string => v >= 1000 ? `$${(v/1000).toFixed(1)}k` : `$${v}`;
  stars(r: number): string { return '★'.repeat(Math.round(r)); }
}
