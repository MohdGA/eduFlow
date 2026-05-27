import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

type LegalDoc = 'Terms of Service' | 'Privacy Policy';

@Component({
  selector: 'app-legal-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatIconModule],
  template: `
    <div class="legal-wrap">
      <header class="legal-head">
        <h2>{{ data.doc }}</h2>
        <button class="close" (click)="ref.close()" aria-label="Close"><mat-icon>close</mat-icon></button>
      </header>
      <div class="legal-body">
        <p class="updated">Last updated: {{ updated }}</p>
        <div [innerHTML]="body()"></div>
      </div>
      <footer class="legal-foot">
        <button class="btn" (click)="ref.close()">Close</button>
      </footer>
    </div>
  `,
  styles: [`
    :host { display:block; max-width: 720px; }
    .legal-wrap { background: var(--lms-surface, #1a1a2e); color: var(--lms-text, #fff);
      border-radius: 12px; overflow: hidden; max-height: 80vh; display: flex; flex-direction: column; }
    .legal-head { display:flex; align-items:center; justify-content:space-between;
      padding: 18px 24px; border-bottom: 1px solid var(--lms-border, rgba(255,255,255,0.1)); }
    .legal-head h2 { margin: 0; font-size: 20px; font-weight: 700; }
    .close { background:none; border:none; cursor:pointer; color: inherit;
      width: 36px; height: 36px; border-radius: 50%; display:flex; align-items:center; justify-content:center; }
    .close:hover { background: rgba(255,255,255,0.06); }
    .legal-body { padding: 20px 24px; overflow-y: auto; line-height: 1.6; font-size: 14px; }
    .legal-body :is(h3) { margin: 18px 0 8px; font-size: 15px; font-weight: 700; }
    .legal-body :is(p, ul) { margin: 6px 0; color: var(--lms-text-2, rgba(255,255,255,0.8)); }
    .legal-body ul { padding-left: 22px; }
    .updated { font-size: 12px; opacity: 0.6; }
    .legal-foot { display:flex; justify-content:flex-end; padding: 14px 24px;
      border-top: 1px solid var(--lms-border, rgba(255,255,255,0.1)); }
    .btn { padding: 9px 18px; border-radius: 8px; border: none; cursor: pointer;
      background: linear-gradient(135deg, #7C3AED, #3B82F6); color: white; font-weight: 600; }
    .btn:hover { filter: brightness(1.1); }
  `],
})
export class LegalDialogComponent {
  updated = 'May 2026';
  constructor(
    public ref: MatDialogRef<LegalDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { doc: LegalDoc },
  ) {}
  body(): string {
    return this.data.doc === 'Terms of Service' ? this.terms() : this.privacy();
  }
  private terms(): string {
    return `
      <p>Welcome to EduFlow. By creating an account you agree to the following terms.</p>
      <h3>1. Accounts</h3>
      <p>You are responsible for keeping your credentials secure and for any activity on your account. You must be at least 13 years old to register.</p>
      <h3>2. Acceptable use</h3>
      <ul>
        <li>Do not share paid course content outside the platform.</li>
        <li>Do not abuse, harass, or attempt to impersonate other users or instructors.</li>
        <li>Do not attempt to circumvent platform security or scraping protections.</li>
      </ul>
      <h3>3. Purchases &amp; refunds</h3>
      <p>Eligible courses include a 30-day money-back guarantee from purchase date provided less than 30% of the course has been consumed.</p>
      <h3>4. Intellectual property</h3>
      <p>Course materials remain the property of their respective instructors. EduFlow grants you a personal, non-transferable license to access them while your account is active.</p>
      <h3>5. Termination</h3>
      <p>We may suspend or terminate accounts that violate these terms. You may close your account at any time from Settings.</p>
      <h3>6. Disclaimer</h3>
      <p>Courses are provided "as is" without warranty. EduFlow is not liable for indirect or consequential damages arising from use of the service.</p>
      <h3>7. Changes</h3>
      <p>We may update these terms; continued use after changes constitutes acceptance.</p>
      <p>Questions: <strong>legal@eduflow.example</strong></p>
    `;
  }
  private privacy(): string {
    return `
      <p>This Privacy Policy describes what data EduFlow collects, why, and how we protect it.</p>
      <h3>1. What we collect</h3>
      <ul>
        <li><strong>Account data</strong> — name, email, role, hashed password.</li>
        <li><strong>Learning data</strong> — courses enrolled, progress, bookmarks, notes.</li>
        <li><strong>Usage data</strong> — pages viewed, device type, approximate location (from IP).</li>
      </ul>
      <h3>2. How we use it</h3>
      <p>Operate the service, personalize recommendations, send transactional emails, prevent abuse, and improve features through aggregated analytics.</p>
      <h3>3. Sharing</h3>
      <p>We do <strong>not</strong> sell personal data. We share data only with sub-processors who provide hosting, payments, and analytics, under contracts requiring confidentiality.</p>
      <h3>4. Your rights</h3>
      <ul>
        <li>Access &amp; export your data.</li>
        <li>Correct inaccurate data from Settings.</li>
        <li>Delete your account permanently from the admin panel or by emailing privacy@eduflow.example.</li>
      </ul>
      <h3>5. Security</h3>
      <p>Passwords are stored with bcrypt (work factor 12). Connections are encrypted in transit (TLS 1.2+). Audit logs record administrative actions.</p>
      <h3>6. Cookies</h3>
      <p>We use a single session token (JWT) stored in localStorage; we do not use cross-site tracking cookies.</p>
      <h3>7. Contact</h3>
      <p><strong>privacy@eduflow.example</strong></p>
    `;
  }
}
