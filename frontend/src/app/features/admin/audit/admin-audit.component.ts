import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { AdminService, AuditEntry } from '../../../core/services/admin.service';

@Component({
  selector: 'app-admin-audit',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
  <div class="wrap">
    <div class="head afd">
      <div>
        <h1>Audit Log</h1>
        <p>Security & activity events across the platform</p>
      </div>
      <div class="head-actions">
        <button class="btn" (click)="prev()" [disabled]="page() === 1"><mat-icon>chevron_left</mat-icon> Prev</button>
        <span class="page-label">Page {{ page() }}</span>
        <button class="btn" (click)="next()" [disabled]="entries().length < pageSize">Next <mat-icon>chevron_right</mat-icon></button>
      </div>
    </div>

    @if (loading()) {
      <p class="muted">Loading…</p>
    } @else {
      <div class="table afu">
        <div class="thead">
          <span style="flex:1.2">Time</span>
          <span style="flex:1">Action</span>
          <span style="flex:1">Resource</span>
          <span style="flex:2">Detail</span>
          <span style="flex:1">User</span>
          <span style="flex:1">IP</span>
        </div>
        @for (a of entries(); track a.id; let i = $index) {
          <div class="trow" [style.animation-delay.s]="i * 0.02">
            <div class="t-cell" style="flex:1.2; white-space:nowrap">{{ a.createdAt | date:'MMM d · h:mm a' }}</div>
            <div style="flex:1"><span class="lms-badge" [class]="actionColor(a.action)">{{ a.action }}</span></div>
            <div class="t-cell" style="flex:1">{{ a.resource }}</div>
            <div class="t-cell detail" style="flex:2">{{ a.detail }}</div>
            <div class="t-cell" style="flex:1">{{ a.userName ?? 'System' }}</div>
            <div style="flex:1"><code class="ip">{{ a.ipAddress ?? '—' }}</code></div>
          </div>
        } @empty {
          <p class="muted" style="padding:32px; text-align:center">No entries on this page.</p>
        }
      </div>
    }
  </div>
  `,
  styles: [`
    .wrap { max-width: 1300px; }
    .head { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
    .head h1 { font-size: 26px; font-weight: 900; margin: 0 0 4px; }
    .head p  { color: var(--lms-text-2); font-size: 13px; margin: 0; }

    .head-actions { display: flex; align-items: center; gap: 8px; }
    .btn {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 7px 14px; border-radius: var(--lms-radius-sm);
      border: 1px solid var(--lms-border); background: var(--lms-surface);
      color: var(--lms-text); font-size: 13px; font-weight: 600; cursor: pointer;
      transition: all .15s;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
      &:hover:not(:disabled) { border-color: var(--lms-border-hover); }
      &:disabled { opacity: .4; cursor: not-allowed; }
    }
    .page-label { font-size: 12.5px; color: var(--lms-text-2); min-width: 64px; text-align: center; }
    .muted { color: var(--lms-text-2); }

    .table { background: var(--lms-surface); border: 1px solid var(--lms-border); border-radius: var(--lms-radius); overflow: hidden; }
    .thead, .trow { display: flex; align-items: center; gap: 14px; padding: 12px 18px; font-size: 13px; }
    .thead { background: var(--lms-surface-2); font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .8px; color: var(--lms-text-muted); border-bottom: 1px solid var(--lms-border); }
    .trow { border-bottom: 1px solid var(--lms-border); animation: fadeIn .4s ease both;
            &:hover { background: var(--lms-surface-2); }
            &:last-child { border: none; }
    }
    .t-cell { color: var(--lms-text-2); }
    .detail { color: var(--lms-text); max-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ip {
      font-family: 'Roboto Mono', monospace; font-size: 11.5px;
      padding: 2px 8px; border-radius: 5px;
      background: var(--lms-bg); border: 1px solid var(--lms-border); color: var(--lms-text-2);
    }
    @keyframes fadeIn { from { opacity:0; transform: translateX(8px); } to { opacity: 1; transform: translateX(0); } }
  `]
})
export class AdminAuditComponent implements OnInit {
  private readonly api = inject(AdminService);

  entries = signal<AuditEntry[]>([]);
  loading = signal(true);
  page    = signal(1);
  readonly pageSize = 50;

  ngOnInit(): void { this.fetch(); }

  fetch(): void {
    this.loading.set(true);
    this.api.audit(this.page(), this.pageSize).subscribe({
      next: list => { this.entries.set(list); this.loading.set(false); },
      error: () => { this.loading.set(false); },
    });
  }
  prev(): void { if (this.page() > 1) { this.page.update(p => p - 1); this.fetch(); } }
  next(): void { if (this.entries().length >= this.pageSize) { this.page.update(p => p + 1); this.fetch(); } }

  actionColor(action: string): string {
    const a = action.toLowerCase();
    if (a.includes('delete') || a.includes('fail')) return 'red';
    if (a.includes('publish')) return 'green';
    if (a.includes('login') || a.includes('register')) return 'blue';
    if (a.includes('enroll') || a.includes('course') || a.includes('user')) return 'purple';
    if (a.includes('rate')) return 'amber';
    return 'grey';
  }
}
