import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'home' },

  // Auth (no shell)
  { path: 'login',    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent) },
  { path: 'register', loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent) },
  { path: 'oauth/callback', loadComponent: () => import('./features/auth/oauth-callback/oauth-callback.component').then(m => m.OAuthCallbackComponent) },

  // Main shell with nested routes
  {
    path: '',
    loadComponent: () => import('./shell/shell.component').then(m => m.ShellComponent),
    children: [
      { path: 'home',        loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent) },
      { path: 'journey',     loadComponent: () => import('./features/journey/journey.component').then(m => m.JourneyComponent) },
      { path: 'catalog',     loadComponent: () => import('./features/catalog/catalog.component').then(m => m.CatalogComponent) },
      { path: 'course/:id',  loadComponent: () => import('./features/course-detail/course-detail.component').then(m => m.CourseDetailComponent) },

      // Protected routes (require login)
      { path: 'learn/:id',   canActivate: [authGuard], loadComponent: () => import('./features/learn/learn.component').then(m => m.LearnComponent) },
      { path: 'my-courses',  canActivate: [authGuard], loadComponent: () => import('./features/my-courses/my-courses.component').then(m => m.MyCoursesComponent) },

      // Role-protected
      { path: 'instructor',  canActivate: [roleGuard('Instructor','Admin')], loadComponent: () => import('./features/instructor/instructor.component').then(m => m.InstructorComponent) },
      { path: 'instructor/course/:id/curriculum', canActivate: [roleGuard('Instructor','Admin')], loadComponent: () => import('./features/curriculum/curriculum.component').then(m => m.CurriculumComponent) },
    ],
  },

  // ── Admin Platform — its own layout, role-guarded ──
  {
    path: 'admin',
    canActivate: [roleGuard('Admin')],
    loadComponent: () => import('./features/admin/layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    children: [
      { path: '',         loadComponent: () => import('./features/admin/dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent) },
      { path: 'users',    loadComponent: () => import('./features/admin/users/admin-users.component').then(m => m.AdminUsersComponent) },
      { path: 'courses',  loadComponent: () => import('./features/admin/courses/admin-courses.component').then(m => m.AdminCoursesComponent) },
      { path: 'audit',    loadComponent: () => import('./features/admin/audit/admin-audit.component').then(m => m.AdminAuditComponent) },
      { path: 'settings', loadComponent: () => import('./features/admin/settings/admin-settings.component').then(m => m.AdminSettingsComponent) },
    ],
  },

  { path: '**', redirectTo: 'home' },
];
