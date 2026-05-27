import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { AdminService, AdminCourse } from '../../../core/services/admin.service';
import { CourseService, CourseFormPayload } from '../../../core/services/course.service';
import { CourseFormDialogComponent } from '../../../shared/course-form-dialog.component';

@Component({
  selector: 'app-admin-courses',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatIconModule, MatTooltipModule],
  template: `
  <div class="wrap">
    <div class="head afd">
      <div>
        <h1>Courses</h1>
        <p>{{ courses().length }} total · publish, unpublish, or remove courses</p>
      </div>
      <div class="head-actions">
        <div class="search">
          <mat-icon>search</mat-icon>
          <input placeholder="Search courses…" [(ngModel)]="search" (ngModelChange)="fetchDebounced()" maxlength="80">
        </div>
        <select class="filter" [(ngModel)]="status" (ngModelChange)="fetch()">
          <option value="">All</option>
          <option value="true">Published</option>
          <option value="false">Draft</option>
        </select>
        <button class="create-btn" (click)="openCreate()">
          <mat-icon>add</mat-icon> New Course
        </button>
      </div>
    </div>

    @if (loading()) {
      <p class="muted">Loading…</p>
    } @else {
      <div class="grid afu">
        @for (c of courses(); track c.id; let i = $index) {
          <div class="card" [style.animation-delay.s]="i * 0.04">
            <div class="card-top">
              <span class="lms-badge" [class]="catColor(c.category)">{{ c.category }}</span>
              @if (c.isPublished) {
                <span class="lms-badge green">Published</span>
              } @else {
                <span class="lms-badge grey">Draft</span>
              }
            </div>
            <h3 class="title">{{ c.title }}</h3>
            <p class="sub">{{ c.subtitle }}</p>
            <div class="meta">
              <span><mat-icon>person</mat-icon>{{ c.instructorName }}</span>
              <span><mat-icon>group</mat-icon>{{ c.enrollments }} enrolled</span>
              <span><mat-icon>paid</mat-icon>\${{ c.price }}</span>
            </div>
            <div class="card-foot">
              <a [routerLink]="['/course', c.id]" class="link-btn" matTooltip="View public page">
                <mat-icon>visibility</mat-icon>
              </a>
              <a [routerLink]="['/instructor/course', c.id, 'curriculum']" class="link-btn" matTooltip="Manage curriculum">
                <mat-icon>menu_book</mat-icon>
              </a>
              <button class="btn ghost" matTooltip="Edit course" (click)="openEdit(c)">
                <mat-icon>edit</mat-icon>
              </button>
              <button class="btn" (click)="togglePublish(c)" [matTooltip]="c.isPublished ? 'Unpublish' : 'Publish'">
                <mat-icon>{{ c.isPublished ? 'unpublished' : 'publish' }}</mat-icon>
                {{ c.isPublished ? 'Unpublish' : 'Publish' }}
              </button>
              <button class="btn danger" matTooltip="Delete course" (click)="remove(c)">
                <mat-icon>delete</mat-icon>
              </button>
            </div>
          </div>
        } @empty {
          <p class="muted" style="grid-column:1/-1; text-align:center; padding:32px">No courses match.</p>
        }
      </div>
    }
  </div>
  `,
  styles: [`
    .wrap { max-width: 1300px; }
    .head { display:flex; justify-content:space-between; align-items:flex-end; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
    .head h1 { font-size: 26px; font-weight: 900; margin: 0 0 4px; letter-spacing: -.4px; }
    .head p  { color: var(--lms-text-2); font-size: 13px; margin: 0; }
    .head-actions { display: flex; gap: 8px; }
    .search {
      display: flex; align-items: center; gap: 8px;
      background: var(--lms-surface); border: 1px solid var(--lms-border);
      border-radius: var(--lms-radius-sm); padding: 8px 14px;
      &:focus-within { border-color: var(--lms-purple); }
      mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--lms-text-2); }
      input { background: transparent; border: none; outline: none; color: var(--lms-text); font-size: 13px; min-width: 240px;
        &::placeholder { color: var(--lms-text-muted); } }
    }
    .filter {
      background: var(--lms-surface); border: 1px solid var(--lms-border);
      border-radius: var(--lms-radius-sm); padding: 9px 14px;
      color: var(--lms-text); font-size: 13px; cursor: pointer;
      &:focus { outline: none; border-color: var(--lms-purple); }
    }
    .create-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 9px 18px; border: none; border-radius: var(--lms-radius-sm);
      background: var(--lms-gradient); color: #fff;
      font-size: 13px; font-weight: 700; cursor: pointer;
      box-shadow: var(--lms-shadow-purple);
      transition: opacity .15s, transform .15s;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
      &:hover { opacity: .92; transform: translateY(-1px); }
    }
    .btn.ghost { background: transparent; }
    .muted { color: var(--lms-text-2); }

    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px; }
    .card {
      background: var(--lms-surface); border: 1px solid var(--lms-border);
      border-radius: var(--lms-radius); padding: 20px;
      animation: fadeIn .4s ease both;
      transition: transform .25s, border-color .2s, box-shadow .25s;
      &:hover { transform: translateY(-3px); border-color: var(--lms-border-hover); box-shadow: 0 16px 40px rgba(0,0,0,.3); }
    }
    .card-top { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
    .title { font-size: 15px; font-weight: 800; margin: 0 0 6px; line-height: 1.35; }
    .sub   { font-size: 12.5px; color: var(--lms-text-2); margin: 0 0 14px; line-height: 1.45;
             display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .meta { display: flex; flex-wrap: wrap; gap: 12px; color: var(--lms-text-muted); font-size: 11.5px; margin-bottom: 16px;
            span { display: inline-flex; align-items: center; gap: 4px; }
            mat-icon { font-size: 14px; width: 14px; height: 14px; }
    }
    .card-foot { display: flex; gap: 6px; padding-top: 12px; border-top: 1px solid var(--lms-border); }
    .link-btn, .btn {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 7px 12px; border-radius: 8px; cursor: pointer;
      font-size: 12px; font-weight: 600;
      border: 1px solid var(--lms-border); background: var(--lms-surface-2);
      color: var(--lms-text-2); text-decoration: none;
      transition: all .15s;
      mat-icon { font-size: 15px; width: 15px; height: 15px; }
      &:hover { color: var(--lms-text); border-color: var(--lms-border-hover); }
    }
    .btn { flex: 1; justify-content: center; }
    .btn.danger { flex: 0; padding: 7px 9px;
      &:hover { color: var(--lms-red); border-color: var(--lms-red); }
    }
    .lms-badge.grey { background: var(--lms-surface-3); color: var(--lms-text-2); }
    @keyframes fadeIn { from { opacity:0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class AdminCoursesComponent implements OnInit {
  private readonly api    = inject(AdminService);
  private readonly course = inject(CourseService);
  private readonly snack  = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  openCreate(): void {
    const ref = this.dialog.open(CourseFormDialogComponent, {
      width: '600px', data: { mode: 'create' }, panelClass: 'cf-panel',
    });
    ref.afterClosed().subscribe((payload?: CourseFormPayload | null) => {
      if (!payload) return;
      this.course.create(payload).subscribe({
        next: () => { this.snack.open('Course created (draft)', 'OK', { duration: 2200, panelClass: 'snack-ok' }); this.fetch(); },
        error: (e: { error?: { message?: string } }) => this.snack.open(e?.error?.message ?? 'Could not create course', 'OK', { duration: 3000, panelClass: 'snack-err' }),
      });
    });
  }

  openEdit(c: AdminCourse): void {
    // Fetch full detail so description prefills correctly
    this.course.get(c.id).subscribe({
      next: detail => {
        const ref = this.dialog.open(CourseFormDialogComponent, {
          width: '600px', panelClass: 'cf-panel',
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
          this.course.update(c.id, payload).subscribe({
            next: () => { this.snack.open('Course updated', 'OK', { duration: 2200, panelClass: 'snack-ok' }); this.fetch(); },
            error: (e: { error?: { message?: string } }) => this.snack.open(e?.error?.message ?? 'Could not save', 'OK', { duration: 3000, panelClass: 'snack-err' }),
          });
        });
      },
      error: () => this.snack.open('Could not load course', 'OK', { duration: 2500, panelClass: 'snack-err' }),
    });
  }

  courses  = signal<AdminCourse[]>([]);
  loading  = signal(true);
  search   = '';
  status   = ''; // "", "true", "false"
  private debounce: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void { this.fetch(); }

  fetch(): void {
    this.loading.set(true);
    const opts: { search?: string; published?: boolean } = {};
    if (this.search) opts.search = this.search;
    if (this.status === 'true')  opts.published = true;
    if (this.status === 'false') opts.published = false;

    this.api.listCourses(opts).subscribe({
      next: list => { this.courses.set(list); this.loading.set(false); },
      error: () => { this.loading.set(false); this.snack.open('Could not load courses', 'OK', { duration: 3000, panelClass: 'snack-err' }); },
    });
  }
  fetchDebounced(): void {
    if (this.debounce) clearTimeout(this.debounce);
    this.debounce = setTimeout(() => this.fetch(), 350);
  }

  togglePublish(c: AdminCourse): void {
    const next = !c.isPublished;
    this.api.setPublished(c.id, next).subscribe({
      next: () => {
        // Immutable update — replace the course object in the signal-backed list
        // so Angular's change detection sees a new reference and the @if conditional
        // for Published/Draft re-evaluates cleanly (fixes NG0100).
        this.courses.update(list => list.map(x =>
          x.id === c.id ? { ...x, isPublished: next } : x
        ));
        this.snack.open(next ? 'Published' : 'Unpublished', 'OK', { duration: 2200, panelClass: 'snack-ok' });
      },
      error: () => this.snack.open('Failed to update course', 'OK', { duration: 3000, panelClass: 'snack-err' }),
    });
  }

  remove(c: AdminCourse): void {
    if (!confirm(`Delete "${c.title}"? This removes the course, its sections, lessons, and enrollments.`)) return;
    this.api.deleteCourse(c.id).subscribe({
      next: () => { this.courses.update(list => list.filter(x => x.id !== c.id));
                    this.snack.open('Course deleted', 'OK', { duration: 2200, panelClass: 'snack-ok' }); },
      error: () => this.snack.open('Failed to delete', 'OK', { duration: 3000, panelClass: 'snack-err' }),
    });
  }

  catColor(c: string): string {
    const m: Record<string, string> = { Development:'blue', Design:'pink', 'Data Science':'purple', Cloud:'cyan', Marketing:'green', Mobile:'amber' };
    return m[c] ?? 'purple';
  }
}
