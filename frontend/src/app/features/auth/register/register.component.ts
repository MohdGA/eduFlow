import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../../core/services/auth.service';
import { LegalDialogComponent } from '../../../shared/legal-dialog.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, MatIconModule, MatButtonModule],
  template: `
  <div class="auth-page">
    <div class="blob b1"></div>
    <div class="blob b2"></div>
    <div class="blob b3"></div>

    <div class="auth-grid">

      <div class="auth-left asi">
        <a routerLink="/home" class="brand-link">
          <div class="brand-icon"><mat-icon>school</mat-icon></div>
          <span class="brand-name">EduFlow</span>
        </a>

        <h1 class="auth-title">Create your account</h1>
        <p class="auth-sub">How will you use EduFlow?</p>

        <!-- ── Role picker ── -->
        <div class="role-picker">
          <button type="button" class="role-card" [class.selected]="selectedRole === 'Student'" (click)="selectedRole = 'Student'">
            <div class="rc-icon" style="background:linear-gradient(135deg,#7C3AED,#3B82F6)">
              <mat-icon>school</mat-icon>
            </div>
            <div class="rc-body">
              <p class="rc-title">I'm a Student</p>
              <p class="rc-sub">Learn new skills from expert courses</p>
            </div>
            <div class="rc-check"><mat-icon>check_circle</mat-icon></div>
          </button>
          <button type="button" class="role-card" [class.selected]="selectedRole === 'Instructor'" (click)="selectedRole = 'Instructor'">
            <div class="rc-icon" style="background:linear-gradient(135deg,#EC4899,#F87171)">
              <mat-icon>co_present</mat-icon>
            </div>
            <div class="rc-body">
              <p class="rc-title">I'm an Instructor</p>
              <p class="rc-sub">Create and sell your own courses</p>
            </div>
            <div class="rc-check"><mat-icon>check_circle</mat-icon></div>
          </button>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" class="auth-form" autocomplete="on">
          <div class="row-2">
            <div>
              <label class="field-label">First name</label>
              <div class="field" [class.invalid]="ctrlInvalid('firstName')">
                <mat-icon>person_outline</mat-icon>
                <input formControlName="firstName" placeholder="Alex" autocomplete="given-name" maxlength="40" required>
              </div>
            </div>
            <div>
              <label class="field-label">Last name</label>
              <div class="field" [class.invalid]="ctrlInvalid('lastName')">
                <mat-icon>person_outline</mat-icon>
                <input formControlName="lastName" placeholder="Doe" autocomplete="family-name" maxlength="40" required>
              </div>
            </div>
          </div>

          <label class="field-label">Email</label>
          <div class="field" [class.invalid]="ctrlInvalid('email')">
            <mat-icon>mail_outline</mat-icon>
            <input type="email" formControlName="email" placeholder="you@example.com" autocomplete="email" maxlength="120" required>
          </div>
          @if (ctrlInvalid('email')) { <p class="err-msg">Please enter a valid email.</p> }

          <label class="field-label">Password</label>
          <div class="field" [class.invalid]="ctrlInvalid('password')">
            <mat-icon>lock_outline</mat-icon>
            <input
              [type]="showPw() ? 'text' : 'password'"
              formControlName="password"
              placeholder="At least 8 characters"
              autocomplete="new-password"
              maxlength="100"
              minlength="8"
              required
            >
            <button type="button" class="pw-toggle" (click)="togglePw()" tabindex="-1">
              <mat-icon>{{ showPw() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
          </div>
          <!-- Password strength meter -->
          <div class="pw-strength" *ngIf="form.controls.password.value">
            <div class="pws-bar"><div class="pws-fill" [class]="strengthClass()" [style.width.%]="strengthPct()"></div></div>
            <span class="pws-label" [class]="strengthClass()">{{ strengthLabel() }}</span>
          </div>

          <label class="checkbox-row">
            <input type="checkbox" formControlName="terms">
            <span>I agree to the
              <button type="button" class="link-btn" (click)="onShowLegal('Terms of Service')">Terms of Service</button>
              and
              <button type="button" class="link-btn" (click)="onShowLegal('Privacy Policy')">Privacy Policy</button>
            </span>
          </label>

          @if (errorMsg()) {
            <p class="err-msg" style="margin: 6px 0 0">{{ errorMsg() }}</p>
          }

          <button type="submit" class="submit-btn" [disabled]="form.invalid || loading()">
            @if (loading()) { <mat-icon class="spin">progress_activity</mat-icon> } @else { <mat-icon>{{ selectedRole === 'Instructor' ? 'co_present' : 'school' }}</mat-icon> }
            {{ loading() ? 'Creating account...' : 'Join as ' + selectedRole }}
          </button>

          <p class="auth-foot">
            Already have an account?
            <a routerLink="/login">Sign in</a>
          </p>
        </form>
      </div>

      <div class="auth-right">
        <div class="benefits-3d">
          @for (b of benefits; track b.title; let i = $index) {
            <div class="benefit-card" [style.--i]="i" [style.animation-delay.s]="i * 0.15">
              <div class="bc-icon" [style.background]="b.color"><mat-icon>{{ b.icon }}</mat-icon></div>
              <div>
                <p class="bc-title">{{ b.title }}</p>
                <p class="bc-sub">{{ b.sub }}</p>
              </div>
            </div>
          }
        </div>
        <div class="right-text">
          <h2 class="rt-title">Build skills that<br><span class="gradient-text">land jobs.</span></h2>
          <p class="rt-sub">Over 84% of learners report a career boost within 6 months.</p>
        </div>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .auth-page {
      position:fixed; inset:0; overflow-y:auto; overflow-x:hidden;
      background: radial-gradient(circle at bottom left, #1A0E2E 0%, var(--lms-bg) 60%);
      display:flex; padding:32px; box-sizing:border-box;
    }
    .blob {
      &.b1 { width:520px; height:520px; background:rgba(124,58,237,0.18); top:-150px; right:-100px; animation:floatBlob 16s ease-in-out infinite; }
      &.b2 { width:400px; height:400px; background:rgba(59,130,246,0.16); bottom:-120px; left:-80px; animation:floatBlob 14s ease-in-out infinite reverse; }
      &.b3 { width:300px; height:300px; background:rgba(236,72,153,0.10); top:50%; right:40%; animation:floatBlob 20s ease-in-out infinite; }
    }
    .auth-grid {
      position:relative; z-index:1; margin:auto;
      width:100%; max-width:1080px; display:grid; grid-template-columns:1fr 1fr; gap:40px;
      background:rgba(17,17,32,0.55); backdrop-filter:blur(20px);
      border:1px solid var(--lms-border); border-radius:24px;
      padding:48px;
    }

    /* ── Left (same look as login) ── */
    .brand-link { display:flex; align-items:center; gap:10px; text-decoration:none; margin-bottom:32px; }
    .brand-icon {
      width:38px; height:38px; border-radius:10px;
      background:var(--lms-gradient); box-shadow:var(--lms-shadow-purple);
      display:flex; align-items:center; justify-content:center;
      mat-icon { color:#fff; font-size:22px; width:22px; height:22px; }
    }
    .brand-name { font-size:18px; font-weight:800; letter-spacing:-.4px; }
    .auth-title { font-size:30px; font-weight:900; margin:0 0 8px; letter-spacing:-.6px; }
    .auth-sub   { font-size:14px; color:var(--lms-text-2); margin:0 0 24px; }

    .role-picker { display:flex; flex-direction:column; gap:10px; margin-bottom:20px; }
    .role-card {
      display:flex; align-items:center; gap:14px;
      padding:14px 16px; border-radius:var(--lms-radius-sm);
      border:1.5px solid var(--lms-border); background:var(--lms-surface-2);
      cursor:pointer; text-align:left; transition:all .2s; width:100%;
      .rc-check { margin-left:auto; color:transparent; transition:color .2s;
        mat-icon { font-size:20px; width:20px; height:20px; } }
      &:hover { border-color:var(--lms-border-hover); }
      &.selected {
        border-color:var(--lms-purple);
        background:var(--lms-purple-dim);
        box-shadow:0 0 0 3px rgba(124,58,237,0.12);
        .rc-check { color:var(--lms-purple-2); }
      }
    }
    .rc-icon {
      width:40px; height:40px; border-radius:10px; flex-shrink:0;
      display:flex; align-items:center; justify-content:center;
      mat-icon { color:#fff; font-size:20px; width:20px; height:20px; }
    }
    .rc-title { font-size:13.5px; font-weight:700; color:var(--lms-text); margin:0; }
    .rc-sub   { font-size:11.5px; color:var(--lms-text-2); margin:2px 0 0; }

    .auth-form { display:flex; flex-direction:column; gap:8px; }
    .row-2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .field-label { font-size:12.5px; font-weight:600; color:var(--lms-text-2); margin:8px 0 6px; }
    .field {
      display:flex; align-items:center; gap:10px;
      padding:0 12px; background:var(--lms-surface-2); border:1px solid var(--lms-border);
      border-radius:var(--lms-radius-sm);
      transition:border-color .2s, box-shadow .2s;
      mat-icon { color:var(--lms-text-muted); font-size:18px; width:18px; height:18px; }
      input { flex:1; background:transparent; border:none; outline:none;
        padding:12px 0; font-size:14px; color:var(--lms-text);
        &::placeholder { color:var(--lms-text-muted); }
      }
      &:focus-within { border-color:var(--lms-purple); box-shadow:0 0 0 3px rgba(124,58,237,0.15); }
      &.invalid { border-color:var(--lms-red); }
    }
    .pw-toggle {
      width:28px; height:28px; border:none; background:transparent; cursor:pointer;
      color:var(--lms-text-muted);
      display:flex; align-items:center; justify-content:center;
      mat-icon { font-size:18px; width:18px; height:18px; }
      &:hover { color:var(--lms-text); }
    }
    .err-msg { font-size:11.5px; color:var(--lms-red); margin:4px 0 0; }

    .pw-strength { display:flex; align-items:center; gap:10px; margin:6px 0 0; }
    .pws-bar { flex:1; height:4px; background:var(--lms-surface-3); border-radius:99px; overflow:hidden; }
    .pws-fill { height:100%; border-radius:99px; transition:width .3s ease;
      &.weak   { background:var(--lms-red); }
      &.medium { background:var(--lms-amber); }
      &.strong { background:var(--lms-green); }
    }
    .pws-label { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.4px;
      &.weak   { color:var(--lms-red); }
      &.medium { color:var(--lms-amber); }
      &.strong { color:var(--lms-green); }
    }

    .checkbox-row {
      display:flex; align-items:center; gap:8px; font-size:13px; color:var(--lms-text-2);
      margin:18px 0 6px; cursor:pointer;
      input { accent-color: var(--lms-purple); }
      .link-btn {
        background:none; border:none; padding:0;
        font-family:inherit; font-size:inherit; color:var(--lms-purple-2);
        cursor:pointer;
        &:hover { text-decoration: underline; }
      }
    }
    .submit-btn {
      display:flex; align-items:center; justify-content:center; gap:8px;
      width:100%; padding:13px; border:none; border-radius:var(--lms-radius-sm); cursor:pointer;
      background:var(--lms-gradient); color:#fff; font-weight:700; font-size:14px;
      box-shadow:var(--lms-shadow-purple);
      transition:opacity .2s, transform .15s;
      margin-top:14px;
      mat-icon { font-size:18px; width:18px; height:18px; }
      &:hover:not(:disabled) { opacity:.92; transform:translateY(-1px); }
      &:disabled { opacity:.5; cursor:not-allowed; }
    }
    .spin { animation: spin 1s linear infinite; }
    .auth-foot { font-size:13px; text-align:center; color:var(--lms-text-2); margin:22px 0 0;
      a { color:var(--lms-purple-2); font-weight:700; text-decoration:none;
        &:hover { text-decoration:underline; }
      }
    }

    /* ── Right side: 3D benefit cards ── */
    .auth-right { display:flex; flex-direction:column; justify-content:space-between; gap:32px; }
    .benefits-3d { display:flex; flex-direction:column; gap:14px; perspective:1200px; padding-top:24px; }
    .benefit-card {
      display:flex; align-items:center; gap:14px;
      padding:16px 20px; border-radius:var(--lms-radius-sm);
      background:rgba(26,26,46,0.7); backdrop-filter:blur(12px);
      border:1px solid var(--lms-border);
      transform-style:preserve-3d;
      animation: floatY 4.5s ease-in-out infinite, fadeInUp .5s cubic-bezier(.16,1,.3,1) both;
      &:nth-child(1) { transform: perspective(800px) rotateY(6deg) translateX(-10px); }
      &:nth-child(2) { transform: perspective(800px) rotateY(-4deg) translateX(20px); }
      &:nth-child(3) { transform: perspective(800px) rotateY(8deg) translateX(-5px); }
      &:nth-child(4) { transform: perspective(800px) rotateY(-5deg) translateX(15px); }
    }
    .bc-icon {
      width:42px; height:42px; border-radius:12px; flex-shrink:0;
      display:flex; align-items:center; justify-content:center;
      mat-icon { color:#fff; font-size:22px; width:22px; height:22px; }
    }
    .bc-title { font-size:14px; font-weight:700; color:var(--lms-text); margin:0; }
    .bc-sub   { font-size:12px; color:var(--lms-text-2); margin:2px 0 0; }

    .right-text {}
    .rt-title { font-size:30px; font-weight:900; line-height:1.15; margin:0 0 10px; letter-spacing:-.6px; }
    .rt-sub   { font-size:14px; color:var(--lms-text-2); margin:0; }

    @media (max-width: 900px) {
      .auth-grid { grid-template-columns:1fr; }
      .auth-right { display:none; }
    }
    @media (max-width: 600px) {
      .auth-page { padding: 16px; align-items: flex-start; padding-top: 24px; }
      .auth-grid { padding: 24px 16px; border-radius: 16px; }
      .auth-title { font-size: 22px; }
      .auth-sub { font-size: 13px; margin-bottom: 14px; }
      .brand-link { margin-bottom: 18px; }
      .row-2 { grid-template-columns: 1fr; }
      .role-picker { gap: 8px; margin-bottom: 14px; }
      .role-card { padding: 12px 14px; }
      .rc-sub { display: none; }
      .field input { font-size: 16px; }
      .submit-btn { padding: 14px; font-size: 15px; }
    }
  `]
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private auth = inject(AuthService);
  private snack = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  loading      = signal(false);
  showPw       = signal(false);
  errorMsg     = signal<string | null>(null);
  selectedRole: 'Student' | 'Instructor' = 'Student';

  onShowLegal(doc: 'Terms of Service' | 'Privacy Policy'): void {
    this.dialog.open(LegalDialogComponent, {
      data: { doc },
      maxWidth: '720px',
      width: '92vw',
      panelClass: 'legal-dialog-panel',
      autoFocus: false,
    });
  }

  onOAuth(provider: 'Google' | 'GitHub'): void {
    this.loading.set(true);
    this.auth.startOAuthRedirect(provider.toLowerCase() as 'google' | 'github');
  }

  form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(40)]],
    lastName:  ['', [Validators.required, Validators.maxLength(40)]],
    email:     ['', [Validators.required, Validators.email, Validators.maxLength(120)]],
    password:  ['', [Validators.required, Validators.minLength(8), Validators.maxLength(100), this.strongPassword]],
    terms:     [false, [Validators.requiredTrue]],
  });

  benefits = [
    { title:'1,200+ courses',          sub:'Learn anything you want',            icon:'menu_book',  color:'linear-gradient(135deg,#7C3AED,#3B82F6)' },
    { title:'Expert instructors',      sub:'Industry pros with real experience', icon:'verified',   color:'linear-gradient(135deg,#EC4899,#F87171)' },
    { title:'Recognized certificates', sub:'Shareable on LinkedIn',              icon:'workspace_premium', color:'linear-gradient(135deg,#F59E0B,#EF4444)' },
    { title:'Learn at your pace',      sub:'Lifetime access, anywhere',          icon:'all_inclusive', color:'linear-gradient(135deg,#10B981,#06B6D4)' },
  ];

  ctrlInvalid(name: string): boolean {
    const c = this.form.get(name);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  togglePw(): void { this.showPw.update(v => !v); }

  // Password strength: 0 (none), 1 (weak), 2 (medium), 3 (strong)
  private scorePassword(p: string): number {
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8) s++;
    if (p.length >= 12) s++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
    if (/\d/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return Math.min(3, Math.floor(s / 2));
  }
  strengthPct(): number    { return [0, 33, 66, 100][this.scorePassword(this.form.controls.password.value)]; }
  strengthLabel(): string  { return ['', 'Weak', 'Medium', 'Strong'][this.scorePassword(this.form.controls.password.value)]; }
  strengthClass(): string  { return ['', 'weak', 'medium', 'strong'][this.scorePassword(this.form.controls.password.value)]; }

  private strongPassword(c: AbstractControl): ValidationErrors | null {
    const v = c.value ?? '';
    if (!v) return null;
    const hasLetter = /[A-Za-z]/.test(v);
    const hasNumber = /\d/.test(v);
    return hasLetter && hasNumber ? null : { weak: true };
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    this.loading.set(true);
    this.errorMsg.set(null);
    this.auth.register({
      firstName: v.firstName.trim(),
      lastName:  v.lastName.trim(),
      email:     v.email.trim(),
      password:  v.password,
      role:      this.selectedRole,
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/home']);
      },
      error: (err: Error) => {
        this.loading.set(false);
        this.errorMsg.set(err.message);
      },
    });
  }
}
