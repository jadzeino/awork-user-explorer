import {
  Component, ChangeDetectionStrategy, input, output, computed
} from '@angular/core';
import { User } from '../../../../core/models/user.model';

@Component({
  selector: 'app-user-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './user-item.component.html',
  styleUrl: './user-item.component.scss',
})
export class UserItemComponent {
  readonly user = input.required<User>();
  readonly natCount = input.required<number>();
  readonly isSelected = input(false);

  readonly select = output<User>();

  toggle(): void {
    this.select.emit(this.user());
  }
}
