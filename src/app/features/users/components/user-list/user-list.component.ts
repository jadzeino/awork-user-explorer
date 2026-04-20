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

  readonly collapsedGroups = signal<Set<string>>(new Set());
  readonly letterJumpValue = signal('');

  readonly natCounts = computed<Map<string, number>>(() => {
    const map = new Map<string, number>();
    for (const g of this.groups()) {
      for (const u of g.users) {
        map.set(u.nat, (map.get(u.nat) ?? 0) + 1);
      }
    }
    return map;
  });

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

  readonly hasActiveFilters = this.filterService.hasActiveFilters;

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

  onLetterInput(event: Event): void {
    if (!(event.target instanceof HTMLInputElement)) return;
    const val = event.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 1);
    event.target.value = val;
    this.letterJumpValue.set(val);
    this.applyLetterJump(val);
  }

  private applyLetterJump(letter: string): void {
    if (!letter) { this.clearLetterJump(); return; }
    const available = this.availableLetters();
    if (!available.includes(letter)) return;
    // Collapse every group except the target letter
    this.collapsedGroups.set(new Set(available.filter(l => l !== letter)));
    // Wait for the row array to reflect the new collapse state before scrolling
    requestAnimationFrame(() => this.scrollToLetter(letter));
  }

  clearLetterJump(): void {
    this.letterJumpValue.set('');
    this.collapsedGroups.set(new Set());
  }

  resetAll(): void {
    this.filterService.reset();
    this.collapsedGroups.set(new Set());
    this.letterJumpValue.set('');
  }

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (!this.isLetterGroupBy()) return;
    const letter = event.key.toUpperCase();
    if (/^[A-Z]$/.test(letter) && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const available = this.availableLetters();
      if (available.includes(letter)) {
        event.preventDefault();
        this.letterJumpValue.set(letter);
        this.applyLetterJump(letter);
      }
    }
  }

  trackRow(_i: number, row: VirtualRow): string {
    return row.type === 'header' ? `h-${row.label}` : `u-${row.user.id}`;
  }
}
