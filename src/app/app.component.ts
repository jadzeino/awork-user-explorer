import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { ThemeService } from './core/services/theme.service';
import { UsersPageComponent } from './features/users/containers/users-page/users-page.component';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  imports: [UsersPageComponent],
})
export class AppComponent {
  readonly themeService = inject(ThemeService);
}
