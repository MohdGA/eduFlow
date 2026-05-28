import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AdminService, AdminUser, CreateUserPayload } from '../../../core/services/admin.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatTooltipModule],
  template: `
  <div class="wrap">

    <div class="head afd">
      <div>
        <h1>Users</h1>
        <p>{{ users().length }} total · manage roles, suspend or remove</p>
      </div>
      <div class="head-actions">
        <div class="search">
          <mat-icon>search</mat-icon>
          <input placeholder="Search by name or email…" [(ngModel)]="search" (ngModelChange)="fetchDebounced()" maxlength="80">
        </div>
        <select class="filter" [(ngModel)]="roleFilter" (ngModelChange)="fetch()">
          <option value="">All roles</option>
          <option value="Student">Student</option>
          <option value="Instructor">Instructor</option>
          <option value="Admin">Admin</option>
        </select>
        <button class="create-btn" (click)="showForm.set(!showForm())">
          <mat-icon>{{ showForm() ? 'close' : 'person_add' }}</mat-icon>
          {{ showForm() ? 'Cancel' : 'Add Instructor' }}
        </button>
      </div>
    </div>

    @if (showForm()) {
      <div class="create-form afu">
        <h3 class="cf-title"><mat-icon>person_add</mat-icon> New Instructor Account</h3>
        <div class="cf-grid">
          <div class="cf-field">
            <label>First Name *</label>
            <input [(ngModel)]="form.firstName" placeholder="e.g. Sarah" maxlength="40">
          </div>
          <div class="cf-field">
            <label>Last Name *</label>
            <input [(ngModel)]="form.lastName" placeholder="e.g. Chen" maxlength="40">
          </div>
          <div class="cf-field">
            <label>Email *</label>
            <input [(ngModel)]="form.email" type="email" placeholder="instructor@example.com" maxlength="120">
          </div>
          <div class="cf-field">
            <label>Password *</label>
            <input [(ngModel)]="form.password" type="password" placeholder="Min 8 characters" maxlength="100">
          </div>
          <div class="cf-field cf-span2">
            <label>Title <span class="opt">(optional)</span></label>
            <input [(ngModel)]="form.title" placeholder="e.g. Senior Software Engineer & Educator" maxlength="140">
          </div>
          <div class="cf-field cf-span2">
            <label>Bio <span class="opt">(optional)</span></label>
            <textarea [(ngModel)]="form.bio" placeholder="A short instructor bio…" maxlength="1200" rows="3"></textarea>
          </div>
          <div class="cf-field">
            <label>Role</label>
            <select [(ngModel)]="form.role">
              <option value="Instructor">Instructor</option>
              <option value="Student">Student</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
        </div>
        <div class="cf-foot">
          <button class="create-btn" (click)="submitCreate()" [disabled]="creating()">
            <mat-icon>{{ creating() ? 'hourglass_empty' : 'check' }}</mat-icon>
            {{ creating() ? 'Creating…' : 'Create Account' }}
          </button>
        </div>
      </div>
    }

    @if (loading()) {
      <p class="muted">Loading users…</p>
    } @else {
      <div class="table afu">
        <div class="thead">
          <span style="flex:2">User</span>
          <span style="flex:1.5">Email</span>
          <span style="flex:1">Role</span>
          <span style="flex:1">Joined</span>
          <span style="flex:1">Status</span>
          <span style="flex:.8; text-align:right">Actions</span>
        </div>
        @for (u of users(); track u.id; let i = $index) {
          <div class="trow" [style.animation-delay.s]="i * 0.025">
            <div class="t-user" style="flex:2">
              <div class="av">{{ u.firstName.charAt(0) }}{{ u.lastName.charAt(0) }}</div>
              <div>
                <p class="name">{{ u.firstName }} {{ u.lastName }}</p>
                <p class="id">#{{ u.id.substring(0, 8) }}</p>
              </div>
            </div>
            <div class="t-cell" style="flex:1.5">{{ u.email }}</div>
            <div style="flex:1">
              <select class="role-select" [class]="roleClass(u.role)"
                      [value]="u.role" (change)="onRoleChange(u, $any($event.target).value)"
                      [disabled]="isSelf(u)">
                <option value="Student">Student</option>
                <option value="Instructor">Instructor</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            <div class="t-cell" style="flex:1">{{ u.createdAt | date:'MMM d, y' }}</div>
            <div style="flex:1">
              <span class="status" [class.active]="u.isActive" [class.inactive]="!u.isActive">
                <span class="dot"></span>{{ u.isActive ? 'Active' : 'Suspended' }}
              </span>
            </div>
            <div style="flex:.8; display:flex; gap:6px; justify-content:flex-end">
              <button class="btn"
                      [matTooltip]="u.isActive ? 'Suspend account' : 'Activate account'"
                      [disabled]="isSelf(u)"
                      (click)="toggleStatus(u)">
                <mat-icon>{{ u.isActive ? 'block' : 'check_circle' }}</mat-icon>
              </button>
              <button class="btn danger" matTooltip="Delete user"
                      [disabled]="isSelf(u)"
                      (click)="remove(u)">
                <mat-icon>delete</mat-icon>
              </button>
            </div>
          </div>
        } @empty {
          <p class="muted" style="padding:32px; text-align:center">No users match your filters.</p>
        }
      </div>
    }
  </div>
  `,
  styles: [`
    .wrap { max-width: 1200px; }
    .head { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
    .head h1 { font-size: 26px; font-weight: 900; margin: 0 0 4px; letter-spacing: -.4px; }
    .head p  { color: var(--lms-text-2); font-size: 13px; margin: 0; }
    .head-actions { display: flex; gap: 8px; }

    .search {
      display: flex; align-items: center; gap: 8px;
      background: var(--lms-surface); border: 1px solid var(--lms-border);
      border-radius: var(--lms-radius-sm); padding: 8px 14px;
      transition: border-color .15s;
      &:focus-within { border-color: var(--lms-purple); }
      mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--lms-text-2); }
      input { background: transparent; border: none; outline: none; color: var(--lms-text); font-size: 13px; min-width: 240px;
        &::placeholder { color: var(--lms-text-muted); }
      }
    }
    .filter {
      background: var(--lms-surface); border: 1px solid var(--lms-border);
      border-radius: var(--lms-radius-sm); padding: 9px 14px;
      color: var(--lms-text); font-size: 13px; cursor: pointer;
      &:focus { outline: none; border-color: var(--lms-purple); }
    }

    .muted { color: var(--lms-text-2); }

    .table { background: var(--lms-surface); border: 1px solid var(--lms-border); border-radius: var(--lms-radius); overflow: hidden; }
    .thead, .trow { display: flex; align-items: center; gap: 14px; padding: 14px 20px; }
    .thead { background: var(--lms-surface-2); font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .8px; color: var(--lms-text-muted); border-bottom: 1px solid var(--lms-border); }
    .trow { border-bottom: 1px solid var(--lms-border); font-size: 13.5px;
            animation: fadeIn .4s ease both;
            transition: background .15s;
            &:hover { background: var(--lms-surface-2); }
            &:last-child { border: none; }
    }
    .t-user { display: flex; align-items: center; gap: 12px; }
    .av {
      width: 38px; height: 38px; border-radius: 99px;
      background: linear-gradient(135deg, #7C3AED, #3B82F6);
      color: #fff; font-size: 12px; font-weight: 800;
      display: flex; align-items: center; justify-content: center;
    }
    .name { font-size: 13.5px; font-weight: 700; margin: 0; color: var(--lms-text); }
    .id   { font-size: 11px; color: var(--lms-text-muted); margin: 2px 0 0; font-family: 'Roboto Mono', monospace; }
    .t-cell { color: var(--lms-text-2); }

    .role-select {
      padding: 6px 10px; border-radius: 6px;
      background: var(--lms-surface-2); border: 1px solid var(--lms-border);
      color: var(--lms-text); font-size: 12px; font-weight: 600; cursor: pointer;
      &:focus { outline: none; border-color: var(--lms-purple); }
      &:disabled { opacity: .5; cursor: not-allowed; }
      &.r-admin { color: var(--lms-red); }
      &.r-instructor { color: var(--lms-amber); }
      &.r-student { color: var(--lms-blue); }
    }

    .status {
      display: inline-flex; align-items: center; gap: 6px;
      font-size: 12px; font-weight: 600;
      .dot { width: 7px; height: 7px; border-radius: 99px; background: currentColor; }
      &.active   { color: var(--lms-green); }
      &.inactive { color: var(--lms-text-muted); }
    }

    .create-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 9px 16px; border: none; border-radius: var(--lms-radius-sm);
      background: var(--lms-gradient); color: #fff;
      font-size: 13px; font-weight: 700; cursor: pointer;
      box-shadow: var(--lms-shadow-purple); white-space: nowrap;
      transition: opacity .15s, transform .15s;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
      &:hover { opacity: .9; transform: translateY(-1px); }
      &:disabled { opacity: .5; cursor: not-allowed; transform: none; }
    }

    .create-form {
      background: var(--lms-surface); border: 1px solid var(--lms-border);
      border-radius: var(--lms-radius); padding: 24px; margin-bottom: 24px;
    }
    .cf-title {
      display: flex; align-items: center; gap: 8px;
      font-size: 15px; font-weight: 800; margin: 0 0 20px;
      mat-icon { color: var(--lms-purple-2); font-size: 18px; width: 18px; height: 18px; }
    }
    .cf-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 14px;
    }
    .cf-field {
      display: flex; flex-direction: column; gap: 6px;
      label { font-size: 12px; font-weight: 700; color: var(--lms-text-2); text-transform: uppercase; letter-spacing: .4px; }
      .opt { font-weight: 400; text-transform: none; color: var(--lms-text-muted); }
      input, textarea, select {
        background: var(--lms-surface-2); border: 1px solid var(--lms-border);
        border-radius: var(--lms-radius-sm); padding: 9px 12px;
        color: var(--lms-text); font-size: 13px; outline: none;
        transition: border-color .15s;
        &:focus { border-color: var(--lms-purple); }
        &::placeholder { color: var(--lms-text-muted); }
      }
      textarea { resize: vertical; font-family: inherit; }
      select { cursor: pointer; }
    }
    .cf-span2 { grid-column: span 2; }
    .cf-foot { margin-top: 18px; display: flex; justify-content: flex-end; }

    .btn {
      width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--lms-border);
      background: var(--lms-surface-2); color: var(--lms-text-2);
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: all .15s;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
      &:hover:not(:disabled) { border-color: var(--lms-border-hover); color: var(--lms-text); }
      &:disabled { opacity: .3; cursor: not-allowed; }
      &.danger:hover:not(:disabled) { border-color: var(--lms-red); color: var(--lms-red); }
    }

    @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class AdminUsersComponent implements OnInit {
  private readonly api  = inject(AdminService);
  private readonly auth = inject(AuthService);
  private readonly snack = inject(MatSnackBar);

  users      = signal<AdminUser[]>([]);
  loading    = signal(true);
  search     = '';
  roleFilter = '';

  showForm = signal(false);
  creating = signal(false);
  form: CreateUserPayload = this.blankForm();

  private blankForm(): CreateUserPayload {
    return { firstName: '', lastName: '', email: '', password: '', role: 'Instructor', title: '', bio: '' };
  }

  submitCreate(): void {
    const { firstName, lastName, email, password } = this.form;
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
      this.snack.open('First name, last name, email and password are required.', 'OK', { duration: 3000, panelClass: 'snack-err' });
      return;
    }
    if (password.length < 8) {
      this.snack.open('Password must be at least 8 characters.', 'OK', { duration: 3000, panelClass: 'snack-err' });
      return;
    }
    this.creating.set(true);
    this.api.createUser(this.form).subscribe({
      next: user => {
        this.snack.open(`${user.firstName} ${user.lastName} created as ${user.role}`, 'OK', { duration: 3000, panelClass: 'snack-ok' });
        this.users.update(list => [user, ...list]);
        this.form = this.blankForm();
        this.showForm.set(false);
        this.creating.set(false);
      },
      error: (e: { error?: { message?: string }; status?: number }) => {
        const msg = e?.error?.message ?? (e?.status === 409 ? 'Email already in use.' : 'Failed to create user.');
        this.snack.open(msg, 'OK', { duration: 4000, panelClass: 'snack-err' });
        this.creating.set(false);
      },
    });
  }

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void { this.fetch(); }

  fetch(): void {
    this.loading.set(true);
    this.api.listUsers({ search: this.search || undefined, role: this.roleFilter || undefined })
      .subscribe({
        next: list => { this.users.set(list); this.loading.set(false); },
        error: () => { this.loading.set(false); this.snack.open('Could not load users', 'OK', { duration: 3000, panelClass: 'snack-err' }); },
      });
  }

  fetchDebounced(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.fetch(), 350);
  }

  isSelf(u: AdminUser): boolean { return this.auth.currentUser()?.id === u.id; }

  roleClass(role: string): string { return 'r-' + role.toLowerCase(); }

  onRoleChange(u: AdminUser, newRole: string): void {
    if (newRole === u.role) return;
    const prev = u.role;
    u.role = newRole as AdminUser['role'];
    this.api.updateUserRole(u.id, u.role).subscribe({
      next: () => this.snack.open(`Role updated to ${newRole}`, 'OK', { duration: 2200, panelClass: 'snack-ok' }),
      error: () => { u.role = prev; this.snack.open('Failed to update role', 'OK', { duration: 3000, panelClass: 'snack-err' }); },
    });
  }

  toggleStatus(u: AdminUser): void {
    const next = !u.isActive;
    this.api.updateUserStatus(u.id, next).subscribe({
      next: () => { u.isActive = next; this.snack.open(next ? 'User activated' : 'User suspended', 'OK', { duration: 2200, panelClass: 'snack-ok' }); },
      error: () => this.snack.open('Failed to update status', 'OK', { duration: 3000, panelClass: 'snack-err' }),
    });
  }

  remove(u: AdminUser): void {
    const extra = u.role === 'Instructor' || u.role === 'Admin'
      ? '\n\n⚠ All courses owned by this user (and their enrollments) will also be deleted.'
      : '';
    if (!confirm(`Permanently delete ${u.firstName} ${u.lastName}?${extra}\n\nThis cannot be undone.`)) return;
    this.api.deleteUser(u.id).subscribe({
      next: () => { this.users.update(list => list.filter(x => x.id !== u.id));
                    this.snack.open(`Deleted ${u.firstName} ${u.lastName}`, 'OK', { duration: 2500, panelClass: 'snack-ok' }); },
      error: (e: { error?: { message?: string }; status?: number }) => {
        const msg = e?.error?.message ?? (e?.status ? `Failed (HTTP ${e.status})` : 'Failed to delete');
        this.snack.open(msg, 'OK', { duration: 4000, panelClass: 'snack-err' });
      },
    });
  }
}
