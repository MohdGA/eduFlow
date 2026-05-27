import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export interface AnalyticsData {
  title: string;
  studentCount: number;
  reviewCount: number;
  rating: number;
  price: number;
  lessonCount: number;
  duration: string;
}

@Component({
  selector: 'app-analytics-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatIconModule],
  template: `
    <div class="a-wrap">
      <header class="a-head">
        <div>
          <p class="a-eyebrow">Course analytics</p>
          <h2>{{ data.title }}</h2>
        </div>
        <button class="close" (click)="ref.close()" aria-label="Close"><mat-icon>close</mat-icon></button>
      </header>

      <div class="a-grid">
        <div class="kpi"><mat-icon class="ic blue">group</mat-icon>
          <p class="lbl">Students enrolled</p>
          <p class="val">{{ data.studentCount.toLocaleString() }}</p>
        </div>
        <div class="kpi"><mat-icon class="ic amber">star</mat-icon>
          <p class="lbl">Rating</p>
          <p class="val">{{ data.rating }} <small>/ 5</small></p>
          <p class="sub">{{ data.reviewCount.toLocaleString() }} reviews</p>
        </div>
        <div class="kpi"><mat-icon class="ic green">paid</mat-icon>
          <p class="lbl">Instructor cut (70%)</p>
          <p class="val">\${{ cut }}</p>
          <p class="sub">per sale at \${{ data.price }}</p>
        </div>
        <div class="kpi"><mat-icon class="ic purple">trending_up</mat-icon>
          <p class="lbl">Est. monthly revenue</p>
          <p class="val">\${{ monthlyRevenue }}</p>
          <p class="sub">based on lifetime enrollments / 12</p>
        </div>
        <div class="kpi"><mat-icon class="ic pink">menu_book</mat-icon>
          <p class="lbl">Lessons</p>
          <p class="val">{{ data.lessonCount }}</p>
        </div>
        <div class="kpi"><mat-icon class="ic cyan">schedule</mat-icon>
          <p class="lbl">Total runtime</p>
          <p class="val">{{ data.duration }}</p>
        </div>
      </div>

      <footer class="a-foot">
        <p class="note">Drill-down funnels & per-lesson completion are coming to the production dashboard.</p>
        <button class="btn" (click)="ref.close()">Close</button>
      </footer>
    </div>
  `,
  styles: [`
    :host { display:block; width: 640px; max-width: 92vw; }
    .a-wrap { background: var(--lms-surface, #1a1a2e); color: var(--lms-text, #fff);
      border-radius: 14px; overflow: hidden; }
    .a-head { display:flex; align-items:flex-start; justify-content:space-between;
      padding: 18px 22px; border-bottom: 1px solid var(--lms-border, rgba(255,255,255,0.1)); }
    .a-head h2 { margin: 2px 0 0; font-size: 18px; font-weight: 700; }
    .a-eyebrow { margin: 0; font-size: 11px; letter-spacing: .12em; text-transform: uppercase; opacity: .6; }
    .close { background:none; border:none; cursor:pointer; color: inherit;
      width: 32px; height: 32px; border-radius: 50%; display:flex; align-items:center; justify-content:center; }
    .close:hover { background: rgba(255,255,255,0.06); }
    .a-grid { padding: 18px; display:grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
    .kpi { background: var(--lms-surface-2, rgba(255,255,255,0.03));
      border: 1px solid var(--lms-border, rgba(255,255,255,0.08));
      border-radius: 10px; padding: 14px; }
    .kpi .lbl { margin: 8px 0 4px; font-size: 12px; opacity: .7; }
    .kpi .val { margin: 0; font-size: 22px; font-weight: 800; }
    .kpi .val small { font-size: 12px; opacity: .55; font-weight: 600; }
    .kpi .sub { margin: 4px 0 0; font-size: 11px; opacity: .55; }
    .ic { padding: 6px; border-radius: 8px; }
    .ic.blue   { background: rgba(59,130,246,.15);  color:#60A5FA; }
    .ic.amber  { background: rgba(245,158,11,.15);  color:#F59E0B; }
    .ic.green  { background: rgba(16,185,129,.15);  color:#10B981; }
    .ic.purple { background: rgba(124,58,237,.15);  color:#A78BFA; }
    .ic.pink   { background: rgba(236,72,153,.15);  color:#EC4899; }
    .ic.cyan   { background: rgba(6,182,212,.15);   color:#06B6D4; }
    .a-foot { padding: 14px 22px 18px; display:flex; align-items:center; justify-content:space-between;
      gap: 12px; border-top: 1px solid var(--lms-border, rgba(255,255,255,0.08)); }
    .note { margin: 0; font-size: 12px; opacity: .55; }
    .btn { padding: 9px 18px; border-radius: 8px; border:none; cursor:pointer;
      background: linear-gradient(135deg, #7C3AED, #3B82F6); color: white; font-weight: 600; }
    .btn:hover { filter: brightness(1.1); }
  `],
})
export class AnalyticsDialogComponent {
  cut: string;
  monthlyRevenue: string;
  constructor(
    public ref: MatDialogRef<AnalyticsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AnalyticsData,
  ) {
    this.cut = (data.price * 0.7).toFixed(2);
    const m = data.studentCount > 0 ? (data.studentCount * data.price * 0.7 / 12) : 0;
    this.monthlyRevenue = m.toLocaleString(undefined, { maximumFractionDigits: 0 });
  }
}
