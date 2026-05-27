import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../../core/services/auth.service';

/**
 * Admin-only platform shell. Sidebar navigation + top header.
 * Mounted under /admin/* — every child route inherits this layout.
 */
@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, MatIconModule, MatMenuModule, MatTooltipModule],
  template: `
  <div class="admin-shell">
    <!-- ── Sidebar ── -->
    <aside class="adm-sidebar">
      <a class="adm-brand" routerLink="/admin">
        <div class="brand-icon"><mat-icon>shield_person</mat-icon></div>
        <div class="brand-text">
          <span class="brand-name">EduFlow</span>
          <span class="brand-tag">Admin</span>
        </div>
      </a>

      <nav class="adm-nav">
        <p class="nav-section">Overview</p>
        <a class="nav-link" routerLink="/admin" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
          <mat-icon>dashboard</mat-icon><span>Dashboard</span>
        </a>

        <p class="nav-section">Manage</p>
        <a class="nav-link" routerLink="/admin/users"    routerLinkActive="active">
          <mat-icon>group</mat-icon><span>Users</span>
        </a>
        <a class="nav-link" routerLink="/admin/courses"  routerLinkActive="active">
          <mat-icon>menu_book</mat-icon><span>Courses</span>
        </a>

        <p class="nav-section">Security</p>
        <a class="nav-link" routerLink="/admin/audit"    routerLinkActive="active">
          <mat-icon>manage_search</mat-icon><span>Audit Log</span>
        </a>
        <a class="nav-link" routerLink="/admin/settings" routerLinkActive="active">
          <mat-icon>tune</mat-icon><span>Settings</span>
        </a>
      </nav>

      <div class="adm-foot">
        <a routerLink="/home" class="back-public">
          <mat-icon>arrow_back</mat-icon> Back to site
        </a>
      </div>
    </aside>

    <!-- ── Main ── -->
    <div class="adm-main">
      <header class="adm-topbar">
        <div class="adm-crumbs">
          <span class="crumb-strong">Admin</span>
          <mat-icon class="crumb-arrow">chevron_right</mat-icon>
          <span class="crumb-current">{{ pageTitle() }}</span>
        </div>
        <div class="adm-right">
          <button class="adm-icon-btn" matTooltip="Notifications" [matMenuTriggerFor]="adminNotifs">
            <mat-icon>notifications</mat-icon>
            @if (unread() > 0) { <span class="adm-dot"></span> }
          </button>
          <mat-menu #adminNotifs="matMenu" xPosition="before">
            <div class="adm-notif-head" (click)="$event.stopPropagation()">
              <strong>Admin alerts</strong>
              <button class="mark-read" (click)="markRead()">Mark all read</button>
            </div>
            @for (n of notifs(); track n.id) {
              <button mat-menu-item (click)="onNotif(n)">
                <mat-icon [style.color]="n.color">{{ n.icon }}</mat-icon>
                <div style="display:flex; flex-direction:column; line-height:1.3;">
                  <span>{{ n.title }}</span>
                  <span style="font-size:11px;color:var(--lms-text-muted)">{{ n.time }}</span>
                </div>
              </button>
            }
          </mat-menu>

          <button class="adm-user" [matMenuTriggerFor]="adminUser">
            <div class="adm-av">{{ initial }}</div>
            <div class="adm-user-text">
              <p class="adm-name">{{ fullName }}</p>
              <p class="adm-role">{{ auth.currentUser()?.role }}</p>
            </div>
            <mat-icon style="font-size:16px;width:16px;height:16px;color:var(--lms-text-muted)">expand_more</mat-icon>
          </button>
          <mat-menu #adminUser="matMenu" xPosition="before">
            <div class="adm-umhead" (click)="$event.stopPropagation()">
              <strong>{{ fullName }}</strong>
              <p>{{ auth.currentUser()?.email }}</p>
            </div>
            <button mat-menu-item routerLink="/admin/settings"><mat-icon>tune</mat-icon> Account settings</button>
            <button mat-menu-item routerLink="/home"><mat-icon>open_in_new</mat-icon> Open public site</button>
            <button mat-menu-item (click)="auth.logout()" style="color:var(--lms-red)">
              <mat-icon style="color:var(--lms-red)">logout</mat-icon> Sign out
            </button>
          </mat-menu>

          <button class="adm-logout" (click)="auth.logout()" matTooltip="Sign out">
            <mat-icon>logout</mat-icon>
          </button>
        </div>
      </header>

      <main class="adm-content">
        <router-outlet />
      </main>
    </div>
  </div>
  `,
  styles: [`
    /* ═══════════════════════════════════════
       ADMIN PLATFORM SHELL
       ═══════════════════════════════════════ */
    .admin-shell {
      display: grid; grid-template-columns: 260px 1fr;
      height: 100vh; overflow: hidden;
      background: var(--lms-bg);
    }

    /* Sidebar */
    .adm-sidebar {
      display: flex; flex-direction: column;
      background: var(--lms-surface);
      border-right: 1px solid var(--lms-border);
      padding: 22px 18px;
    }
    .adm-brand {
      display: flex; align-items: center; gap: 12px;
      text-decoration: none; padding-bottom: 24px; margin-bottom: 4px;
      border-bottom: 1px solid var(--lms-border);
    }
    .brand-icon {
      width: 42px; height: 42px; border-radius: 12px;
      background: linear-gradient(135deg, #EC4899, #7C3AED);
      box-shadow: 0 8px 24px rgba(124,58,237,.45);
      display: flex; align-items: center; justify-content: center;
      mat-icon { color: #fff; font-size: 22px; width: 22px; height: 22px; }
    }
    .brand-text { display: flex; flex-direction: column; line-height: 1; }
    .brand-name { font-size: 17px; font-weight: 900; color: var(--lms-text); letter-spacing: -.3px; }
    .brand-tag {
      font-size: 10px; font-weight: 800; letter-spacing: 1.5px;
      color: var(--lms-purple-2); margin-top: 4px;
      text-transform: uppercase;
    }

    .adm-nav { flex: 1; margin-top: 22px; display: flex; flex-direction: column; gap: 3px; overflow-y: auto; }
    .nav-section {
      font-size: 10.5px; font-weight: 800; letter-spacing: 1.5px;
      text-transform: uppercase; color: var(--lms-text-muted);
      margin: 18px 14px 8px;
      &:first-child { margin-top: 0; }
    }
    .nav-link {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 14px; border-radius: var(--lms-radius-sm);
      font-size: 13.5px; font-weight: 600;
      color: var(--lms-text-2); text-decoration: none;
      transition: all .15s;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
      &:hover { color: var(--lms-text); background: var(--lms-surface-2); }
      &.active {
        color: var(--lms-text); background: var(--lms-purple-dim);
        font-weight: 700;
        mat-icon { color: var(--lms-purple-2); }
      }
    }

    .adm-foot { padding-top: 16px; border-top: 1px solid var(--lms-border); }
    .back-public {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 14px; border-radius: var(--lms-radius-sm);
      font-size: 12.5px; font-weight: 600; color: var(--lms-text-muted);
      text-decoration: none;
      transition: color .15s;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
      &:hover { color: var(--lms-purple-2); }
    }

    /* Main */
    .adm-main { display: flex; flex-direction: column; min-width: 0; overflow: hidden; }
    .adm-topbar {
      height: 60px; flex-shrink: 0;
      padding: 0 32px;
      display: flex; align-items: center; justify-content: space-between;
      background: var(--lms-surface);
      border-bottom: 1px solid var(--lms-border);
    }
    .adm-crumbs { display: flex; align-items: center; gap: 6px; font-size: 13px; }
    .crumb-strong { color: var(--lms-text-2); font-weight: 600; }
    .crumb-arrow  { font-size: 16px; width: 16px; height: 16px; color: var(--lms-text-muted); }
    .crumb-current { color: var(--lms-text); font-weight: 700; }

    .adm-right { display: flex; align-items: center; gap: 8px; }
    .adm-icon-btn {
      width: 36px; height: 36px; border-radius: var(--lms-radius-sm);
      border: 1px solid var(--lms-border); background: var(--lms-surface-2);
      color: var(--lms-text-2); cursor: pointer; position: relative;
      display: flex; align-items: center; justify-content: center;
      transition: all .15s;
      mat-icon { font-size: 17px; width: 17px; height: 17px; }
      &:hover { border-color: var(--lms-border-hover); color: var(--lms-text); }
    }
    .adm-dot {
      position: absolute; top: 8px; right: 8px;
      width: 6px; height: 6px; border-radius: 99px;
      background: var(--lms-red);
      border: 2px solid var(--lms-surface);
    }
    .adm-user {
      display: flex; align-items: center; gap: 10px;
      padding: 5px 14px 5px 5px; border-radius: 99px;
      background: var(--lms-surface-2); border: 1px solid var(--lms-border);
      cursor: pointer; transition: border-color .15s;
      &:hover { border-color: var(--lms-border-hover); }
    }
    .adm-notif-head, .adm-umhead {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 16px 10px; border-bottom: 1px solid var(--lms-border); min-width: 280px;
      strong { font-size: 13px; color: var(--lms-text); }
      p { margin: 4px 0 0; font-size: 12px; color: var(--lms-text-2); }
    }
    .mark-read {
      background: none; border: none; cursor: pointer;
      color: var(--lms-purple-2); font-size: 11.5px; font-weight: 600;
      &:hover { color: var(--lms-text); }
    }
    .adm-av {
      width: 28px; height: 28px; border-radius: 99px;
      background: linear-gradient(135deg, #EC4899, #7C3AED);
      color: #fff; font-size: 12px; font-weight: 800;
      display: flex; align-items: center; justify-content: center;
    }
    .adm-user-text { display: flex; flex-direction: column; line-height: 1.2; }
    .adm-name { font-size: 12.5px; font-weight: 700; color: var(--lms-text); margin: 0; }
    .adm-role { font-size: 10.5px; color: var(--lms-text-muted); margin: 2px 0 0; }
    .adm-logout {
      width: 36px; height: 36px; border-radius: var(--lms-radius-sm);
      border: 1px solid var(--lms-border); background: var(--lms-surface-2);
      color: var(--lms-text-2); cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: all .15s;
      mat-icon { font-size: 17px; width: 17px; height: 17px; }
      &:hover { border-color: var(--lms-red); color: var(--lms-red); }
    }

    .adm-content { flex: 1; overflow-y: auto; padding: 28px 32px 60px; }

    @media (max-width: 900px) {
      .admin-shell { grid-template-columns: 1fr; }
      .adm-sidebar { display: none; }
    }
  `]
})
export class AdminLayoutComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  notifs = signal([
    { id: 1, icon: 'warning',     color: '#F87171',  title: 'Failed login attempts ↑ (12 / hr)', time: '8m ago', read: false, route: '/admin/audit' },
    { id: 2, icon: 'person_add',  color: '#A78BFA',  title: '3 new instructors awaiting review', time: '1h ago', read: false, route: '/admin/users'  },
    { id: 3, icon: 'menu_book',   color: '#60A5FA',  title: 'Course published: Next.js 15',      time: '3h ago', read: true,  route: '/admin/courses' },
    { id: 4, icon: 'paid',        color: '#10B981',  title: 'Revenue milestone: $250k MTD',      time: '1d ago', read: true,  route: '/admin'         },
  ]);
  unread = signal(2);

  onNotif(n: { id: number; read: boolean; route: string }): void {
    if (!n.read) {
      n.read = true;
      this.unread.update(v => Math.max(0, v - 1));
    }
    this.router.navigateByUrl(n.route);
  }
  markRead(): void {
    this.notifs.update(list => list.map(n => ({ ...n, read: true })));
    this.unread.set(0);
  }

  get fullName(): string {
    const u = this.auth.currentUser();
    return u ? `${u.firstName} ${u.lastName}` : 'Admin';
  }
  get initial(): string {
    return this.auth.currentUser()?.firstName?.[0]?.toUpperCase() ?? 'A';
  }
  pageTitle(): string {
    const url = this.router.url;
    if (url.startsWith('/admin/users'))    return 'Users';
    if (url.startsWith('/admin/courses'))  return 'Courses';
    if (url.startsWith('/admin/audit'))    return 'Audit Log';
    if (url.startsWith('/admin/settings')) return 'Settings';
    return 'Dashboard';
  }
}
