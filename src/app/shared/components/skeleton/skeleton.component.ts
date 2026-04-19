import { Component, input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="skeleton"
      [class.skeleton--circle]="shape() === 'circle'"
      [style.width]="width()"
      [style.height]="height()"
      role="status"
      aria-label="Loading…"
    ></div>
  `,
  styles: [`
    .skeleton {
      background: linear-gradient(90deg, var(--skeleton-base) 25%, var(--skeleton-highlight) 50%, var(--skeleton-base) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.4s infinite;
      border-radius: 4px;
      display: inline-block;
    }
    .skeleton--circle { border-radius: 50%; }
    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `],
})
export class SkeletonComponent {
  width = input('100%');
  height = input('16px');
  shape = input<'rect' | 'circle'>('rect');
}
