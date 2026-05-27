import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpEventType } from '@angular/common/http';
import { CourseService, CourseDetail, CourseSection, CourseLesson, LessonFormPayload } from '../../core/services/course.service';

interface DraftLesson {
  id?: string;
  sectionId?: string;
  title: string;
  duration: string;
  type: 'Video' | 'Reading' | 'Quiz';
  description: string;
  videoUrl: string;
}

@Component({
  selector: 'app-curriculum',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatIconModule, MatTooltipModule],
  template: `
  <div class="cur-wrap">
    @if (course(); as c) {
      <header class="cur-head afd">
        <a [routerLink]="['/instructor']" class="back-btn"><mat-icon>arrow_back</mat-icon> Studio</a>
        <div>
          <p class="cur-eyebrow">Curriculum editor</p>
          <h1 class="cur-h1">{{ c.title }}</h1>
          <p class="cur-sub">{{ totalLessons() }} lessons across {{ c.sections.length }} sections</p>
        </div>
        <div class="cur-actions">
          <a class="btn ghost" [routerLink]="['/course', c.id]"><mat-icon>visibility</mat-icon> Preview public page</a>
        </div>
      </header>

      <!-- Add section row -->
      <div class="add-section card">
        <mat-icon>playlist_add</mat-icon>
        <input type="text" placeholder="New section title (e.g. Getting Started)" [(ngModel)]="newSectionTitle" (keydown.enter)="addSection()">
        <button class="btn primary" (click)="addSection()" [disabled]="!newSectionTitle().trim() || saving()">
          <mat-icon>add</mat-icon> Add section
        </button>
      </div>

      @for (s of c.sections; track s.id; let si = $index) {
        <section class="sec-card">
          <header class="sec-head">
            <span class="sec-no">{{ si + 1 }}</span>
            @if (editingSectionId() === s.id) {
              <input class="sec-title-input" [(ngModel)]="editingSectionTitle" (keydown.enter)="saveSection(s)" (keydown.escape)="cancelSectionEdit()">
              <button class="row-btn ok" (click)="saveSection(s)" matTooltip="Save"><mat-icon>check</mat-icon></button>
              <button class="row-btn" (click)="cancelSectionEdit()" matTooltip="Cancel"><mat-icon>close</mat-icon></button>
            } @else {
              <h3 class="sec-title">{{ s.title }}</h3>
              <span class="lesson-count">{{ s.lessons.length }} lesson{{ s.lessons.length === 1 ? '' : 's' }}</span>
              <span class="grow"></span>
              <button class="row-btn" matTooltip="Rename" (click)="startEditSection(s)"><mat-icon>edit</mat-icon></button>
              <button class="row-btn danger" matTooltip="Delete section" (click)="deleteSection(s)"><mat-icon>delete</mat-icon></button>
            }
          </header>

          @for (l of s.lessons; track l.id; let li = $index) {
            <div class="lesson-row" [class.editing]="editingLessonId() === l.id">
              @if (editingLessonId() === l.id) {
                <div class="lesson-edit">
                  <div class="le-row">
                    <input type="text" placeholder="Lesson title" [(ngModel)]="draft.title" class="le-title">
                    <select [(ngModel)]="draft.type">
                      <option value="Video">🎬 Video</option>
                      <option value="Reading">📖 Reading</option>
                      <option value="Quiz">✅ Quiz</option>
                    </select>
                    <input type="text" placeholder="0:00" [(ngModel)]="draft.duration" class="le-duration">
                  </div>
                  <textarea placeholder="Lesson description / notes (shown to students)" [(ngModel)]="draft.description" rows="3"></textarea>

                  <div class="video-row">
                    <mat-icon>movie</mat-icon>
                    <input type="text" placeholder="Video URL (YouTube / Vimeo / direct .mp4 link)" [(ngModel)]="draft.videoUrl" class="le-video-url">
                    <input #fileInput type="file" accept="video/mp4,video/webm,video/ogg,video/quicktime" hidden (change)="onFilePicked(s, l, $event)">
                    <button type="button" class="btn ghost upload-btn" (click)="fileInput.click()" [disabled]="uploadingLessonId() === l.id">
                      <mat-icon>upload</mat-icon>
                      {{ uploadingLessonId() === l.id ? 'Uploading ' + uploadProgress() + '%' : 'Upload from PC' }}
                    </button>
                  </div>
                  @if (draft.videoUrl) {
                    <p class="video-hint">
                      <mat-icon>check_circle</mat-icon>
                      Current: <code>{{ draft.videoUrl }}</code>
                      <button type="button" class="link-btn" (click)="draft.videoUrl = ''">Remove</button>
                    </p>
                  } @else {
                    <p class="video-hint muted">No video yet — paste a URL or upload a file (up to 500 MB, .mp4/.webm/.ogg/.mov)</p>
                  }

                  <div class="le-actions">
                    <button class="btn ghost" (click)="cancelLessonEdit()">Cancel</button>
                    <button class="btn primary" (click)="saveLesson(s)" [disabled]="!draft.title.trim() || saving()">
                      <mat-icon>save</mat-icon> Save lesson
                    </button>
                  </div>
                </div>
              } @else {
                <mat-icon class="lesson-icon">{{ lessonIcon(l.type) }}</mat-icon>
                <span class="lesson-no">{{ si + 1 }}.{{ li + 1 }}</span>
                <span class="lesson-title">{{ l.title }}</span>
                @if (l.description) {
                  <mat-icon class="has-desc" matTooltip="Has description">notes</mat-icon>
                }
                @if (l.videoUrl) {
                  <mat-icon class="has-video" matTooltip="Video attached">movie</mat-icon>
                }
                <span class="lesson-duration">{{ l.duration }}</span>
                <span class="lesson-type-pill" [class]="'t-' + l.type.toLowerCase()">{{ l.type }}</span>
                <button class="row-btn" matTooltip="Edit" (click)="startEditLesson(s, l)"><mat-icon>edit</mat-icon></button>
                <button class="row-btn danger" matTooltip="Delete" (click)="deleteLesson(s, l)"><mat-icon>delete</mat-icon></button>
              }
            </div>
          } @empty {
            <p class="empty">No lessons yet — add the first one below.</p>
          }

          <!-- Add lesson row -->
          @if (addingLessonInSection() === s.id) {
            <div class="lesson-edit add-mode">
              <div class="le-row">
                <input type="text" placeholder="Lesson title" [(ngModel)]="draft.title" class="le-title" autofocus>
                <select [(ngModel)]="draft.type">
                  <option value="Video">🎬 Video</option>
                  <option value="Reading">📖 Reading</option>
                  <option value="Quiz">✅ Quiz</option>
                </select>
                <input type="text" placeholder="0:00" [(ngModel)]="draft.duration" class="le-duration">
              </div>
              <textarea placeholder="Lesson description / notes" [(ngModel)]="draft.description" rows="3"></textarea>

              <div class="video-row">
                <mat-icon>movie</mat-icon>
                <input type="text" placeholder="Video URL (YouTube / Vimeo / direct .mp4) — or pick a file →" [(ngModel)]="draft.videoUrl" class="le-video-url" [disabled]="!!pendingFile()">
                <input #newFileInput type="file" accept="video/mp4,video/webm,video/ogg,video/quicktime" hidden (change)="onNewLessonFilePicked($event)">
                <button type="button" class="btn ghost upload-btn" (click)="newFileInput.click()">
                  <mat-icon>upload</mat-icon> {{ pendingFile() ? 'Change file' : 'Pick file' }}
                </button>
              </div>
              @if (pendingFile(); as f) {
                <p class="video-hint">
                  <mat-icon>check_circle</mat-icon>
                  Will upload: <code>{{ f.name }}</code> ({{ formatBytes(f.size) }})
                  <button type="button" class="link-btn" (click)="pendingFile.set(null)">Remove</button>
                </p>
              } @else if (!draft.videoUrl) {
                <p class="video-hint muted">No video yet — paste a URL or pick a file (up to 500 MB)</p>
              }
              @if (uploadingLessonId() === '__new__') {
                <p class="video-hint"><mat-icon>cloud_upload</mat-icon> Uploading {{ uploadProgress() }}%</p>
              }

              <div class="le-actions">
                <button class="btn ghost" (click)="cancelLessonEdit()">Cancel</button>
                <button class="btn primary" (click)="createLesson(s)" [disabled]="!draft.title.trim() || saving() || uploadingLessonId() === '__new__'">
                  <mat-icon>add</mat-icon> Add lesson
                </button>
              </div>
            </div>
          } @else {
            <button class="add-lesson-btn" (click)="startAddLesson(s)">
              <mat-icon>add</mat-icon> Add lesson to "{{ s.title }}"
            </button>
          }
        </section>
      } @empty {
        <div class="empty-state">
          <mat-icon>menu_book</mat-icon>
          <p>No sections yet. Add your first section above.</p>
        </div>
      }
    } @else if (loading()) {
      <p class="loading">Loading curriculum…</p>
    } @else if (errorMsg()) {
      <div class="empty-state">
        <mat-icon>error_outline</mat-icon>
        <p>{{ errorMsg() }}</p>
      </div>
    }
  </div>
  `,
  styles: [`
    :host { display:block; }
    .cur-wrap { max-width: 1100px; margin: 0 auto; padding: 32px 24px 80px; }
    .cur-head { display:flex; align-items:flex-start; gap: 16px; margin-bottom: 24px; }
    .back-btn { display:inline-flex; align-items:center; gap:6px; color: var(--lms-text-2);
      text-decoration:none; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--lms-border);
      background: var(--lms-surface-2); }
    .back-btn:hover { color: var(--lms-purple-2); }
    .cur-eyebrow { margin: 0; font-size: 11px; letter-spacing: .12em; text-transform: uppercase; opacity: .6; }
    .cur-h1 { margin: 2px 0 4px; font-size: 26px; font-weight: 800; }
    .cur-sub { margin: 0; color: var(--lms-text-2); font-size: 13px; }
    .cur-actions { margin-left:auto; }
    .card, .sec-card, .add-section {
      background: var(--lms-surface);
      border: 1px solid var(--lms-border);
      border-radius: 12px;
    }
    .add-section { display:flex; align-items:center; gap:10px; padding: 12px 14px; margin-bottom: 18px; }
    .add-section input { flex:1; background:transparent; border:none; outline:none;
      font-size: 14px; color: var(--lms-text); padding: 6px 4px; }
    .sec-card { padding: 16px 18px; margin-bottom: 16px; }
    .sec-head { display:flex; align-items:center; gap: 10px; margin-bottom: 8px; }
    .sec-no { width: 28px; height: 28px; border-radius: 50%;
      background: linear-gradient(135deg, #7C3AED, #3B82F6);
      color: white; display:grid; place-items:center; font-weight: 700; font-size: 13px; }
    .sec-title { margin: 0; font-size: 16px; font-weight: 700; }
    .sec-title-input { flex:1; background: var(--lms-surface-2); border: 1px solid var(--lms-border);
      border-radius: 8px; padding: 8px 12px; color: var(--lms-text); font-size: 15px; font-weight: 600; }
    .lesson-count { font-size: 12px; opacity: .55; }
    .grow { flex: 1; }
    .row-btn { width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--lms-border);
      background: var(--lms-surface-2); color: var(--lms-text-2); cursor: pointer;
      display:grid; place-items:center; }
    .row-btn:hover { color: var(--lms-purple-2); border-color: var(--lms-purple); }
    .row-btn.ok:hover { color: var(--lms-green, #10B981); border-color: var(--lms-green, #10B981); }
    .row-btn.danger:hover { color: var(--lms-red, #EF4444); border-color: var(--lms-red, #EF4444); }
    .row-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .lesson-row { display:flex; align-items:center; gap: 10px; padding: 10px 8px;
      border-radius: 8px; border: 1px solid transparent; transition: background .15s; }
    .lesson-row:hover { background: var(--lms-surface-2); border-color: var(--lms-border); }
    .lesson-row.editing { background: var(--lms-surface-2); border-color: var(--lms-purple); display:block; padding: 12px; }
    .lesson-no { font-size: 12px; opacity: .55; min-width: 32px; }
    .lesson-icon { color: var(--lms-purple-2); }
    .lesson-title { flex: 1; font-size: 14px; }
    .has-desc { font-size: 16px; width: 16px; height: 16px; color: var(--lms-amber, #F59E0B); opacity: .8; }
    .has-video { font-size: 16px; width: 16px; height: 16px; color: var(--lms-red, #EF4444); opacity: .9; }
    .video-row { display:flex; gap:8px; align-items:center; }
    .video-row mat-icon { color: var(--lms-purple-2); }
    .le-video-url { flex:1; background: var(--lms-surface); border: 1px solid var(--lms-border);
      border-radius: 8px; padding: 9px 12px; color: var(--lms-text); font-size: 13px; outline:none; }
    .le-video-url:focus { border-color: var(--lms-purple); }
    .upload-btn { white-space: nowrap; }
    .video-hint { display:flex; align-items:center; gap:6px; margin: 4px 2px 0; font-size: 12px;
      color: var(--lms-text-2); }
    .video-hint code { background: var(--lms-surface-2); padding: 2px 6px; border-radius: 4px;
      font-size: 11px; max-width: 380px; overflow:hidden; text-overflow: ellipsis; white-space: nowrap; }
    .video-hint mat-icon { font-size: 16px; width:16px; height:16px; color: #10B981; }
    .video-hint.muted { color: var(--lms-text-2); opacity: .7; }
    .link-btn { background:none; border:none; padding: 0; color: var(--lms-red, #EF4444);
      cursor:pointer; text-decoration: underline; font-size: 12px; }
    .lesson-duration { font-size: 12px; opacity: .7; font-variant-numeric: tabular-nums; }
    .lesson-type-pill { font-size: 11px; padding: 2px 8px; border-radius: 99px;
      background: rgba(167,139,250,0.15); color: var(--lms-purple-2); font-weight: 600; }
    .lesson-type-pill.t-reading { background: rgba(16,185,129,0.15); color: #10B981; }
    .lesson-type-pill.t-quiz { background: rgba(245,158,11,0.15); color: #F59E0B; }
    .lesson-edit { display:flex; flex-direction:column; gap: 10px; }
    .le-row { display:flex; gap: 8px; }
    .le-row input, .le-row select { background: var(--lms-surface); border: 1px solid var(--lms-border);
      border-radius: 8px; padding: 9px 12px; color: var(--lms-text); font-size: 14px; outline:none; }
    .le-row input:focus, .le-row select:focus { border-color: var(--lms-purple); }
    .le-title { flex: 1; }
    .le-duration { width: 80px; text-align: center; }
    textarea { width: 100%; background: var(--lms-surface); border: 1px solid var(--lms-border);
      border-radius: 8px; padding: 10px 12px; color: var(--lms-text); font-size: 13px;
      resize: vertical; font-family: inherit; outline: none; }
    textarea:focus { border-color: var(--lms-purple); }
    .le-actions { display:flex; gap: 8px; justify-content:flex-end; }
    .btn { display:inline-flex; align-items:center; gap:6px; padding: 9px 16px; border-radius: 8px;
      border: none; cursor: pointer; font-weight: 600; font-size: 13px; }
    .btn.primary { background: linear-gradient(135deg, #7C3AED, #3B82F6); color: white; }
    .btn.primary:hover { filter: brightness(1.1); }
    .btn.primary:disabled { opacity: .5; cursor: not-allowed; }
    .btn.ghost { background: var(--lms-surface-2); color: var(--lms-text-2); border: 1px solid var(--lms-border); }
    .btn.ghost:hover { color: var(--lms-purple-2); }
    .btn mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .add-lesson-btn { width: 100%; margin-top: 8px; padding: 9px 12px; border-radius: 8px;
      background: transparent; border: 1px dashed var(--lms-border); color: var(--lms-text-2);
      cursor:pointer; font-size: 13px; display:flex; align-items:center; justify-content:center; gap: 6px; }
    .add-lesson-btn:hover { color: var(--lms-purple-2); border-color: var(--lms-purple); }
    .add-mode { background: var(--lms-surface-2); border: 1px solid var(--lms-purple);
      border-radius: 8px; padding: 12px; margin-top: 8px; }
    .empty { text-align:center; color: var(--lms-text-2); font-size: 13px; padding: 12px 0; margin: 0; }
    .empty-state { text-align:center; padding: 80px 20px; color: var(--lms-text-2); }
    .empty-state mat-icon { font-size: 56px; width: 56px; height: 56px; opacity: .3; }
    .empty-state p { margin: 12px 0 0; }
    .loading { text-align:center; opacity: .6; padding: 60px 0; }
  `],
})
export class CurriculumComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(CourseService);
  private snack = inject(MatSnackBar);

  course = signal<CourseDetail | null>(null);
  loading = signal(true);
  saving = signal(false);
  errorMsg = signal<string | null>(null);

  newSectionTitle = signal('');

  editingSectionId = signal<string | null>(null);
  editingSectionTitle = '';

  editingLessonId = signal<string | null>(null);
  addingLessonInSection = signal<string | null>(null);
  uploadingLessonId = signal<string | null>(null);
  uploadProgress = signal(0);
  pendingFile = signal<File | null>(null);

  draft: DraftLesson = { title: '', duration: '5:00', type: 'Video', description: '', videoUrl: '' };

  formatBytes(b: number): string {
    if (b < 1024) return b + ' B';
    if (b < 1024 * 1024) return (b / 1024).toFixed(0) + ' KB';
    if (b < 1024 * 1024 * 1024) return (b / 1024 / 1024).toFixed(1) + ' MB';
    return (b / 1024 / 1024 / 1024).toFixed(2) + ' GB';
  }

  onNewLessonFilePicked(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const max = 500 * 1024 * 1024;
    if (file.size > max) {
      this.snack.open('File exceeds the 500 MB limit', 'OK', { duration: 3000, panelClass: 'snack-err' });
      return;
    }
    this.pendingFile.set(file);
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.router.navigate(['/instructor']); return; }
    this.load(id);
  }

  totalLessons(): number {
    return (this.course()?.sections ?? []).reduce((sum, s) => sum + s.lessons.length, 0);
  }

  lessonIcon(t: string): string {
    return t === 'Reading' ? 'menu_book' : t === 'Quiz' ? 'quiz' : 'play_circle';
  }

  private load(id: string): void {
    this.loading.set(true);
    this.api.get(id).subscribe({
      next: c => { this.course.set(c); this.loading.set(false); },
      error: (e: { error?: { message?: string }; status?: number }) => {
        this.errorMsg.set(e?.error?.message ?? (e?.status === 404 ? 'Course not found' : 'Could not load course'));
        this.loading.set(false);
      },
    });
  }

  // ── Sections ────────────────────────────────────────────────────────────
  addSection(): void {
    const c = this.course(); if (!c) return;
    const title = this.newSectionTitle().trim(); if (!title) return;
    this.saving.set(true);
    this.api.createSection(c.id, title).subscribe({
      next: (s: CourseSection) => {
        this.course.update(cur => cur ? { ...cur, sections: [...cur.sections, { ...s, lessons: s.lessons ?? [] }] } : cur);
        this.newSectionTitle.set('');
        this.saving.set(false);
        this.snack.open('Section added', 'OK', { duration: 1800, panelClass: 'snack-ok' });
      },
      error: (e) => { this.saving.set(false); this.snack.open(e?.error?.message ?? 'Could not add section', 'OK', { duration: 3000, panelClass: 'snack-err' }); },
    });
  }
  startEditSection(s: CourseSection): void {
    this.editingSectionId.set(s.id); this.editingSectionTitle = s.title;
  }
  cancelSectionEdit(): void { this.editingSectionId.set(null); }
  saveSection(s: CourseSection): void {
    const c = this.course(); if (!c) return;
    const title = this.editingSectionTitle.trim(); if (!title) return;
    this.saving.set(true);
    this.api.updateSection(c.id, s.id, title).subscribe({
      next: () => {
        this.course.update(cur => cur ? { ...cur, sections: cur.sections.map(x => x.id === s.id ? { ...x, title } : x) } : cur);
        this.editingSectionId.set(null); this.saving.set(false);
        this.snack.open('Section saved', 'OK', { duration: 1800, panelClass: 'snack-ok' });
      },
      error: (e) => { this.saving.set(false); this.snack.open(e?.error?.message ?? 'Could not save', 'OK', { duration: 3000, panelClass: 'snack-err' }); },
    });
  }
  deleteSection(s: CourseSection): void {
    const c = this.course(); if (!c) return;
    if (!confirm(`Delete section "${s.title}"? All ${s.lessons.length} lesson(s) inside will also be deleted.`)) return;
    this.api.deleteSection(c.id, s.id).subscribe({
      next: () => {
        this.course.update(cur => cur ? { ...cur, sections: cur.sections.filter(x => x.id !== s.id) } : cur);
        this.snack.open('Section deleted', 'OK', { duration: 1800, panelClass: 'snack-ok' });
      },
      error: (e) => this.snack.open(e?.error?.message ?? 'Could not delete', 'OK', { duration: 3000, panelClass: 'snack-err' }),
    });
  }

  // ── Lessons ─────────────────────────────────────────────────────────────
  startAddLesson(s: CourseSection): void {
    this.addingLessonInSection.set(s.id); this.editingLessonId.set(null);
    this.draft = { sectionId: s.id, title: '', duration: '5:00', type: 'Video', description: '', videoUrl: '' };
    this.pendingFile.set(null);
  }
  startEditLesson(s: CourseSection, l: CourseLesson): void {
    this.editingLessonId.set(l.id); this.addingLessonInSection.set(null);
    this.draft = {
      id: l.id, sectionId: s.id, title: l.title, duration: l.duration, type: l.type,
      description: l.description ?? '', videoUrl: l.videoUrl ?? '',
    };
  }
  cancelLessonEdit(): void {
    this.editingLessonId.set(null); this.addingLessonInSection.set(null);
    this.pendingFile.set(null);
  }

  onFilePicked(s: CourseSection, l: CourseLesson, ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // allow re-pick of same file
    if (!file) return;
    const c = this.course(); if (!c) return;

    const max = 500 * 1024 * 1024;
    if (file.size > max) {
      this.snack.open('File exceeds the 500 MB limit', 'OK', { duration: 3000, panelClass: 'snack-err' });
      return;
    }

    this.uploadingLessonId.set(l.id);
    this.uploadProgress.set(0);

    this.api.uploadLessonVideoWithProgress(c.id, s.id, l.id, file).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          this.uploadProgress.set(Math.round((event.loaded / event.total) * 100));
        } else if (event.type === HttpEventType.Response) {
          const lesson = event.body as CourseLesson | null;
          if (lesson) {
            this.course.update(cur => cur ? {
              ...cur,
              sections: cur.sections.map(x => x.id === s.id
                ? { ...x, lessons: x.lessons.map(le => le.id === l.id ? lesson : le) }
                : x),
            } : cur);
            if (this.editingLessonId() === l.id) this.draft.videoUrl = lesson.videoUrl ?? '';
          }
          this.uploadingLessonId.set(null);
          this.uploadProgress.set(0);
          this.snack.open('Video uploaded', 'OK', { duration: 2000, panelClass: 'snack-ok' });
        }
      },
      error: (e: { error?: { message?: string }; status?: number }) => {
        this.uploadingLessonId.set(null);
        this.uploadProgress.set(0);
        const msg = e?.error?.message ?? (e?.status ? `Upload failed (HTTP ${e.status})` : 'Upload failed');
        this.snack.open(msg, 'OK', { duration: 4000, panelClass: 'snack-err' });
      },
    });
  }

  createLesson(s: CourseSection): void {
    const c = this.course(); if (!c) return;
    const payload: LessonFormPayload = {
      title: this.draft.title.trim(), duration: this.draft.duration.trim() || '0:00',
      type: this.draft.type, description: this.draft.description.trim(),
      videoUrl: this.draft.videoUrl.trim() || null,
    };
    if (!payload.title) return;
    this.saving.set(true);
    this.api.createLesson(c.id, s.id, payload).subscribe({
      next: (l: CourseLesson) => {
        this.course.update(cur => cur ? {
          ...cur,
          sections: cur.sections.map(x => x.id === s.id ? { ...x, lessons: [...x.lessons, l] } : x),
        } : cur);
        this.saving.set(false);

        const file = this.pendingFile();
        if (file) {
          // Chain: upload the pending file to the just-created lesson.
          this.uploadingLessonId.set('__new__');
          this.uploadProgress.set(0);
          this.api.uploadLessonVideoWithProgress(c.id, s.id, l.id, file).subscribe({
            next: (event) => {
              if (event.type === HttpEventType.UploadProgress && event.total) {
                this.uploadProgress.set(Math.round((event.loaded / event.total) * 100));
              } else if (event.type === HttpEventType.Response) {
                const lesson = event.body as CourseLesson | null;
                if (lesson) {
                  this.course.update(cur => cur ? {
                    ...cur,
                    sections: cur.sections.map(x => x.id === s.id
                      ? { ...x, lessons: x.lessons.map(le => le.id === l.id ? lesson : le) }
                      : x),
                  } : cur);
                }
                this.uploadingLessonId.set(null);
                this.uploadProgress.set(0);
                this.pendingFile.set(null);
                this.addingLessonInSection.set(null);
                this.snack.open('Lesson + video added', 'OK', { duration: 2000, panelClass: 'snack-ok' });
              }
            },
            error: (e: { error?: { message?: string } }) => {
              this.uploadingLessonId.set(null);
              this.uploadProgress.set(0);
              this.snack.open(`Lesson saved, but video upload failed: ${e?.error?.message ?? 'unknown'}`, 'OK', { duration: 4000, panelClass: 'snack-err' });
              this.addingLessonInSection.set(null);
            },
          });
        } else {
          this.addingLessonInSection.set(null);
          this.snack.open('Lesson added', 'OK', { duration: 1800, panelClass: 'snack-ok' });
        }
      },
      error: (e) => { this.saving.set(false); this.snack.open(e?.error?.message ?? 'Could not add lesson', 'OK', { duration: 3000, panelClass: 'snack-err' }); },
    });
  }
  saveLesson(s: CourseSection): void {
    const c = this.course(); if (!c || !this.draft.id) return;
    const lessonId = this.draft.id;
    const payload: LessonFormPayload = {
      title: this.draft.title.trim(), duration: this.draft.duration.trim() || '0:00',
      type: this.draft.type, description: this.draft.description.trim(),
      videoUrl: this.draft.videoUrl.trim() || null,
    };
    if (!payload.title) return;
    this.saving.set(true);
    this.api.updateLesson(c.id, s.id, lessonId, payload).subscribe({
      next: (l: CourseLesson) => {
        this.course.update(cur => cur ? {
          ...cur,
          sections: cur.sections.map(x => x.id === s.id
            ? { ...x, lessons: x.lessons.map(le => le.id === lessonId ? l : le) }
            : x),
        } : cur);
        this.editingLessonId.set(null); this.saving.set(false);
        this.snack.open('Lesson saved', 'OK', { duration: 1800, panelClass: 'snack-ok' });
      },
      error: (e) => { this.saving.set(false); this.snack.open(e?.error?.message ?? 'Could not save', 'OK', { duration: 3000, panelClass: 'snack-err' }); },
    });
  }
  deleteLesson(s: CourseSection, l: CourseLesson): void {
    const c = this.course(); if (!c) return;
    if (!confirm(`Delete lesson "${l.title}"?`)) return;
    this.api.deleteLesson(c.id, s.id, l.id).subscribe({
      next: () => {
        this.course.update(cur => cur ? {
          ...cur,
          sections: cur.sections.map(x => x.id === s.id
            ? { ...x, lessons: x.lessons.filter(le => le.id !== l.id) }
            : x),
        } : cur);
        this.snack.open('Lesson deleted', 'OK', { duration: 1800, panelClass: 'snack-ok' });
      },
      error: (e) => this.snack.open(e?.error?.message ?? 'Could not delete', 'OK', { duration: 3000, panelClass: 'snack-err' }),
    });
  }
}
