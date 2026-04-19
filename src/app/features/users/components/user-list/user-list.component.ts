import {
  Component, ChangeDetectionStrategy, input, computed, signal
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { UserItemComponent } from '../user-item/user-item.component';
import { UserDetailComponent } from '../user-detail/user-detail.component';
import { UserGroup, User } from '../../../../core/models/user.model';

/** Flat virtual-scroll row — all rows are the same height (56px) */
export type VirtualRow =
  | { type: 'header'; label: string; count: number }
  | { type: 'user'; user: User; natCount: number };

@Component({
  selector: 'app-user-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, ScrollingModule, UserItemComponent, UserDetailComponent],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.scss',
})
export class UserListComponent {
  readonly groups = input.required<UserGroup[]>();
  readonly totalCount = input.required<number>();

  /** Selected user for detail panel (lives outside virtual scroll) */
  readonly selectedUser = signal<User | null>(null);

  /** Pre-computed nat counts across all currently displayed users */
  readonly natCounts = computed<Map<string, number>>(() => {
    const map = new Map<string, number>();
    for (const g of this.groups()) {
      for (const u of g.users) {
        map.set(u.nat, (map.get(u.nat) ?? 0) + 1);
      }
    }
    return map;
  });

  /** Flatten groups into a uniform virtual-scroll row array */
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

  readonly selectedNatCount = computed(() => {
    const u = this.selectedUser();
    if (!u) return 0;
    return this.natCounts().get(u.nat) ?? 0;
  });

  trackRow(_i: number, row: VirtualRow): string {
    return row.type === 'header' ? `h-${row.label}` : `u-${row.user.id}`;
  }

  onUserSelect(user: User): void {
    // Toggle: clicking the same user again closes the panel
    this.selectedUser.update(prev => (prev?.id === user.id ? null : user));
  }

  closeDetail(): void {
    this.selectedUser.set(null);
  }
}
