import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { API_BASE_URL } from '../config/api.config';

/**
 * Functional HTTP interceptor:
 *   - Attaches `Authorization: Bearer <jwt>` to same-origin API calls when a token exists.
 *   - On 401 from the API, clears auth state and redirects to /login.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const isOurApi = req.url.startsWith(API_BASE_URL);
  const token = auth.token();

  const authed = isOurApi && token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authed).pipe(
    catchError((err: HttpErrorResponse) => {
      if (isOurApi && err.status === 401) auth.handleUnauthorized();
      return throwError(() => err);
    }),
  );
};
