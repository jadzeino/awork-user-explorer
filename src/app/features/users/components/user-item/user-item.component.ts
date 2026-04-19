import {
  Component, ChangeDetectionStrategy, input, signal, computed
} from '@angular/core';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { User } from '../../../../core/models/user.model';

@Component({
  selector: 'app-user-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './user-item.component.html',
  styleUrl: './user-item.component.scss',
  animations: [
    trigger('expandCollapse', [
      state('collapsed', style({ height: '0', opacity: 0, overflow: 'hidden' })),
      state('expanded', style({ height: '*', opacity: 1, overflow: 'hidden' })),
      transition('collapsed <=> expanded', animate('200ms ease-in-out')),
    ]),
  ],
})
export class UserItemComponent {
  readonly user = input.required<User>();
  readonly natCount = input.required<number>();

  readonly expanded = signal(false);

  readonly animState = computed(() => this.expanded() ? 'expanded' : 'collapsed');

  toggle(): void {
    this.expanded.update(v => !v);
  }
}
