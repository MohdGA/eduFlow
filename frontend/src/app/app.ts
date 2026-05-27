import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PageLoaderComponent } from './shared/page-loader.component';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, PageLoaderComponent],
  template: `
    <app-page-loader />
    <router-outlet />
  `,
  styles: [':host { display:block; min-height:100vh; }'],
})
export class App {
  // Eagerly init theme service so it applies saved preference before first paint
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private readonly theme = inject(ThemeService);
}
