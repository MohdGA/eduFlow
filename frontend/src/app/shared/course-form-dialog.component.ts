import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CourseFormPayload, CourseService } from '../core/services/course.service';
import { resolveMediaUrl } from '../core/config/api.config';

export interface CourseFormDialogData {
  mode: 'create' | 'edit';
  id?: string;                              // required for edit mode (enables thumbnail upload)
  initial?: Partial<CourseFormPayload> & { imageUrl?: string | null };
}

@Component({
  selector: 'app-course-form-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  template: `
    <div class="cf-dialog">
      <header class="cf-head">
        <div>
          <h2>{{ data.mode === 'create' ? 'Create a course' : 'Edit course' }}</h2>
          <p>{{ data.mode === 'create'
                ? 'Courses start as draft. Publish from /admin/courses when ready.'
                : 'Changes save immediately and are audited.' }}</p>
        </div>
        <button class="close" (click)="ref.close()" aria-label="Close">
          <mat-icon>close</mat-icon>
        </button>
      </header>

      <form [formGroup]="form" (ngSubmit)="submit()" class="cf-form">
        <label class="lbl">Title</label>
        <input formControlName="title" placeholder="e.g. The Complete React Course" maxlength="140">
        @if (invalid('title')) { <p class="err">Title is required (1–140 chars).</p> }

        <label class="lbl">Subtitle</label>
        <input formControlName="subtitle" placeholder="A short tagline shown on cards" maxlength="280">
        @if (invalid('subtitle')) { <p class="err">Subtitle is required (1–280 chars).</p> }

        <label class="lbl">Description</label>
        <textarea formControlName="description" rows="4" maxlength="4000"
                  placeholder="Tell learners what they'll build and master. Markdown not supported in this build."></textarea>

        <div class="row-2">
          <div>
            <label class="lbl">Category</label>
            <select formControlName="category">
              <option value="Development">Development</option>
              <option value="Design">Design</option>
              <option value="Data Science">Data Science</option>
              <option value="Cloud">Cloud</option>
              <option value="Marketing">Marketing</option>
              <option value="Mobile">Mobile</option>
            </select>
          </div>
          <div>
            <label class="lbl">Level</label>
            <select formControlName="level">
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>
        </div>

        <div class="row-2">
          <div>
            <label class="lbl">Price (USD)</label>
            <input type="number" min="0" max="9999.99" step="0.01" formControlName="price">
          </div>
          <div>
            <label class="lbl">Duration</label>
            <input formControlName="duration" placeholder="e.g. 12h" maxlength="40">
          </div>
        </div>

        <label class="lbl">Thumbnail color</label>
        <div class="thumbs">
          @for (t of thumbs; track t.id) {
            <button type="button" class="thumb" [class.is-on]="form.value.thumbnailGradient === t.id"
                    [style.background]="t.bg" (click)="form.controls.thumbnailGradient.setValue(t.id)"
                    [attr.aria-label]="t.name">
              @if (form.value.thumbnailGradient === t.id) { <mat-icon>check</mat-icon> }
            </button>
          }
        </div>

        <label class="lbl">Thumbnail image (optional)</label>
        <div class="thumb-upload">
          @if (thumbnailPreview()) {
            <img [src]="thumbnailPreview()" alt="preview" class="thumb-preview-img">
          } @else {
            <div class="thumb-preview-img placeholder"><mat-icon>image</mat-icon></div>
          }
          <input type="text" placeholder="Image URL (https://...) — or upload a file →"
                 [formControl]="imageUrlCtrl" class="img-url">
          <input #thumbInput type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden
                 (change)="onThumbnailPicked($event)">
          <button type="button" class="btn ghost" (click)="thumbInput.click()" [disabled]="uploadingThumb">
            <mat-icon>upload</mat-icon>
            {{ uploadingThumb ? 'Uploading…' : (data.mode === 'edit' ? 'Upload file' : 'Save course first to upload') }}
          </button>
        </div>
        @if (data.mode !== 'edit' && !thumbnailPreview()) {
          <p class="hint">Tip: save the course first, then re-open it to upload a thumbnail image from your PC.</p>
        }

        @if (errorMsg) { <p class="err" style="margin-top:8px">{{ errorMsg }}</p> }

        <footer class="cf-foot">
          <button type="button" class="btn ghost" (click)="ref.close()">Cancel</button>
          <button type="submit" class="btn primary" [disabled]="form.invalid || saving">
            @if (saving) { <mat-icon class="spin">progress_activity</mat-icon> } @else { <mat-icon>save</mat-icon> }
            {{ saving
                ? (data.mode === 'create' ? 'Creating…' : 'Saving…')
                : (data.mode === 'create' ? 'Create course' : 'Save changes') }}
          </button>
        </footer>
      </form>
    </div>
  `,
  styles: [`
    :host {
      display:block;
      max-width: 560px;
      max-height: 90vh;
      overflow: hidden;
    }
    .cf-dialog {
      background: var(--lms-surface); color: var(--lms-text);
      display: flex; flex-direction: column;
      max-height: 90vh;
    }
    .cf-dialog form {
      overflow-y: auto;
      flex: 1 1 auto;
      min-height: 0;
      padding: 0 24px 18px;
    }
    .cf-foot {
      flex: 0 0 auto;
      position: sticky; bottom: 0;
      background: var(--lms-surface);
      border-top: 1px solid var(--lms-border);
      padding: 14px 24px;
      display: flex; justify-content: flex-end; gap: 10px;
    }
    .thumb-upload { display:flex; align-items:center; gap: 10px; margin: 6px 0 0; flex-wrap: wrap; }
    .thumb-preview-img {
      width: 88px; height: 56px; border-radius: 8px; object-fit: cover;
      border: 1px solid var(--lms-border); background: var(--lms-surface-2);
      display: grid; place-items: center;
    }
    .thumb-preview-img.placeholder mat-icon { color: var(--lms-text-2); opacity: .5; }
    .img-url { flex: 1; min-width: 180px; background: var(--lms-surface-2);
      border: 1px solid var(--lms-border); border-radius: 8px; padding: 8px 12px;
      color: var(--lms-text); font-size: 13px; outline: none; }
    .img-url:focus { border-color: var(--lms-purple); }
    .hint { font-size: 11px; opacity: .6; margin: 4px 0 0; }

    .cf-head {
      display: flex; justify-content: space-between; align-items: flex-start;
      padding: 22px 24px 14px; border-bottom: 1px solid var(--lms-border);
      h2 { font-size: 19px; font-weight: 900; margin: 0; letter-spacing: -.3px; }
      p  { font-size: 12.5px; color: var(--lms-text-2); margin: 4px 0 0; max-width: 380px; }
    }
    .close {
      width: 32px; height: 32px; border-radius: 8px; border: none; background: var(--lms-surface-2);
      color: var(--lms-text-2); cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
      &:hover { color: var(--lms-text); background: var(--lms-surface-3); }
    }

    .cf-form { padding: 20px 24px; display: flex; flex-direction: column; gap: 4px; }
    .lbl { font-size: 12.5px; font-weight: 600; color: var(--lms-text-2); margin: 10px 0 6px; }
    input, textarea, select {
      width: 100%;
      background: var(--lms-surface-2); border: 1px solid var(--lms-border);
      border-radius: var(--lms-radius-sm); padding: 10px 14px;
      color: var(--lms-text); font-size: 13.5px; font-family: inherit;
      &:focus { outline: none; border-color: var(--lms-purple); }
    }
    textarea { resize: vertical; min-height: 90px; }
    .err { font-size: 11.5px; color: var(--lms-red); margin: 4px 0 0; }
    .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

    .thumbs { display: flex; gap: 8px; margin-top: 4px; flex-wrap: wrap; }
    .thumb {
      width: 44px; height: 44px; border-radius: 10px; border: 2px solid transparent;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: transform .15s, border-color .15s;
      &:hover { transform: scale(1.08); }
      &.is-on { border-color: #fff; box-shadow: 0 0 0 2px var(--lms-purple); }
      mat-icon { color: #fff; font-size: 18px; width: 18px; height: 18px;
                 filter: drop-shadow(0 2px 4px rgba(0,0,0,.4)); }
    }

    .btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 10px 20px; border-radius: var(--lms-radius-sm); cursor: pointer;
      font-size: 13px; font-weight: 700; border: 1px solid var(--lms-border);
      transition: all .15s;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
      &.ghost { background: var(--lms-surface-2); color: var(--lms-text); &:hover { border-color: var(--lms-border-hover); } }
      &.primary {
        background: var(--lms-gradient); color: #fff; border-color: transparent;
        box-shadow: var(--lms-shadow-purple);
        &:hover:not(:disabled) { opacity: .9; transform: translateY(-1px); }
        &:disabled { opacity: .55; cursor: not-allowed; }
      }
    }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class CourseFormDialogComponent {
  readonly data: CourseFormDialogData = inject(MAT_DIALOG_DATA);
  readonly ref  = inject<MatDialogRef<CourseFormDialogComponent, CourseFormPayload | null>>(MatDialogRef);
  private fb    = inject(FormBuilder);
  private api   = inject(CourseService);
  private snack = inject(MatSnackBar);

  saving = false;
  errorMsg: string | null = null;

  // Thumbnail image (separate from gradient — overrides it when set)
  imageUrlCtrl = new FormControl<string>(this.data.initial?.imageUrl ?? '', { nonNullable: true });
  thumbnailPreview = signal<string | null>(resolveMediaUrl(this.data.initial?.imageUrl ?? ''));
  uploadingThumb = false;

  thumbs = [
    { id: 'grad-purple', name: 'Purple', bg: 'linear-gradient(135deg,#4c1d95 0%,#7c3aed 100%)' },
    { id: 'grad-blue',   name: 'Blue',   bg: 'linear-gradient(135deg,#1e3a8a 0%,#3b82f6 100%)' },
    { id: 'grad-pink',   name: 'Pink',   bg: 'linear-gradient(135deg,#831843 0%,#ec4899 100%)' },
    { id: 'grad-amber',  name: 'Amber',  bg: 'linear-gradient(135deg,#78350f 0%,#f59e0b 100%)' },
    { id: 'grad-cyan',   name: 'Cyan',   bg: 'linear-gradient(135deg,#164e63 0%,#06b6d4 100%)' },
    { id: 'grad-green',  name: 'Green',  bg: 'linear-gradient(135deg,#064e3b 0%,#10b981 100%)' },
  ];

  form = this.fb.nonNullable.group({
    title:             [this.data.initial?.title       ?? '', [Validators.required, Validators.maxLength(140)]],
    subtitle:          [this.data.initial?.subtitle    ?? '', [Validators.required, Validators.maxLength(280)]],
    description:       [this.data.initial?.description ?? '', [Validators.maxLength(4000)]],
    category:          [this.data.initial?.category    ?? 'Development', [Validators.required]],
    level:             [this.data.initial?.level       ?? 'Beginner' as 'Beginner', [Validators.required]],
    price:             [this.data.initial?.price       ?? 49.99, [Validators.required, Validators.min(0), Validators.max(9999.99)]],
    duration:          [this.data.initial?.duration    ?? '0h'],
    thumbnailGradient: [this.data.initial?.thumbnailGradient ?? 'grad-purple'],
  });

  invalid(name: string): boolean {
    const c = this.form.get(name);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    this.errorMsg = null;
    const v = this.form.getRawValue();
    this.ref.close({
      title: v.title.trim(),
      subtitle: v.subtitle.trim(),
      description: v.description?.trim() ?? '',
      category: v.category,
      level: v.level as 'Beginner' | 'Intermediate' | 'Advanced',
      price: v.price,
      duration: v.duration ?? '0h',
      thumbnailGradient: v.thumbnailGradient ?? 'grad-purple',
      imageUrl: this.imageUrlCtrl.value.trim() || null,
    });
  }

  onThumbnailPicked(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      this.snack.open('Image exceeds 10 MB', 'OK', { duration: 3000, panelClass: 'snack-err' });
      return;
    }
    // Need an existing course id to upload — only works in edit mode.
    if (this.data.mode !== 'edit' || !this.data.id) {
      this.snack.open('Save the course first, then re-open to upload a thumbnail.', 'OK',
        { duration: 3500, panelClass: 'snack-err' });
      return;
    }
    this.uploadingThumb = true;
    this.api.uploadThumbnail(this.data.id, file).subscribe({
      next: (course) => {
        this.uploadingThumb = false;
        this.imageUrlCtrl.setValue(course.imageUrl ?? '');
        this.thumbnailPreview.set(resolveMediaUrl(course.imageUrl ?? ''));
        this.snack.open('Thumbnail uploaded', 'OK', { duration: 2000, panelClass: 'snack-ok' });
      },
      error: (e: { error?: { message?: string } }) => {
        this.uploadingThumb = false;
        this.snack.open(e?.error?.message ?? 'Upload failed', 'OK', { duration: 3500, panelClass: 'snack-err' });
      },
    });
  }
}
