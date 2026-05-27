import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Allows navigation when the user is logged in; otherwise redirects to /login. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;
  router.navigate(['/login'], { queryParams: { redirect: state.url } });
  return false;
};

/** Restricts a route to specific roles. */
export const roleGuard = (...roles: Array<'Student' | 'Instructor' | 'Admin'>): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }
  if (!roles.length || roles.some(r => auth.hasRole(r))) return true;
  router.navigate(['/home']);
  return false;
};
