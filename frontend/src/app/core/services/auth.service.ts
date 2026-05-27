import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { AuthResponse, ApiError, LoginRequest, RegisterRequest, UserDto } from '../models/auth.models';

const TOKEN_KEY   = 'eduflow.token';
const EXPIRES_KEY = 'eduflow.expires';
const USER_KEY    = 'eduflow.user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http   = inject(HttpClient);
  private readonly router = inject(Router);

  // Reactive signals
  readonly currentUser = signal<UserDto | null>(this.readUser());
  readonly token       = signal<string | null>(this.readToken());
  readonly isLoggedIn  = computed(() => !!this.token() && !this.isExpired());

  login(req: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API_BASE_URL}/Auth/login`, req).pipe(
      tap(res => this.persist(res)),
      catchError(this.mapError),
    );
  }

  register(req: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API_BASE_URL}/Auth/register`, req).pipe(
      tap(res => this.persist(res)),
      catchError(this.mapError),
    );
  }

  logout(): void {
    this.clear();
    this.router.navigate(['/login']);
  }

  forgotPassword(email: string): Observable<{ message: string; resetToken: string | null }> {
    return this.http.post<{ message: string; resetToken: string | null }>(
      `${API_BASE_URL}/Auth/forgot`, { email }).pipe(catchError(this.mapError));
  }

  resetPassword(token: string, newPassword: string): Observable<void> {
    return this.http.post<void>(
      `${API_BASE_URL}/Auth/reset`, { token, newPassword }).pipe(catchError(this.mapError));
  }

  oauthDemo(provider: 'Google' | 'GitHub'): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API_BASE_URL}/Auth/oauth/demo`, { provider }).pipe(
      tap(res => this.persist(res)),
      catchError(this.mapError),
    );
  }

  /**
   * Persist a JWT received from the OAuth callback redirect (query string).
   * Used by /oauth/callback page after Google/GitHub round-trip.
   */
  persistFromOauth(res: AuthResponse): void {
    this.persist(res);
  }

  /** Kick off a real OAuth redirect to the backend's start endpoint. */
  startOAuthRedirect(provider: 'google' | 'github'): void {
    const base = API_BASE_URL.replace(/\/api\/?$/, '');
    window.location.href = `${base}/api/oauth/${provider}/start`;
  }

  /** Called by the HTTP interceptor on a 401 response.
   *  Always clears state — even if our in-memory token is missing — because
   *  there may still be a stale value in localStorage from a previous run. */
  handleUnauthorized(): void {
    // Detect any token (in-memory OR in storage) so a stale browser session
    // after a DB reseed gets cleaned out cleanly without manual intervention.
    const stored = (() => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } })();
    if (this.token() || stored) {
      this.clear();
      this.router.navigate(['/login'], { queryParams: { reason: 'expired' } });
    }
  }

  hasRole(role: UserDto['role']): boolean { return this.currentUser()?.role === role; }

  private persist(res: AuthResponse): void {
    try {
      localStorage.setItem(TOKEN_KEY,   res.accessToken);
      localStorage.setItem(EXPIRES_KEY, res.expiresAt);
      localStorage.setItem(USER_KEY,    JSON.stringify(res.user));
    } catch { /* private mode */ }
    this.token.set(res.accessToken);
    this.currentUser.set(res.user);
  }

  private clear(): void {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(EXPIRES_KEY);
      localStorage.removeItem(USER_KEY);
    } catch { /* ignore */ }
    this.token.set(null);
    this.currentUser.set(null);
  }

  private readToken(): string | null {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  }
  private readUser(): UserDto | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) as UserDto : null;
    } catch { return null; }
  }
  private isExpired(): boolean {
    try {
      const exp = localStorage.getItem(EXPIRES_KEY);
      return !exp || new Date(exp).getTime() <= Date.now();
    } catch { return true; }
  }

  private mapError = (err: HttpErrorResponse) => {
    const body = err.error as ApiError | undefined;
    const msg = body?.message ?? (err.status === 0 ? 'Cannot reach the server.' : 'Something went wrong.');
    return throwError(() => new Error(msg));
  };
}
