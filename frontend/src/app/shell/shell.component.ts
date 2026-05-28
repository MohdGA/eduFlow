import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ThemeService } from '../core/services/theme.service';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, RouterOutlet,
            MatIconModule, MatButtonModule, MatMenuModule, MatTooltipModule],
  template: `
    <div class="shell">
      <!-- ── Top Nav ── -->
      <nav class="topnav">
        <div class="nav-inner">

          <!-- Brand -->
          <a class="brand" routerLink="/home">
            <div class="brand-icon">
              <mat-icon>school</mat-icon>
            </div>
            <span class="brand-name">EduFlow</span>
          </a>

          <!-- Nav links -->
          <div class="nav-links">
            @for (n of nav; track n.route) {
              <a class="nav-link" [routerLink]="n.route" routerLinkActive="active">
                <mat-icon>{{ n.icon }}</mat-icon>
                {{ n.label }}
              </a>
            }
          </div>

          <!-- Right side -->
          <div class="nav-right">
            <!-- Search box -->
            <form class="search-box" (submit)="$event.preventDefault(); runSearch()">
              <mat-icon class="search-icon">search</mat-icon>
              <input
                type="text"
                placeholder="Search courses…"
                [(ngModel)]="searchTerm"
                name="search"
                (keyup.enter)="runSearch()"
                maxlength="80"
                autocomplete="off"
              />
              @if (searchTerm) {
                <button type="button" class="search-clear" (click)="searchTerm = ''" matTooltip="Clear">
                  <mat-icon>close</mat-icon>
                </button>
              }
            </form>

            <button class="theme-btn"
                    [matTooltip]="theme.mode() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
                    (click)="theme.toggle()">
              <mat-icon class="theme-icon">
                {{ theme.mode() === 'dark' ? 'light_mode' : 'dark_mode' }}
              </mat-icon>
            </button>

            <!-- Notifications menu -->
            <button class="notif-btn" matTooltip="Notifications" [matMenuTriggerFor]="notifMenu">
              <mat-icon>notifications</mat-icon>
              @if (unreadNotifs() > 0) { <span class="notif-dot"></span> }
            </button>
            <mat-menu #notifMenu="matMenu" xPosition="before" class="notif-menu-panel">
              <div class="notif-head" (click)="$event.stopPropagation()">
                <strong>Notifications</strong>
                <button class="mark-read" (click)="markAllRead()">Mark all read</button>
              </div>
              @for (n of notifications(); track n.id) {
                <div class="notif-item" [class.unread]="!n.read" (click)="openNotif(n)">
                  <mat-icon class="ni-icon" [class]="n.color">{{ n.icon }}</mat-icon>
                  <div class="ni-body">
                    <p class="ni-title">{{ n.title }}</p>
                    <p class="ni-sub">{{ n.body }} · {{ n.time }}</p>
                  </div>
                </div>
              }
              <div class="notif-foot">View all</div>
            </mat-menu>

            <!-- User menu -->
            @if (auth.isLoggedIn()) {
              <button class="user-pill" [matMenuTriggerFor]="userMenu">
                <div class="user-avatar">{{ initial() }}</div>
                <span class="user-name">{{ firstName() }}</span>
                <mat-icon class="user-chevron">expand_more</mat-icon>
              </button>
              <mat-menu #userMenu="matMenu" xPosition="before">
                <div class="user-mhead" (click)="$event.stopPropagation()">
                  <strong>{{ fullName() }}</strong>
                  <p>{{ auth.currentUser()?.email }}</p>
                  <span class="lms-badge purple" style="margin-top:6px">{{ auth.currentUser()?.role }}</span>
                </div>
                <button mat-menu-item routerLink="/my-courses"><mat-icon>play_lesson</mat-icon> My Courses</button>
                @if (auth.hasRole('Instructor') || auth.hasRole('Admin')) {
                  <button mat-menu-item routerLink="/instructor"><mat-icon>co_present</mat-icon> Instructor Studio</button>
                }
                @if (auth.hasRole('Admin')) {
                  <button mat-menu-item routerLink="/admin"><mat-icon>admin_panel_settings</mat-icon> Admin Platform</button>
                }
                <button mat-menu-item (click)="auth.logout()" style="color: var(--lms-red)">
                  <mat-icon style="color: var(--lms-red)">logout</mat-icon> Sign out
                </button>
              </mat-menu>
            } @else {
              <a routerLink="/login" class="sign-in-btn">Sign in</a>
            }
          </div>

        </div>
      </nav>

      <!-- ── Content ── -->
      <main class="page-content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    .shell { display:flex; flex-direction:column; height:100vh; overflow:hidden; }

    /* ── Topnav ── */
    .topnav {
      height: var(--lms-topnav-h);
      background: rgba(10,10,20,0.85);
      backdrop-filter: blur(20px);
      border-bottom: 1px solid var(--lms-border);
      position: sticky; top:0; z-index:100;
      flex-shrink: 0;
    }
    .nav-inner {
      max-width: 1300px; margin:0 auto;
      padding: 0 40px;
      height: 100%;
      display: flex; align-items: center; gap: 12px;
    }

    /* Brand */
    .brand {
      display:flex; align-items:center; gap:10px;
      text-decoration:none; flex-shrink:0; margin-right:8px;
    }
    .brand-icon {
      width:36px; height:36px; border-radius:10px;
      background: var(--lms-gradient);
      display:flex; align-items:center; justify-content:center;
      box-shadow: var(--lms-shadow-purple);
      mat-icon { color:#fff; font-size:20px; width:20px; height:20px; }
    }
    .brand-name { font-size:18px; font-weight:800; color:var(--lms-text); letter-spacing:-.4px; }

    /* Nav links */
    .nav-links { display:flex; align-items:center; gap:2px; flex:1; }
    .nav-link {
      display:flex; align-items:center; gap:6px;
      padding:8px 14px; border-radius:var(--lms-radius-sm);
      font-size:13.5px; font-weight:500; color:var(--lms-text-2);
      text-decoration:none;
      transition: color .15s, background .15s;
      mat-icon { font-size:17px; width:17px; height:17px; }
      &:hover { color:var(--lms-text); background:var(--lms-surface-2); }
      &.active {
        color:var(--lms-text);
        background: var(--lms-purple-dim);
        font-weight:700;
        mat-icon { color:var(--lms-purple-2); }
      }
    }

    /* Right side */
    .nav-right { display:flex; align-items:center; gap:6px; margin-left:auto; flex-shrink:0; }
    .notif-btn, .theme-btn {
      width:38px; height:38px; border-radius:var(--lms-radius-sm);
      border:1px solid var(--lms-border);
      background:var(--lms-surface); color:var(--lms-text-2);
      display:flex; align-items:center; justify-content:center;
      cursor:pointer; transition:all .15s; position:relative;
      mat-icon { font-size:18px; width:18px; height:18px; }
      &:hover { border-color:var(--lms-border-hover); color:var(--lms-text); background:var(--lms-surface-2); }
    }

    /* Inline search box in topnav */
    .search-box {
      display:flex; align-items:center; gap:6px;
      padding: 4px 10px 4px 12px;
      border-radius: 99px;
      background: var(--lms-surface-2); border: 1px solid var(--lms-border);
      width: 240px;
      transition: all .2s;
      &:focus-within { width: 280px; border-color: var(--lms-purple); box-shadow: 0 0 0 3px rgba(124,58,237,.15); }
    }
    .search-icon { font-size:17px; width:17px; height:17px; color: var(--lms-text-2); flex-shrink: 0; }
    .search-box input {
      flex:1; background: transparent; border: none; outline: none;
      color: var(--lms-text); font-size: 13px; padding: 6px 0; min-width: 0;
      &::placeholder { color: var(--lms-text-muted); }
    }
    .search-clear {
      width: 22px; height: 22px; border-radius: 99px; border: none; cursor: pointer;
      background: transparent; color: var(--lms-text-muted);
      display: flex; align-items: center; justify-content: center;
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
      &:hover { color: var(--lms-text); }
    }

    /* Sign in button */
    .sign-in-btn {
      padding: 8px 18px; border-radius: var(--lms-radius-sm);
      background: var(--lms-gradient); color: #fff;
      font-size: 13px; font-weight: 700; text-decoration: none;
      box-shadow: var(--lms-shadow-purple);
      transition: opacity .15s, transform .15s;
      &:hover { opacity: .9; transform: translateY(-1px); }
    }

    /* Notifications menu */
    ::ng-deep .notif-menu-panel.mat-mdc-menu-panel { min-width: 320px !important; max-width: 360px !important; }
    .notif-head {
      display: flex; justify-content: space-between; align-items: center;
      padding: 14px 16px 10px; border-bottom: 1px solid var(--lms-border);
      strong { font-size: 13px; color: var(--lms-text); }
    }
    .mark-read {
      background: none; border: none; cursor: pointer;
      color: var(--lms-purple-2); font-size: 11.5px; font-weight: 600;
      &:hover { color: var(--lms-text); }
    }
    .notif-item {
      display: flex; gap: 10px; padding: 12px 16px;
      border-bottom: 1px solid var(--lms-border); cursor: pointer;
      transition: background .15s;
      &:hover { background: var(--lms-surface-3); }
      &:last-of-type { border-bottom: none; }
      &.unread { background: var(--lms-purple-dim);
        &::before { content: ''; position: absolute; left: 6px; width: 3px; height: 28px; background: var(--lms-purple); border-radius: 99px; }
      }
    }
    .ni-icon {
      width: 32px; height: 32px; padding: 7px; border-radius: 8px; flex-shrink: 0;
      font-size: 18px;
      &.purple { background: var(--lms-purple-dim); color: var(--lms-purple-2); }
      &.green  { background: var(--lms-green-dim);  color: var(--lms-green); }
      &.amber  { background: var(--lms-amber-dim);  color: var(--lms-amber); }
      &.blue   { background: var(--lms-blue-dim);   color: var(--lms-blue); }
    }
    .ni-body { flex: 1; min-width: 0; }
    .ni-title { font-size: 13px; font-weight: 600; margin: 0; color: var(--lms-text); }
    .ni-sub   { font-size: 11.5px; margin: 2px 0 0; color: var(--lms-text-muted); }
    .notif-foot {
      padding: 12px 16px; text-align: center;
      color: var(--lms-purple-2); font-size: 12.5px; font-weight: 700; cursor: pointer;
      &:hover { background: var(--lms-surface-3); }
    }

    /* User menu head */
    .user-mhead {
      padding: 14px 16px; border-bottom: 1px solid var(--lms-border);
      strong { display: block; font-size: 14px; color: var(--lms-text); }
      p { margin: 2px 0 0; font-size: 12px; color: var(--lms-text-2); }
    }

    .user-pill {
      border: 1px solid var(--lms-border); cursor: pointer;
    }
    .theme-btn {
      overflow:hidden;
      &:hover { color: var(--lms-amber); border-color: var(--lms-amber); box-shadow: 0 0 14px rgba(245,158,11,.25); }
      .theme-icon {
        animation: themeSpin .4s cubic-bezier(.16,1,.3,1);
      }
    }
    @keyframes themeSpin {
      from { transform: rotate(-90deg) scale(.5); opacity:0; }
      to   { transform: rotate(0)      scale(1);  opacity:1; }
    }
    .notif-dot {
      position:absolute; top:8px; right:8px;
      width:7px; height:7px; border-radius:99px;
      background:var(--lms-purple); border:2px solid var(--lms-bg);
    }
    .user-pill {
      display:flex; align-items:center; gap:8px;
      padding:6px 12px 6px 6px; border-radius:99px;
      background:var(--lms-surface-2); border:1px solid var(--lms-border);
      cursor:pointer; transition:border-color .15s;
      &:hover { border-color:var(--lms-border-hover); }
    }
    .user-avatar {
      width:28px; height:28px; border-radius:99px;
      background:var(--lms-gradient); color:#fff;
      font-size:12px; font-weight:700;
      display:flex; align-items:center; justify-content:center;
    }
    .user-name   { font-size:13px; font-weight:600; color:var(--lms-text); }
    .user-chevron { font-size:16px; width:16px; height:16px; color:var(--lms-text-2); }

    /* Content */
    .page-content { flex:1; overflow-y:auto; }

    /* ── Responsive ── */
    @media (max-width: 1023px) {
      .nav-links { display: none !important; }
      .nav-inner { padding: 0 20px; }
      .search-box { width: 180px; &:focus-within { width: 220px; } }
    }
    @media (max-width: 640px) {
      .nav-inner { padding: 0 12px; gap: 6px; }
      .brand-name { display: none; }
      .search-box { width: 130px; &:focus-within { width: 170px; } }
      .user-name, .user-chevron { display: none; }
      .user-pill { padding: 4px 6px; }
    }
  `]
})
export class ShellComponent {
  readonly theme = inject(ThemeService);
  readonly auth  = inject(AuthService);
  private readonly router = inject(Router);

