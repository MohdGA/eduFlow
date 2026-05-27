import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { NgApexchartsModule } from 'ng-apexcharts';
import { AdminService, AdminStats, AuditEntry } from '../../../core/services/admin.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, NgApexchartsModule],
  template: `
  <div class="ad-wrap">

    <div class="ad-head afd">
      <div>
        <h1>Dashboard</h1>
        <p>Platform overview, today</p>
      </div>
    </div>

    @if (loading()) {
      <p class="muted">Loading…</p>
    } @else if (stats(); as s) {
      <!-- ── KPI cards ── -->
      <div class="kpi-grid afu">
        <a routerLink="/admin/users" class="kpi-card" [style.--grad]="'linear-gradient(135deg,#7C3AED,#3B82F6)'">
          <div class="kpi-icon"><mat-icon>group</mat-icon></div>
          <div class="kpi-val">{{ s.totalUsers | number }}</div>
          <div class="kpi-label">Total Users</div>
          <div class="kpi-sub">+{{ s.newUsersLast30Days }} last 30d</div>
        </a>
        <a routerLink="/admin/courses" class="kpi-card" [style.--grad]="'linear-gradient(135deg,#EC4899,#F87171)'">
          <div class="kpi-icon"><mat-icon>menu_book</mat-icon></div>
          <div class="kpi-val">{{ s.totalCourses | number }}</div>
          <div class="kpi-label">Courses</div>
          <div class="kpi-sub">{{ s.publishedCourses }} published</div>
        </a>
        <div class="kpi-card" [style.--grad]="'linear-gradient(135deg,#10B981,#06B6D4)'">
          <div class="kpi-icon"><mat-icon>school</mat-icon></div>
          <div class="kpi-val">{{ s.totalEnrollments | number }}</div>
          <div class="kpi-label">Enrollments</div>
          <div class="kpi-sub">{{ s.totalStudents }} students</div>
        </div>
        <div class="kpi-card" [style.--grad]="'linear-gradient(135deg,#F59E0B,#EF4444)'">
          <div class="kpi-icon"><mat-icon>paid</mat-icon></div>
          <div class="kpi-val">\${{ s.monthRevenue | number:'1.0-0' }}</div>
          <div class="kpi-label">Revenue (MTD)</div>
          <div class="kpi-sub">{{ s.totalInstructors }} instructors</div>
        </div>
      </div>

      <!-- ── Two-column section ── -->
      <div class="row afu" style="animation-delay:.15s">
        <div class="panel">
          <div class="panel-head">
            <h3>Composition</h3>
          </div>
          <apx-chart
            [series]="[s.totalStudents, s.totalInstructors, 1]"
            [chart]="{ type:'donut', height:260, background:'transparent' }"
            [labels]="['Students','Instructors','Admins']"
            [colors]="['#7C3AED','#3B82F6','#F59E0B']"
            [stroke]="{ width:0 }"
            [legend]="{ position:'bottom', labels:{colors:'#9090B0'}, fontSize:'12px' }"
            [dataLabels]="{ enabled:false }"
            [plotOptions]="{ pie:{ donut:{ size:'72%' } } }"
            [theme]="{ mode:'dark' }">
          </apx-chart>
        </div>

        <div class="panel">
          <div class="panel-head">
            <h3>Recent activity</h3>
            <a routerLink="/admin/audit">View all <mat-icon>arrow_forward</mat-icon></a>
          </div>
          <div class="audit-list">
            @for (a of recent(); track a.id) {
              <div class="audit-row">
                <div class="audit-dot" [class]="actionColor(a.action)"></div>
                <div class="audit-body">
                  <p class="audit-msg"><strong>{{ a.userName ?? 'System' }}</strong> {{ humanize(a.action) }}</p>
                  <p class="audit-meta">{{ a.detail }} · {{ a.createdAt | date:'short' }}</p>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    } @else if (error()) {
      <p class="err">{{ error() }}</p>
    }

  </div>
  `,
  styles: [`
    .ad-wrap { max-width: 1200px; }
    .ad-head { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; }
    .ad-head h1 { font-size: 26px; font-weight: 900; margin: 0 0 4px; letter-spacing: -.4px; }
    .ad-head p  { color: var(--lms-text-2); font-size: 13px; margin: 0; }

    .muted { color: var(--lms-text-2); }
    .err   { color: var(--lms-red); }

    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px; }
    .kpi-card {
      position: relative; padding: 22px;
      background: var(--lms-surface); border: 1px solid var(--lms-border);
      border-radius: var(--lms-radius); text-decoration: none; overflow: hidden;
      transition: transform .25s, border-color .2s, box-shadow .25s;
      &::before {
        content: ''; position: absolute; top: 0; right: 0;
        width: 140px; height: 140px; border-radius: 99px;
        background: var(--grad); opacity: .10;
        transform: translate(40px, -40px); filter: blur(20px);
        transition: opacity .3s;
      }
      &:hover { transform: translateY(-3px); border-color: var(--lms-border-hover); box-shadow: 0 16px 40px rgba(0,0,0,.3);
        &::before { opacity: .22; }
      }
    }
    .kpi-icon {
      width: 38px; height: 38px; border-radius: 10px;
      background: var(--grad);
      display: flex; align-items: center; justify-content: center;
      box-shadow: inset 0 -4px 8px rgba(0,0,0,.25);
      margin-bottom: 14px;
      mat-icon { color: #fff; font-size: 18px; width: 18px; height: 18px;
                 filter: drop-shadow(0 2px 4px rgba(0,0,0,.25)); }
    }
    .kpi-val { font-size: 30px; font-weight: 900; letter-spacing: -.8px; color: var(--lms-text); }
    .kpi-label { font-size: 12px; color: var(--lms-text-2); margin-top: 4px; }
    .kpi-sub { font-size: 11px; color: var(--lms-purple-2); font-weight: 600; margin-top: 10px; }

    .row { display: grid; grid-template-columns: 1fr 1.6fr; gap: 16px; }
    .panel {
      background: var(--lms-surface); border: 1px solid var(--lms-border);
      border-radius: var(--lms-radius); padding: 20px;
    }
    .panel-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;
      h3 { font-size: 15px; font-weight: 800; margin: 0; }
      a  { display: inline-flex; align-items: center; gap: 3px; color: var(--lms-purple-2); font-size: 12.5px; font-weight: 600; text-decoration: none;
           mat-icon { font-size: 15px; width: 15px; height: 15px; } }
    }

    .audit-list { display: flex; flex-direction: column; gap: 12px; max-height: 260px; overflow-y: auto; padding-right: 4px; }
    .audit-row { display: flex; gap: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--lms-border);
      &:last-child { border: none; padding-bottom: 0; }
    }
    .audit-dot {
      width: 8px; height: 8px; border-radius: 99px; margin-top: 6px; flex-shrink: 0;
      &.purple { background: var(--lms-purple); box-shadow: 0 0 10px var(--lms-purple); }
      &.blue   { background: var(--lms-blue);   box-shadow: 0 0 10px var(--lms-blue); }
      &.green  { background: var(--lms-green);  box-shadow: 0 0 10px var(--lms-green); }
      &.amber  { background: var(--lms-amber);  box-shadow: 0 0 10px var(--lms-amber); }
      &.red    { background: var(--lms-red);    box-shadow: 0 0 10px var(--lms-red); }
      &.grey   { background: var(--lms-text-muted); }
    }
    .audit-msg { font-size: 13px; margin: 0; color: var(--lms-text-2); strong { color: var(--lms-text); } }
    .audit-meta { font-size: 11px; color: var(--lms-text-muted); margin: 3px 0 0; }
  `]
})
export class AdminDashboardComponent implements OnInit {
  private readonly api = inject(AdminService);

  loading = signal(true);
  error   = signal<string | null>(null);
  stats   = signal<AdminStats | null>(null);
  recent  = signal<AuditEntry[]>([]);

  ngOnInit(): void {
    this.api.stats().subscribe({
      next: s => { this.stats.set(s); this.loading.set(false); },
      error: (e: { error?: { message?: string } }) => {
        this.error.set(e?.error?.message ?? 'Failed to load stats');
        this.loading.set(false);
      },
    });
    this.api.audit(1, 8).subscribe({ next: a => this.recent.set(a), error: () => {} });
  }

  actionColor(action: string): string {
    const a = action.toLowerCase();
    if (a.includes('delete') || a.includes('fail')) return 'red';
    if (a.includes('publish')) return 'green';
    if (a.includes('login') || a.includes('register')) return 'blue';
    if (a.includes('enroll') || a.includes('course')) return 'purple';
    if (a.includes('rate')) return 'amber';
    return 'grey';
  }

  humanize(action: string): string {
    return action.toLowerCase().replace(/_/g, ' ');
  }
}
