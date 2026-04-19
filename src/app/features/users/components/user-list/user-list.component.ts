import {
  Component, ChangeDetectionStrategy, input, computed
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { UserItemComponent } from '../user-item/user-item.component';
import { UserGroup } from '../../../../core/models/user.model';
import { User } from '../../../../core/models/user.model';

/** Flat virtual-scroll row: either a group header or a user row */
export type VirtualRow =
  | { type: 'header'; label: string; count: number }
  | { type: 'user'; user: User; natCount: number };

@Component({
  selector: 'app-user-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, ScrollingModule, UserItemComponent],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.scss',
})
export class UserListComponent {
  readonly groups = input.required<UserGroup[]>();
  readonly totalCount = input.required<number>();

  /** Pre-computed nat counts map from all currently filtered users */
  readonly natCounts = computed<Map<string, number>>(() => {
    const map = new Map<string, number>();
    for (const g of this.groups()) {
      for (const u of g.users) {
        map.set(u.nat, (map.get(u.nat) ?? 0) + 1);
      }
    }
    return map;
  });

  /** Flatten groups into virtual-scroll rows */
  readonly rows = computed<VirtualRow[]>(() => {
    const counts = this.natCounts();
    const rows: VirtualRow[] = [];
    for (const g of this.groups()) {
      rows.push({ type: 'header', label: g.label, count: g.users.length });
      for (const user of g.users) {
        rows.push({ type: 'user', user, natCount: counts.get(user.nat) ?? 0 });
      }
    }
    return rows;
  });

  trackRow(_i: number, row: VirtualRow): string {
    return row.type === 'header' ? `h-${row.label}` : `u-${row.user.id}`;
  }
}