  searchTerm = '';

  notifications = signal([
    { id: 1, icon: 'school',  color: 'purple', title: 'New course recommended',  body: 'Next.js 15 — Production Patterns', time: '5m ago', read: false },
    { id: 2, icon: 'workspace_premium', color: 'amber', title: 'Certificate ready', body: 'Python for Data Science', time: '2h ago', read: false },
    { id: 3, icon: 'event',   color: 'blue', title: 'Live Q&A tomorrow', body: 'Web Dev Bootcamp', time: '1d ago', read: true },
    { id: 4, icon: 'local_fire_department', color: 'green', title: '7-day streak!', body: 'Keep it going', time: '2d ago', read: true },
  ]);
  unreadNotifs = signal(2);

  firstName(): string { return this.auth.currentUser()?.firstName ?? 'You'; }
  fullName():  string {
    const u = this.auth.currentUser();
    return u ? `${u.firstName} ${u.lastName}` : '';
  }
  initial():   string { return this.firstName().charAt(0).toUpperCase(); }

  runSearch(): void {
    const q = this.searchTerm.trim();
    this.router.navigate(['/catalog'], q ? { queryParams: { q } } : undefined);
  }

  markAllRead(): void {
    this.notifications.update(list => list.map(n => ({ ...n, read: true })));
    this.unreadNotifs.set(0);
  }

  openNotif(n: { id: number; read: boolean }): void {
    if (!n.read) {
      n.read = true;
      this.unreadNotifs.update(v => Math.max(0, v - 1));
    }
    this.router.navigate(['/my-courses']);
  }

  nav = [
    { label:'Home',       icon:'home',          route:'/home' },
    { label:'Journey',    icon:'auto_awesome',   route:'/journey' },
    { label:'Catalog',    icon:'menu_book',      route:'/catalog' },
    { label:'My Courses', icon:'play_lesson',    route:'/my-courses' },
    { label:'Instructor', icon:'co_present',     route:'/instructor' },
    { label:'Admin',      icon:'admin_panel_settings', route:'/admin' },
  ];
}
