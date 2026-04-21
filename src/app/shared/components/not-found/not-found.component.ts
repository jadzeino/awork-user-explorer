import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <div class="not-found">
      <span class="not-found__code">404</span>
      <p class="not-found__msg">Page not found</p>
      <a class="not-found__link" routerLink="/">Go home</a>
    </div>
  `,
  styles: [`
    .not-found {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      gap: 12px;
      color: var(--text-primary);
    }
    .not-found__code {
      font-size: 80px;
      font-weight: 700;
      line-height: 1;
      color: var(--accent-primary);
    }
    .not-found__msg {
      font-size: 18px;
      color: var(--text-muted);
      margin: 0;
    }
    .not-found__link {
      margin-top: 8px;
      padding: 8px 20px;
      background: var(--accent-primary);
      color: #fff;
      border-radius: 6px;
      text-decoration: none;
      font-size: 14px;
      &:hover { background: var(--accent-primary-hover); }
    }
  `],
})
export class NotFoundComponent {}
