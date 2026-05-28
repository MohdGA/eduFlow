import { Component, inject, signal, HostListener } from '@angular/core';
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

          <!-- Desktop nav links -->
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

            <!-- Hamburger — mobile only -->
            <button class="hamburger" (click)="menuOpen.set(true)" aria-label="Open menu">
              <mat-icon>menu</mat-icon>
            </button>
          </div>

        </div>
      </nav>

      <!-- ── Mobile drawer overlay ── -->
      @if (menuOpen()) {
        <div class="drawer-overlay" (click)="menuOpen.set(false)"></div>
        <aside class="mobile-drawer">
          <div class="drawer-head">
            <div class="brand">
              <div class="brand-icon"><mat-icon>school</mat-icon></div>
              <span class="brand-name">EduFlow</span>
            </div>
            <button class="drawer-close" (click)="menuOpen.set(false)">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          @if (auth.isLoggedIn()) {
            <div class="drawer-user">
              <div class="user-avatar lg">{{ initial() }}</div>
              <div>
                <div class="drawer-name">{{ fullName() }}</div>
                <div class="drawer-email">{{ auth.currentUser()?.email }}</div>
              </div>
            </div>
          }

          <nav class="drawer-nav">
            @for (n of nav; track n.route) {
              <a class="drawer-link" [routerLink]="n.route" routerLinkActive="active"
                 (click)="menuOpen.set(false)">
                <mat-icon>{{ n.icon }}</mat-icon>
                {{ n.label }}
              </a>
            }
          </nav>

          <div class="drawer-footer">
            @if (auth.isLoggedIn()) {
              <button class="drawer-signout" (click)="auth.logout(); menuOpen.set(false)">
                <mat-icon>logout</mat-icon> Sign out
              </button>
            } @else {
              <a routerLink="/login" class="sign-in-btn" (click)="menuOpen.set(false)">Sign in</a>
            }
          </div>
        </aside>
      }

      <!-- ── Content ── -->
      <main class="page-content">
        <router-outlet />
      </main>

      <!-- ── Footer ── -->
      <footer class="site-footer">
        <div class="footer-inner">
          <div class="footer-brand">
            <div class="brand-icon"><mat-icon>school</mat-icon></div>
            <span class="brand-name">EduFlow</span>
          </div>
          <p class="footer-copy">© 2025 EduFlow. All rights reserved.</p>
          <div class="footer-links">
            <a href="https://linkedin.com/in/mohdga" target="_blank" rel="noopener" class="footer-link" matTooltip="LinkedIn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              LinkedIn
            </a>
            <a href="mailto:m2med2019@gmail.com" class="footer-link" matTooltip="Send email">
              <mat-icon>mail_outline</mat-icon>
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    .shell { display:flex; flex-direction:column; height:100vh; overflow:hidden; }

    /* ── Topnav ── */
    @keyframes navBorderFlow {
      0%   { background-position: 0% 50%; }
      50%  { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    .topnav {
      height: var(--lms-topnav-h);
      background: rgba(10,10,20,0.85);
      backdrop-filter: blur(20px);
      border-bottom: 1px solid var(--lms-border);
      position: sticky; top:0; z-index:100;
      flex-shrink: 0;
      overflow: visible;
      &::after {
        content: ''; position: absolute; bottom: -1px; left: 0; right: 0; height: 1px;
        background: linear-gradient(90deg, transparent, rgba(124,58,237,0.5), rgba(59,130,246,0.4), rgba(236,72,153,0.3), transparent);
        background-size: 200% 100%;
        animation: navBorderFlow 5s linear infinite;
        opacity: 0.7;
      }
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
      background-size: 200% 200%;
      display:flex; align-items:center; justify-content:center;
      box-shadow: var(--lms-shadow-purple);
      animation: navBorderFlow 4s ease infinite;
      transition: box-shadow .25s;
      mat-icon { color:#fff; font-size:20px; width:20px; height:20px; }
    }
    .brand:hover .brand-icon {
      box-shadow: 0 0 24px rgba(124,58,237,0.6), 0 0 48px rgba(59,130,246,0.2);
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
        box-shadow: 0 0 14px rgba(124,58,237,0.15), inset 0 0 0 1px rgba(124,58,237,0.2);
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

    /* ── Hamburger (hidden on desktop) ── */
    .hamburger {
      display: none;
      width: 38px; height: 38px; border-radius: var(--lms-radius-sm);
      border: 1px solid var(--lms-border);
      background: var(--lms-surface); color: var(--lms-text-2);
      align-items: center; justify-content: center;
      cursor: pointer; transition: all .15s; flex-shrink: 0;
      mat-icon { font-size: 20px; width: 20px; height: 20px; }
      &:hover { border-color: var(--lms-border-hover); color: var(--lms-text); background: var(--lms-surface-2); }
    }

    /* ── Mobile drawer ── */
    .drawer-overlay {
      position: fixed; inset: 0; z-index: 200;
      background: rgba(0,0,0,0.55); backdrop-filter: blur(4px);
      animation: fadeIn .2s ease;
    }
    .mobile-drawer {
      position: fixed; top: 0; right: 0; bottom: 0; z-index: 201;
      width: 280px;
      background: var(--lms-surface);
      border-left: 1px solid var(--lms-border);
      display: flex; flex-direction: column;
      animation: slideFromRight .25s cubic-bezier(.16,1,.3,1);
      overflow-y: auto;
    }
    @keyframes slideFromRight {
      from { transform: translateX(100%); }
      to   { transform: translateX(0); }
    }

    .drawer-head {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 18px; border-bottom: 1px solid var(--lms-border); flex-shrink: 0;
      .brand { display: flex; align-items: center; gap: 10px; text-decoration: none; }
    }
    .drawer-close {
      width: 34px; height: 34px; border-radius: var(--lms-radius-sm);
      border: 1px solid var(--lms-border); background: transparent;
      color: var(--lms-text-2); cursor: pointer; display: flex; align-items: center; justify-content: center;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
      &:hover { background: var(--lms-surface-2); color: var(--lms-text); }
    }

    .drawer-user {
      display: flex; align-items: center; gap: 12px;
      padding: 16px 18px; border-bottom: 1px solid var(--lms-border);
      .user-avatar.lg { width: 40px; height: 40px; font-size: 16px; flex-shrink: 0; }
    }
    .drawer-name  { font-size: 14px; font-weight: 700; color: var(--lms-text); }
    .drawer-email { font-size: 12px; color: var(--lms-text-2); margin-top: 2px; }

    .drawer-nav {
      display: flex; flex-direction: column; padding: 10px 10px; flex: 1;
    }
    .drawer-link {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 14px; border-radius: var(--lms-radius-sm);
      font-size: 14px; font-weight: 500; color: var(--lms-text-2);
      text-decoration: none; transition: all .15s;
      mat-icon { font-size: 20px; width: 20px; height: 20px; }
      &:hover { color: var(--lms-text); background: var(--lms-surface-2); }
      &.active {
        color: var(--lms-text); background: var(--lms-purple-dim); font-weight: 700;
        mat-icon { color: var(--lms-purple-2); }
      }
    }

    .drawer-footer {
      padding: 14px 18px; border-top: 1px solid var(--lms-border); flex-shrink: 0;
      .sign-in-btn { display: block; text-align: center; }
    }
    .drawer-signout {
      display: flex; align-items: center; gap: 8px;
      width: 100%; padding: 11px 14px; border-radius: var(--lms-radius-sm);
      border: 1px solid var(--lms-border); background: transparent;
      color: var(--lms-red); font-size: 14px; font-weight: 600; cursor: pointer;
      transition: background .15s;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
      &:hover { background: var(--lms-red-dim); }
    }

    /* ── Footer ── */
    .site-footer {
      flex-shrink: 0;
      border-top: 1px solid var(--lms-border);
      background: rgba(10,10,20,0.85);
      backdrop-filter: blur(20px);
    }
    .footer-inner {
      max-width: 1300px; margin: 0 auto;
      padding: 16px 40px;
      display: flex; align-items: center; gap: 20px; flex-wrap: wrap;
    }
    .footer-brand {
      display: flex; align-items: center; gap: 8px;
      .brand-icon {
        width: 26px; height: 26px; border-radius: 7px;
        background: var(--lms-gradient);
        display: flex; align-items: center; justify-content: center;
        mat-icon { color: #fff; font-size: 15px; width: 15px; height: 15px; }
      }
      .brand-name { font-size: 14px; font-weight: 800; color: var(--lms-text); letter-spacing: -.3px; }
    }
    .footer-copy { font-size: 12px; color: var(--lms-text-muted); margin: 0; flex: 1; }
    .footer-links { display: flex; align-items: center; gap: 6px; }
    .footer-link {
      display: flex; align-items: center; gap: 6px;
      padding: 7px 14px; border-radius: var(--lms-radius-sm);
      border: 1px solid var(--lms-border);
      background: var(--lms-surface-2);
      color: var(--lms-text-2); font-size: 13px; font-weight: 600;
      text-decoration: none; transition: all .15s;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
      svg { flex-shrink: 0; }
      &:hover { border-color: var(--lms-border-hover); color: var(--lms-text); background: var(--lms-surface-3); }
    }

    /* ── Responsive ── */
    @media (max-width: 1023px) {
      .nav-links { display: none; }
      .hamburger { display: flex; }
      .nav-inner { padding: 0 20px; }
      .search-box { width: 180px; &:focus-within { width: 220px; } }
    }
    @media (max-width: 640px) {
      .nav-inner { padding: 0 12px; gap: 6px; }
      .brand-name { display: none; }
      .search-box { width: 120px; &:focus-within { width: 160px; } }
      .user-name, .user-chevron { display: none; }
      .user-pill { padding: 4px 6px; }
      .footer-inner { padding: 14px 16px; gap: 10px; }
      .footer-copy { width: 100%; flex: none; }
    }
  `]
})
export class ShellComponent {
  readonly theme = inject(ThemeService);
  readonly auth  = inject(AuthService);
  private readonly router = inject(Router);

  searchTerm = '';
  menuOpen   = signal(false);

  @HostListener('document:keydown.escape')
  closeMenu() { this.menuOpen.set(false); }

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

  get nav() {
    const isInstructor = this.auth.hasRole('Instructor');
    const isAdmin      = this.auth.hasRole('Admin');
    return [
      { label:'Home',       icon:'home',               route:'/home' },
      { label:'Journey',    icon:'auto_awesome',        route:'/journey' },
      { label:'Catalog',    icon:'menu_book',           route:'/catalog' },
      { label:'My Courses', icon:'play_lesson',         route:'/my-courses' },
      ...(isInstructor || isAdmin
        ? [{ label:'Instructor', icon:'co_present',          route:'/instructor' }] : []),
      ...(isAdmin
        ? [{ label:'Admin',      icon:'admin_panel_settings', route:'/admin' }] : []),
    ];
  }
}
