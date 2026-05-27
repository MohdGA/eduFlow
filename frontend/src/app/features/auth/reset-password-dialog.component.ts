import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from '../../core/services/auth.service';

export interface ResetPasswordDialogData { token: string; email: string; }

@Component({
  selector: 'app-reset-password-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  template: `
    <div class="dlg">
      <header>
        <div>
          <h2>Choose a new password</h2>
          <p>Resetting password for <strong>{{ data.email }}</strong></p>
        </div>
        <button class="close" (click)="ref.close()" aria-label="Close"><mat-icon>close</mat-icon></button>
      </header>

      <p class="hint">
        In production, the reset token would be delivered to the email address.
        For this demo build, we received it directly and pre-filled it.
      </p>

      <form [formGroup]="form" (ngSubmit)="submit()">
        <label>New password</label>
        <div class="field">
          <input [type]="show() ? 'text' : 'password'" formControlName="password" minlength="8" maxlength="100" autocomplete="new-password">
          <button type="button" (click)="show.update(v => !v)" tabindex="-1"><mat-icon>{{ show() ? 'visibility_off' : 'visibility' }}</mat-icon></button>
        </div>
        @if (form.controls.password.touched && form.controls.password.invalid) {
          <p class="err">Password must be at least 8 characters.</p>
        }

        @if (errorMsg()) { <p class="err">{{ errorMsg() }}</p> }

        <div class="actions">
          <button type="button" class="btn ghost" (click)="ref.close()">Cancel</button>
          <button type="submit" class="btn primary" [disabled]="form.invalid || saving()">
            @if (saving()) { <mat-icon class="spin">progress_activity</mat-icon> } @else { <mat-icon>lock_reset</mat-icon> }
            {{ saving() ? 'Resetting…' : 'Reset password' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .dlg { padding: 22px 24px; max-width: 440px; }
    header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; gap: 12px; }
    h2 { font-size: 18px; font-weight: 800; margin: 0 0 4px; }
    header p { color: var(--lms-text-2); font-size: 13px; margin: 0; }
    .close { width: 30px; height: 30px; border: none; background: var(--lms-surface-2); color: var(--lms-text-2); border-radius: 8px; cursor: pointer;
             display: flex; align-items: center; justify-content: center;
             mat-icon { font-size: 16px; width: 16px; height: 16px; }
             &:hover { color: var(--lms-text); } }
    .hint { font-size: 12.5px; color: var(--lms-text-2); margin: 0 0 16px; padding: 10px 12px;
            background: var(--lms-purple-dim); border-radius: 8px; border: 1px solid var(--lms-border); }
    label { font-size: 12.5px; font-weight: 600; color: var(--lms-text-2); margin: 8px 0 6px; display: block; }
    .field { display: flex; align-items: center; gap: 6px; background: var(--lms-surface-2);
             border: 1px solid var(--lms-border); border-radius: var(--lms-radius-sm); padding: 0 8px 0 14px;
             &:focus-within { border-color: var(--lms-purple); }
             input { flex: 1; background: none; border: none; outline: none; padding: 11px 0;
                     font-size: 14px; color: var(--lms-text); }
             button { background: none; border: none; color: var(--lms-text-muted); cursor: pointer; padding: 4px;
                      mat-icon { font-size: 18px; width: 18px; height: 18px; }
                      &:hover { color: var(--lms-text); } } }
    .err { font-size: 11.5px; color: var(--lms-red); margin: 4px 0 0; }
    .actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--lms-border); }
    .btn { display: inline-flex; align-items: center; gap: 6px;
           padding: 10px 18px; border-radius: var(--lms-radius-sm); border: 1px solid var(--lms-border); cursor: pointer;
           font-size: 13px; font-weight: 700;
           mat-icon { font-size: 16px; width: 16px; height: 16px; } }
    .btn.ghost   { background: var(--lms-surface-2); color: var(--lms-text); &:hover { border-color: var(--lms-border-hover); } }
    .btn.primary { background: var(--lms-gradient); color: #fff; border-color: transparent; box-shadow: var(--lms-shadow-purple);
                   &:hover:not(:disabled) { opacity: .9; }
                   &:disabled { opacity: .55; cursor: not-allowed; } }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class ResetPasswordDialogComponent {
  readonly data = inject<ResetPasswordDialogData>(MAT_DIALOG_DATA);
  readonly ref  = inject<MatDialogRef<ResetPasswordDialogComponent>>(MatDialogRef);
  private fb    = inject(FormBuilder);
  private auth  = inject(AuthService);
  private snack = inject(MatSnackBar);

  saving   = signal(false);
  show     = signal(false);
  errorMsg = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(100)]],
  });

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.errorMsg.set(null);
    this.auth.resetPassword(this.data.token, this.form.controls.password.value).subscribe({
      next: () => {
        this.saving.set(false);
        this.snack.open('Password reset. You can sign in with the new password.', 'OK', { duration: 3500, panelClass: 'snack-ok' });
        this.ref.close(true);
      },
      error: (e: Error) => {
        this.saving.set(false);
        this.errorMsg.set(e.message);
      },
    });
  }
}
