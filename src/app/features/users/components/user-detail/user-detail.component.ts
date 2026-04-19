import {
  Component, ChangeDetectionStrategy, input, output
} from '@angular/core';
import { animate, style, transition, trigger } from '@angular/animations';
import { User } from '../../../../core/models/user.model';

@Component({
  selector: 'app-user-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './user-detail.component.html',
  styleUrl: './user-detail.component.scss',
  animations: [
    trigger('slideUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(12px)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ opacity: 0, transform: 'translateY(8px)' })),
      ]),
    ]),
  ],
})
export class UserDetailComponent {
  readonly user = input.required<User>();
  readonly natCount = input.required<number>();
  readonly close = output<void>();
}
