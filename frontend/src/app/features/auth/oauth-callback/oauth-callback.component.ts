import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth.service';

/**
 * /oauth/callback — lands after the OAuth round-trip.
 *
 * The backend redirects here with either:
 *   ?token=<jwt>&exp=<iso>&uid=<guid>&email=&fn=&ln=&role=
 * on success, or
 *   ?error=<code>
 * on failure.
 */
@Component({
  selector: 'app-oauth-callback',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="oc-wrap">
      <div class="oc-card">
        @if (status() === 'loading') {
          <div class="spinner"></div>
          <h2>Signing you in…</h2>
          <p>Finishing the authentication round-trip.</p>
        } @else if (status() === 'error') {
          <mat-icon class="err">error_outline</mat-icon>
          <h2>Sign-in failed</h2>
          <p>{{ errorMsg() }}</p>
          <a routerLink="/login" class="btn">Back to login</a>
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display:block; }
    .oc-wrap { min-height: 100vh; display: grid; place-items: center;
      background: var(--lms-bg, #0A0A14); color: var(--lms-text, #fff); padding: 24px; }
    .oc-card { max-width: 420px; padding: 36px 32px; border-radius: 16px;
      background: var(--lms-surface, #1a1a2e); border: 1px solid var(--lms-border, rgba(255,255,255,0.08));
      text-align: center; box-shadow: 0 30px 80px rgba(0,0,0,.4); }
    .spinner {
      width: 40px; height: 40px; border-radius: 50%;
      border: 3px solid rgba(255,255,255,0.12);
      border-top-color: #A78BFA;
      margin: 0 auto 18px;
      animation: oc-spin 0.9s linear infinite;
    }
    @keyframes oc-spin { to { transform: rotate(360deg); } }
    h2 { margin: 0 0 6px; font-size: 18px; font-weight: 700; }
    p { margin: 0; opacity: 0.7; font-size: 13px; }
    .err { color: #EF4444; font-size: 48px; width:48px; height:48px; margin-bottom: 10px; }
    .btn { display:inline-block; margin-top: 20px; padding: 10px 22px; border-radius: 10px;
      background: linear-gradient(135deg, #7C3AED, #3B82F6); color: white; text-decoration:none;
      font-weight: 600; }
    .btn:hover { filter: brightness(1.1); }
  `],
})
export class OAuthCallbackComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);

  status = signal<'loading' | 'error'>('loading');
  errorMsg = signal<string>('');

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap;
    const error = qp.get('error');
    if (error) {
      this.status.set('error');
      this.errorMsg.set(this.humanError(error));
      return;
    }
    const token = qp.get('token');
    if (!token) {
      this.status.set('error');
      this.errorMsg.set('No token returned by the provider.');
      return;
    }
    const exp = qp.get('exp') ?? '';
    const uid = qp.get('uid') ?? '';
    const email = qp.get('email') ?? '';
    const fn = qp.get('fn') ?? '';
    const ln = qp.get('ln') ?? '';
    const role = (qp.get('role') ?? 'Student') as 'Student' | 'Instructor' | 'Admin';

    this.auth.persistFromOauth({
      accessToken: token,
      expiresAt: exp,
      user: { id: uid, firstName: fn, lastName: ln, email, role },
    });

    // Clean the URL and go home.
    this.router.navigate(['/home'], { replaceUrl: true });
  }

  private humanError(code: string): string {
    switch (code) {
      case 'not_configured':       return 'OAuth is not configured on the server. The admin must set the OAuth ClientId/ClientSecret in appsettings.json.';
      case 'token_exchange_failed': return 'The provider rejected our token request. Check your ClientId/ClientSecret and the redirect URL.';
      case 'profile_failed':       return 'Could not fetch your profile from the provider.';
      case 'access_denied':        return 'You declined the sign-in request.';
      case 'missing_code':         return 'The provider did not return an authorization code.';
      default:                     return `Sign-in failed: ${code}`;
    }
  }
}
