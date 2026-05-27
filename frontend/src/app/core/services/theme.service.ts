import { Injectable, signal, effect } from '@angular/core';

export type ThemeMode = 'dark' | 'light';

const STORAGE_KEY = 'eduflow-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly mode = signal<ThemeMode>(this.readInitial());

  constructor() {
    effect(() => this.apply(this.mode()));
  }

  toggle(): void {
    this.mode.update(m => m === 'dark' ? 'light' : 'dark');
  }

  private readInitial(): ThemeMode {
    if (typeof window === 'undefined') return 'dark';
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch { /* ignore — quota or privacy mode */ }
    return 'dark';
  }

  private apply(mode: ThemeMode): void {
    if (typeof document === 'undefined') return;
    document.body.classList.toggle('light-mode', mode === 'light');
    try { window.localStorage.setItem(STORAGE_KEY, mode); } catch { /* ignore */ }
  }
}
