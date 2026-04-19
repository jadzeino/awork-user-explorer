import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { User } from '../../../../core/models/user.model';

@Component({
  selector: 'app-user-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './user-detail.component.html',
  styleUrl: './user-detail.component.scss',
})
export class UserDetailComponent {
  readonly user = input.required<User>();
  readonly natCount = input.required<number>();
  readonly close = output<void>();
}
