import {
  Component, ChangeDetectionStrategy, inject, signal, computed, DestroyRef,
  ElementRef, ViewChild, HostListener
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { switchMap, combineLatest, EMPTY, catchError, distinctUntilChanged, tap, take, shareReplay } from 'rxjs';
import { UsersService, MAX_PAGES } from '../../../../core/services/users.service';
import { GroupingService } from '../../../../core/services/grouping.service';
import { FilterService } from '../../../../core/services/filter.service';
import { ViewModeService } from '../../../../core/services/view-mode.service';
import { UserListComponent } from '../../components/user-list/user-list.component';
import { AnalyticsComponent } from '../../components/analytics/analytics.component';
import { CommandBarComponent } from '../../components/command-bar/command-bar.component';
import { FacetedFiltersComponent } from '../../components/faceted-filters/faceted-filters.component';
import { LocationFilterComponent } from '../../components/location-filter/location-filter.component';
import { CompareModeComponent } from '../../components/compare-mode/compare-mode.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { SavedFiltersComponent } from '../../components/saved-filters/saved-filters.component';
import { UserDetailComponent } from '../../components/user-detail/user-detail.component';
import { AgentModeComponent } from '../../components/agent-mode/agent-mode.component';
import { GroupingResult, User, UserGroup } from '../../../../core/models/user.model';

@Component({
  selector: 'app-users-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UserListComponent, AnalyticsComponent, CommandBarComponent, FacetedFiltersComponent, LocationFilterComponent, CompareModeComponent, SkeletonComponent, SavedFiltersComponent, UserDetailComponent, AgentModeComponent],
  templateUrl: './users-page.component.html',
  styleUrl: './users-page.component.scss',
})
export class UsersPageComponent {
  private readonly usersService = inject(UsersService);
  private readonly groupingService = inject(GroupingService);
  readonly filterService = inject(FilterService);
  readonly viewModeService = inject(ViewModeService);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('filterToggleBtn') private filterToggleBtn?: ElementRef<HTMLButtonElement>;
  @ViewChild('filterDrawer')    private filterDrawer?: ElementRef<HTMLElement>;

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly groups = signal<UserGroup[]>([]);
  readonly totalCount = signal(0);
  readonly allUsers = signal<User[]>([]);
  readonly selectedUser = signal<User | null>(null);
  readonly analyticsOpen = signal(true);
  readonly leftOpen = signal(false);

  readonly currentPage = signal(1);
  readonly maxPages = MAX_PAGES;

  readonly filteredUsers = computed<User[]>(() =>
    this.groups().flatMap(g => g.users)
  );

  readonly selectedNatCount = computed(() => {
    const u = this.selectedUser();
    if (!u) return 0;
    return this.filteredUsers().filter(fu => fu.nat === u.nat).length;
  });

  onUserSelect(user: User): void {
    this.selectedUser.update(prev => prev?.id === user.id ? null : user);
  }

  toggleFilterDrawer(): void {
    const opening = !this.leftOpen();
    this.leftOpen.set(opening);
    if (opening) {
      setTimeout(() => {
        const first = this.filterDrawer?.nativeElement
          .querySelector<HTMLElement>('button, input, select, [tabindex="0"]');
        first?.focus();
      }, 0);
    }
  }

  closeDrawer(): void {
    this.leftOpen.set(false);
    this.filterToggleBtn?.nativeElement.focus();
  }

  @HostListener('document:keydown.escape')
  onDocumentEscape(): void {
    if (this.leftOpen()) this.closeDrawer();
  }

  prevPage(): void { this.currentPage.update(p => Math.max(1, p - 1)); }
  nextPage(): void { this.currentPage.update(p => Math.min(this.maxPages, p + 1)); }

  readonly skeletonRows = Array.from({ length: 12 });

  constructor() {
    const filterState$ = toObservable(this.filterService.state);
    const currentPage$ = toObservable(this.currentPage);
    const paginationMode$ = toObservable(this.viewModeService.paginationMode);

    // Reset to page 1 when leaving pagination mode
    paginationMode$.pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(mode => { if (!mode) this.currentPage.set(1); });

    // Users stream: only re-fetches when page or mode changes (not on filter changes)
    const users$ = combineLatest([currentPage$, paginationMode$]).pipe(
      distinctUntilChanged(([p1, m1], [p2, m2]) => p1 === p2 && m1 === m2),
      tap(() => { this.loading.set(true); this.error.set(null); }),
      switchMap(([page, paginationMode]) =>
        this.usersService.getUsers(paginationMode ? page : 1).pipe(
          catchError(err => {
            this.loading.set(false);
            this.error.set(err instanceof Error ? err.message : 'Failed to load users');
            return EMPTY;
          })
        )
      ),
      shareReplay(1),
    );

    // Always use page 1 for location filter option lists
    users$.pipe(
      take(1),
      catchError(() => EMPTY),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(users => this.allUsers.set(users));

    // Filter pipeline: re-runs on filter changes without re-fetching users
    combineLatest([users$, filterState$]).pipe(
      switchMap(([users, filterState]) =>
        this.groupingService.group({
          users,
          groupBy: filterState.groupBy,
          searchQuery: filterState.searchQuery,
          searchFields: filterState.searchFields,
          filterGender: filterState.filterGender,
          filterNats: filterState.filterNats,
          filterAgeMin: filterState.filterAgeMin,
          filterAgeMax: filterState.filterAgeMax,
          filterCountry: filterState.filterCountry,
          filterState: filterState.filterState,
          filterCity: filterState.filterCity,
          sortBy: filterState.sortBy,
        }).pipe(
          catchError(err => {
            console.error('[UsersPage] Grouping error', err);
            return EMPTY;
          })
        )
      ),
      tap(() => this.loading.set(false)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((result: GroupingResult) => {
      this.groups.set(result.groups);
      this.totalCount.set(result.totalCount);
    });
  }
}
