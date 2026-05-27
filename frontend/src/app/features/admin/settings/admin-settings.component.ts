import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AdminService } from '../../../core/services/admin.service';

interface SettingsState {
  siteName: string; supportEmail: string;
  publicSignup: boolean; maintenance: boolean;
  adminMfa: boolean; sessionMins: number; rateLimit: number;
  smtpHost: string; smtpPort: number; smtpFrom: string;
}
const STORAGE_KEY = 'eduflow.adminSettings';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
  <div class="wrap">
    <div class="head afd">
      <div>
        <h1>Settings</h1>
        <p>Platform configuration</p>
      </div>
    </div>

    <div class="grid afu">
      <section class="card">
        <h3>General</h3>
        <div class="field">
          <label>Site name</label>
          <input [(ngModel)]="siteName" maxlength="80">
        </div>
        <div class="field">
          <label>Support email</label>
          <input type="email" [(ngModel)]="supportEmail" maxlength="120">
        </div>
        <div class="field row">
          <div>
            <label>Allow public registration</label>
            <p class="hint">If off, only admins can create accounts</p>
          </div>
          <label class="toggle">
            <input type="checkbox" [(ngModel)]="publicSignup">
            <span class="track"><span class="thumb"></span></span>
          </label>
        </div>
        <div class="field row">
          <div>
            <label>Maintenance mode</label>
            <p class="hint">Show a maintenance banner to non-admin users</p>
          </div>
          <label class="toggle">
            <input type="checkbox" [(ngModel)]="maintenance">
            <span class="track"><span class="thumb"></span></span>
          </label>
        </div>
      </section>

      <section class="card">
        <h3>Security</h3>
        <div class="field row">
          <div>
            <label>Require 2FA for admins</label>
            <p class="hint">Admin accounts must enable TOTP at next login</p>
          </div>
          <label class="toggle">
            <input type="checkbox" [(ngModel)]="adminMfa">
            <span class="track"><span class="thumb"></span></span>
          </label>
        </div>
        <div class="field">
          <label>Session lifetime (minutes)</label>
          <input type="number" min="15" max="1440" [(ngModel)]="sessionMins">
        </div>
        <div class="field">
          <label>Rate limit (req / min / IP)</label>
          <input type="number" min="10" max="1000" [(ngModel)]="rateLimit">
        </div>
      </section>

      <section class="card">
        <h3>Email</h3>
        <div class="field">
          <label>SMTP host</label>
          <input [(ngModel)]="smtpHost" placeholder="smtp.example.com" maxlength="120">
        </div>
        <div class="field">
          <label>SMTP port</label>
          <input type="number" [(ngModel)]="smtpPort">
        </div>
        <div class="field">
          <label>From address</label>
          <input type="email" [(ngModel)]="smtpFrom" maxlength="120">
        </div>
      </section>

      <section class="card danger-zone">
        <h3>Danger Zone</h3>
        <p class="zone-msg">Destructive operations. These cannot be undone.</p>
        <button class="btn danger" (click)="exportDatabase()"><mat-icon>backup</mat-icon> Export database</button>
        <button class="btn danger" (click)="clearAuditLog()"><mat-icon>delete_forever</mat-icon> Clear audit log</button>
      </section>
    </div>

    <div class="save-bar afu" style="animation-delay:.2s">
      @if (lastSaved()) {
        <span class="muted"><mat-icon style="font-size:14px;width:14px;height:14px;vertical-align:-2px;color:var(--lms-green)">check_circle</mat-icon> Saved · {{ lastSaved() }}</span>
      } @else {
        <span class="muted">Settings are stored on this device.</span>
      }
      <button class="save-btn" (click)="save()"><mat-icon>save</mat-icon> Save changes</button>
    </div>
  </div>
  `,
  styles: [`
    .wrap { max-width: 1100px; }
    .head h1 { font-size: 26px; font-weight: 900; margin: 0 0 4px; }
    .head p  { color: var(--lms-text-2); font-size: 13px; margin: 0 0 24px; }

    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .card {
      background: var(--lms-surface); border: 1px solid var(--lms-border);
      border-radius: var(--lms-radius); padding: 22px;
    }
    .card h3 { font-size: 15px; font-weight: 800; margin: 0 0 16px; }
    .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px;
      &.row { flex-direction: row; align-items: center; justify-content: space-between; gap: 16px; }
    }
    .field label { font-size: 12.5px; font-weight: 600; color: var(--lms-text-2); }
    .field input {
      background: var(--lms-surface-2); border: 1px solid var(--lms-border);
      border-radius: var(--lms-radius-sm); padding: 10px 14px;
      color: var(--lms-text); font-size: 13.5px;
      &:focus { outline: none; border-color: var(--lms-purple); }
    }
    .hint { font-size: 11.5px; color: var(--lms-text-muted); margin: 2px 0 0; max-width: 260px; }

    .toggle { position: relative; width: 44px; height: 24px; cursor: pointer;
      input { opacity: 0; width: 0; height: 0; position: absolute;
        &:checked + .track { background: var(--lms-purple); }
        &:checked + .track .thumb { transform: translateX(20px); }
      }
      .track { position: absolute; inset: 0; border-radius: 99px; background: var(--lms-surface-3); transition: background .2s; }
      .thumb { position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 99px;
              background: #fff; box-shadow: 0 2px 4px rgba(0,0,0,.25); transition: transform .2s cubic-bezier(.16,1,.3,1); }
    }

    .danger-zone { border-color: rgba(248,113,113,.3); }
    .zone-msg { font-size: 12.5px; color: var(--lms-text-2); margin: 0 0 16px; }
    .btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 9px 16px; border-radius: var(--lms-radius-sm);
      border: 1px solid var(--lms-border); background: var(--lms-surface-2);
      color: var(--lms-text); font-size: 13px; font-weight: 600; cursor: pointer;
      margin-right: 8px;
      transition: all .15s;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
      &.danger:hover { color: var(--lms-red); border-color: var(--lms-red); }
    }

    .save-bar {
      display: flex; align-items: center; justify-content: space-between;
      margin-top: 18px; padding: 16px 20px;
      background: var(--lms-surface); border: 1px solid var(--lms-border);
      border-radius: var(--lms-radius);
    }
    .muted { color: var(--lms-text-2); font-size: 12.5px; }
    .save-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 10px 22px; border-radius: var(--lms-radius-sm); border: none;
      background: var(--lms-gradient); color: #fff;
      font-size: 13px; font-weight: 700; cursor: pointer;
      box-shadow: var(--lms-shadow-purple);
      transition: opacity .15s, transform .15s;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
      &:hover { opacity: .9; transform: translateY(-1px); }
    }
  `]
})
export class AdminSettingsComponent implements OnInit {
  private readonly snack = inject(MatSnackBar);
  private readonly admin = inject(AdminService);

  siteName = 'EduFlow';
  supportEmail = 'support@eduflow.com';
  publicSignup = true;
  maintenance = false;
  adminMfa = false;
  sessionMins = 60;
  rateLimit = 120;
  smtpHost = '';
  smtpPort = 587;
  smtpFrom = '';

  lastSaved: () => string | null = () => null;
  private lastSavedValue: string | null = null;

  ngOnInit(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw) as SettingsState & { savedAt?: string };
        Object.assign(this, s);
        if (s.savedAt) this.lastSavedValue = s.savedAt;
      }
    } catch { /* ignore */ }
    this.lastSaved = () => this.lastSavedValue;
  }

  save(): void {
    const state: SettingsState & { savedAt: string } = {
      siteName: this.siteName, supportEmail: this.supportEmail,
      publicSignup: this.publicSignup, maintenance: this.maintenance,
      adminMfa: this.adminMfa, sessionMins: this.sessionMins, rateLimit: this.rateLimit,
      smtpHost: this.smtpHost, smtpPort: this.smtpPort, smtpFrom: this.smtpFrom,
      savedAt: new Date().toLocaleString(),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      this.lastSavedValue = state.savedAt;
      this.snack.open('Settings saved', 'OK', { duration: 2000, panelClass: 'snack-ok' });
    } catch {
      this.snack.open('Could not save settings', 'OK', { duration: 2500, panelClass: 'snack-err' });
    }
  }

  exportDatabase(): void {
    if (!confirm('Export the full platform database as a JSON snapshot?')) return;
    const snapshot = {
      exportedAt: new Date().toISOString(),
      note: 'This is a metadata-only export for the preview build. Production would stream a full DB dump from the backend.',
      settings: localStorage.getItem(STORAGE_KEY) ? JSON.parse(localStorage.getItem(STORAGE_KEY)!) : null,
    };
    this.downloadBlob('eduflow-export.json', JSON.stringify(snapshot, null, 2), 'application/json');
    this.snack.open('Export downloaded', 'OK', { duration: 2000, panelClass: 'snack-ok' });
  }

  clearAuditLog(): void {
    if (!confirm('Clear the entire audit log? This is irreversible. The clear action itself will be recorded.')) return;
    this.admin.clearAudit().subscribe({
      next: () => this.snack.open('Audit log cleared', 'OK', { duration: 2500, panelClass: 'snack-ok' }),
      error: (e: { error?: { message?: string } }) =>
        this.snack.open(e?.error?.message ?? 'Could not clear audit log', 'OK', { duration: 3000, panelClass: 'snack-err' }),
    });
  }

  private downloadBlob(filename: string, content: string, type: string): void {
    try {
      const blob = new Blob([content], { type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { /* ignore */ }
  }
}
