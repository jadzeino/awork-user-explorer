import {
  Component, ChangeDetectionStrategy, input, output, computed, signal,
  ViewChild, HostListener, inject
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ScrollingModule, CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { UserItemComponent } from '../user-item/user-item.component';
import { UserGroup, User } from '../../../../core/models/user.model';
import { FilterService } from '../../../../core/services/filter.service';

/** Flat virtual-scroll row — all rows are the same height (56px) */
export type VirtualRow =
  | { type: 'header'; label: string; count: number; collapsed: boolean }
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
  readonly selectedUser = input<User | null>(null);
  readonly userSelect = output<User>();

  @ViewChild(CdkVirtualScrollViewport) viewport!: CdkVirtualScrollViewport;
  private readonly filterService = inject(FilterService);

  /** Set of group labels that are currently collapsed */
  readonly collapsedGroups = signal<Set<string>>(new Set());

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
    const collapsed = this.collapsedGroups();
    const rows: VirtualRow[] = [];
    for (const g of this.groups()) {
      const isCollapsed = collapsed.has(g.label);
      rows.push({ type: 'header', label: g.label, count: g.users.length, collapsed: isCollapsed });
      if (!isCollapsed) {
        for (const user of g.users) {
          rows.push({ type: 'user', user, natCount: counts.get(user.nat) ?? 0 });
        }
      }
    }
    return rows;
  });

  toggleGroup(label: string): void {
    this.collapsedGroups.update(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  readonly isLetterGroupBy = computed(() =>
    this.filterService.state().groupBy === 'letter'
  );

  readonly availableLetters = computed<string[]>(() =>
    this.rows()
      .filter((r): r is Extract<VirtualRow, { type: 'header' }> => r.type === 'header')
      .map(r => r.label)
  );

  scrollToLetter(letter: string): void {
    const idx = this.rows().findIndex(r => r.type === 'header' && r.label === letter);
    if (idx !== -1) {
      this.viewport.scrollToIndex(idx, 'smooth');
    }
  }

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (!this.isLetterGroupBy()) return;
    const letter = event.key.toUpperCase();
    if (/^[A-Z]$/.test(letter) && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const available = this.availableLetters();
      if (available.includes(letter)) {
        event.preventDefault();
        this.scrollToLetter(letter);
      }
    }
  }

  trackRow(_i: number, row: VirtualRow): string {
    return row.type === 'header' ? `h-${row.label}` : `u-${row.user.id}`;
  }

}
