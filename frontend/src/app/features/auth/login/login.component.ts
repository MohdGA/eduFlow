import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/services/auth.service';
import { ResetPasswordDialogComponent } from '../reset-password-dialog.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, MatIconModule, MatButtonModule],
  template: `
  <div class="auth-page">
    <!-- ── Floating 3D blobs ── -->
    <div class="blob b1"></div>
    <div class="blob b2"></div>
    <div class="blob b3"></div>

    <!-- ── Auth card ── -->
    <div class="auth-grid">

      <div class="auth-left">
        <a routerLink="/home" class="brand-link">
          <div class="brand-icon"><mat-icon>school</mat-icon></div>
          <span class="brand-name">EduFlow</span>
        </a>

        <h1 class="auth-title">Welcome back</h1>
        <p class="auth-sub">Sign in to continue your learning journey.</p>

        <form [formGroup]="form" (ngSubmit)="submit()" class="auth-form" autocomplete="on">
          <label class="field-label">Email</label>
          <div class="field" [class.invalid]="ctrlInvalid('email')">
            <mat-icon>mail_outline</mat-icon>
            <input
              type="email"
              formControlName="email"
              placeholder="you@example.com"
              autocomplete="email"
              maxlength="120"
              required
            >
          </div>
          @if (ctrlInvalid('email')) { <p class="err-msg">Please enter a valid email.</p> }

          <label class="field-label">Password</label>
          <div class="field" [class.invalid]="ctrlInvalid('password')">
            <mat-icon>lock_outline</mat-icon>
            <input
              [type]="showPassword() ? 'text' : 'password'"
              formControlName="password"
              placeholder="Your password"
              autocomplete="current-password"
              maxlength="100"
              minlength="8"
              required
            >
            <button type="button" class="pw-toggle" (click)="togglePw()" tabindex="-1">
              <mat-icon>{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
          </div>
          @if (ctrlInvalid('password')) { <p class="err-msg">Password must be at least 8 characters.</p> }

          <div class="form-row">
            <label class="remember"><input type="checkbox" formControlName="remember"> Remember me</label>
            <button type="button" class="forgot" (click)="onForgotPassword()">Forgot password?</button>
          </div>

          @if (errorMsg()) {
            <p class="err-msg" style="margin: 6px 0 0">{{ errorMsg() }}</p>
          }

          <button type="submit" class="submit-btn" [disabled]="form.invalid || loading()">
            @if (loading()) { <mat-icon class="spin">progress_activity</mat-icon> } @else { <mat-icon>login</mat-icon> }
            {{ loading() ? 'Signing in...' : 'Sign In' }}
          </button>

          <div class="divider"><span>or continue with</span></div>

          <div class="oauth-row">
            <button type="button" class="oauth-btn" (click)="onOAuth('Google')"><span class="g">G</span> Google</button>
            <button type="button" class="oauth-btn" (click)="onOAuth('GitHub')"><mat-icon>code</mat-icon> GitHub</button>
          </div>

          <p class="auth-foot">
            Don't have an account?
            <a routerLink="/register">Create one</a>
          </p>
        </form>
      </div>

      <!-- ── Right side: floating 3D illustration ── -->
      <div class="auth-right">
        <div class="stage-3d">
          <div class="card-float card-a">
            <mat-icon>play_circle</mat-icon>
            <div>
              <p class="cf-title">Continue Learning</p>
              <p class="cf-sub">Web Dev Bootcamp · 72%</p>
            </div>
          </div>
          <div class="card-float card-b">
            <mat-icon>workspace_premium</mat-icon>
            <div>
              <p class="cf-title">Certificate Earned</p>
              <p class="cf-sub">Python for Data Science</p>
            </div>
          </div>
          <div class="card-float card-c">
            <mat-icon>local_fire_department</mat-icon>
            <div>
              <p class="cf-title">7-Day Streak</p>
              <p class="cf-sub">Keep it going!</p>
            </div>
          </div>
          <div class="big-orb"></div>
        </div>
        <div class="right-text">
          <h2 class="rt-title">Learn anything,<br><span class="gradient-text">anywhere.</span></h2>
          <p class="rt-sub">Join 142k+ learners advancing their careers with expert-led courses.</p>
        </div>
      </div>

    </div>
  </div>
  `,
  styles: [`
    /* ── Page shell: fixed viewport, scrolls internally ── */
    :host { display: block; }
    .auth-page {
      min-height: 100vh;
      background: radial-gradient(circle at top right, #1A0E2E 0%, var(--lms-bg) 60%);
      display: flex; flex-direction: column; align-items: center;
      padding: 32px; box-sizing: border-box; overflow-x: hidden;
    }
    .blob {
      &.b1 { width:520px; height:520px; background:rgba(124,58,237,0.18); top:-150px; left:-100px; }
      &.b2 { width:400px; height:400px; background:rgba(59,130,246,0.16); bottom:-120px; right:-80px; animation-direction:reverse; }
      &.b3 { width:300px; height:300px; background:rgba(236,72,153,0.10); top:50%; left:40%; }
    }

    /* ── Card ── */
    .auth-grid {
      position: relative; z-index: 1;
      margin: auto 0;
      width: 100%; max-width: 1080px;
      display: grid; grid-template-columns: 1fr 1fr; gap: 40px;
      background: rgba(17,17,32,0.6); backdrop-filter: blur(20px);
      border: 1px solid var(--lms-border); border-radius: 24px; padding: 48px;
    }

    /* ── Left column ── */
    .auth-left { display: flex; flex-direction: column; min-width: 0; }
    .brand-link { display: flex; align-items: center; gap: 10px; text-decoration: none; margin-bottom: 28px; }
    .brand-icon {
      width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
      background: var(--lms-gradient); box-shadow: var(--lms-shadow-purple);
      display: flex; align-items: center; justify-content: center;
      mat-icon { color: #fff; font-size: 20px; width: 20px; height: 20px; }
    }
    .brand-name { font-size: 17px; font-weight: 800; color: var(--lms-text); letter-spacing: -.4px; }
    .auth-title { font-size: 30px; font-weight: 900; margin: 0 0 8px; letter-spacing: -.5px; }
    .auth-sub   { font-size: 14px; color: var(--lms-text-2); margin: 0 0 24px; }

    /* ── Form ── */
    .auth-form { display: flex; flex-direction: column; gap: 6px; }
    .field-label { font-size: 12px; font-weight: 600; color: var(--lms-text-2); margin: 8px 0 5px; }
    .field {
      display: flex; align-items: center; gap: 8px;
      padding: 0 12px; background: var(--lms-surface-2); border: 1px solid var(--lms-border);
      border-radius: var(--lms-radius-sm); transition: border-color .2s, box-shadow .2s;
      mat-icon { color: var(--lms-text-muted); font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; }
      input {
        flex: 1; min-width: 0; background: transparent; border: none; outline: none;
        padding: 12px 0; font-size: 15px; color: var(--lms-text);
        &::placeholder { color: var(--lms-text-muted); }
      }
      &:focus-within { border-color: var(--lms-purple); box-shadow: 0 0 0 3px rgba(124,58,237,.15); }
      &.invalid { border-color: var(--lms-red); }
    }
    .pw-toggle {
      width: 28px; height: 28px; border: none; background: transparent; cursor: pointer;
      color: var(--lms-text-muted); display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
      &:hover { color: var(--lms-text); }
    }
    .err-msg { font-size: 11.5px; color: var(--lms-red); margin: 3px 0 0; }
    .form-row { display: flex; justify-content: space-between; align-items: center; margin: 12px 0 16px; flex-wrap: wrap; gap: 8px; }
    .remember { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--lms-text-2); cursor: pointer;
      input { accent-color: var(--lms-purple); }
    }
    .forgot { font-size: 13px; color: var(--lms-purple-2); cursor: pointer; background: none; border: none; padding: 0; font-family: inherit;
      &:hover { text-decoration: underline; }
    }
    .submit-btn {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      width: 100%; padding: 13px; border: none; border-radius: var(--lms-radius-sm); cursor: pointer;
      background: var(--lms-gradient); color: #fff; font-weight: 700; font-size: 14px;
      box-shadow: var(--lms-shadow-purple); transition: opacity .2s, transform .15s;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
      &:hover:not(:disabled) { opacity: .9; transform: translateY(-1px); }
      &:disabled { opacity: .5; cursor: not-allowed; }
    }
    .spin { animation: spin 1s linear infinite; }
    .divider { display: flex; align-items: center; gap: 12px; margin: 18px 0;
      &::before,&::after { content: ''; flex: 1; height: 1px; background: var(--lms-border); }
      span { font-size: 11px; color: var(--lms-text-muted); text-transform: uppercase; letter-spacing: .5px; }
    }
    .oauth-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .oauth-btn {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      padding: 11px; border: 1px solid var(--lms-border); border-radius: var(--lms-radius-sm); cursor: pointer;
      background: var(--lms-surface-2); color: var(--lms-text); font-size: 13px; font-weight: 600; transition: all .15s;
      .g { font-weight: 900; color: #EA4335; font-size: 14px; }
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
      &:hover { border-color: var(--lms-border-hover); }
    }
    .auth-foot { font-size: 13px; text-align: center; color: var(--lms-text-2); margin: 20px 0 0;
      a { color: var(--lms-purple-2); font-weight: 700; text-decoration: none; &:hover { text-decoration: underline; } }
    }

    /* ── Right column ── */
    .auth-right { display: flex; flex-direction: column; justify-content: space-between; position: relative; }
    .stage-3d { position: relative; height: 320px; perspective: 1200px; }
    .big-orb {
      position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%);
      width: 220px; height: 220px; border-radius: 99px; background: var(--lms-gradient);
      box-shadow: 0 30px 90px rgba(124,58,237,.5); animation: floatY 5s ease-in-out infinite; z-index: 0;
    }
    .card-float {
      position: absolute; background: rgba(26,26,46,.85); backdrop-filter: blur(16px);
      border: 1px solid var(--lms-border-hover); border-radius: var(--lms-radius-sm);
      padding: 12px 16px; display: flex; align-items: center; gap: 12px;
      box-shadow: 0 20px 50px rgba(0,0,0,.4); animation: floatY 4s ease-in-out infinite; z-index: 1;
      mat-icon { color: var(--lms-purple-2); font-size: 22px; width: 22px; height: 22px; }
      .cf-title { font-size: 13px; font-weight: 700; margin: 0; }
      .cf-sub   { font-size: 11px; color: var(--lms-text-2); margin: 2px 0 0; }
      &.card-a { top: 20px; left: 5%; animation-delay: 0s; }
      &.card-b { top: 130px; right: 5%; animation-delay: -1.5s; }
      &.card-c { bottom: 20px; left: 15%; animation-delay: -3s; mat-icon { color: var(--lms-amber); } }
    }
    .rt-title { font-size: 28px; font-weight: 900; line-height: 1.2; margin: 0 0 10px; letter-spacing: -.5px; }
    .rt-sub   { font-size: 14px; color: var(--lms-text-2); line-height: 1.6; margin: 0; }

    /* ── Responsive ── */
    @media (max-width: 900px) {
      .auth-grid { grid-template-columns: 1fr; }
      .auth-right { display: none; }
    }
    @media (max-width: 580px) {
      .auth-page { padding: 16px; }
      .auth-grid { padding: 28px 20px; border-radius: 16px; }
      .auth-title { font-size: 24px; }
      .brand-link { margin-bottom: 20px; }
      .field input { font-size: 16px; }
      .oauth-row { grid-template-columns: 1fr; }
    }
  `]
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private snack = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  loading = signal(false);
  showPassword = signal(false);
  errorMsg = signal<string | null>(null);

  onForgotPassword(): void {
    const email = this.form.controls.email.value?.trim();
    if (!email || this.form.controls.email.invalid) {
      this.snack.open('Enter your email above first, then click Forgot password.', 'OK', { duration: 4000, panelClass: 'snack-err' });
      return;
    }
    this.loading.set(true);
    this.auth.forgotPassword(email).subscribe({
      next: res => {
        this.loading.set(false);
        if (res.resetToken) {
          // Real flow: open reset dialog with the token (in production the user gets this by email)
          this.openResetDialog(res.resetToken);
        } else {
          // Email didn't match a real user — but we keep the message generic to prevent enumeration
          this.snack.open(res.message, 'OK', { duration: 4500 });
        }
      },
      error: (e: Error) => {
        this.loading.set(false);
        this.snack.open(e.message, 'OK', { duration: 3500, panelClass: 'snack-err' });
      },
    });
  }

  private openResetDialog(token: string): void {
    this.dialog.open(ResetPasswordDialogComponent, {
      width: '440px',
      data: { token, email: this.form.controls.email.value },
    });
  }

  onOAuth(provider: 'Google' | 'GitHub'): void {
    // Full-page redirect to backend → provider's auth page → /oauth/callback.
    this.loading.set(true);
    this.auth.startOAuthRedirect(provider.toLowerCase() as 'google' | 'github');
  }

  form = this.fb.nonNullable.group({
    email:    ['', [Validators.required, Validators.email, Validators.maxLength(120)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(100)]],
    remember: [false],
  });

  ctrlInvalid(name: string): boolean {
    const c = this.form.get(name);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  togglePw(): void { this.showPassword.update(v => !v); }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    this.loading.set(true);
    this.errorMsg.set(null);
    this.auth.login({ email: v.email.trim(), password: v.password }).subscribe({
      next: () => {
        this.loading.set(false);
        const redirect = this.route.snapshot.queryParamMap.get('redirect') ?? '/home';
        this.router.navigateByUrl(redirect);
      },
      error: (err: Error) => {
        this.loading.set(false);
        this.errorMsg.set(err.message);
      },
    });
  }
}
