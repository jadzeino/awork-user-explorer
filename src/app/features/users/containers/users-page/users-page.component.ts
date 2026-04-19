import {
  Component, ChangeDetectionStrategy, inject, signal, computed, DestroyRef
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { switchMap, combineLatest, EMPTY, catchError, distinctUntilChanged, tap, take } from 'rxjs';
import { UsersService } from '../../../../core/services/users.service';
import { GroupingService } from '../../../../core/services/grouping.service';
import { FilterService } from '../../../../core/services/filter.service';
import { UserListComponent } from '../../components/user-list/user-list.component';
import { AnalyticsComponent } from '../../components/analytics/analytics.component';
import { CommandBarComponent } from '../../components/command-bar/command-bar.component';
import { FacetedFiltersComponent } from '../../components/faceted-filters/faceted-filters.component';
import { LocationFilterComponent } from '../../components/location-filter/location-filter.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { GroupingResult, User, UserGroup } from '../../../../core/models/user.model';

@Component({
  selector: 'app-users-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UserListComponent, AnalyticsComponent, CommandBarComponent, FacetedFiltersComponent, LocationFilterComponent, SkeletonComponent],
  templateUrl: './users-page.component.html',
  styleUrl: './users-page.component.scss',
})
export class UsersPageComponent {
  private readonly usersService = inject(UsersService);
  private readonly groupingService = inject(GroupingService);
  readonly filterService = inject(FilterService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly groups = signal<UserGroup[]>([]);
  readonly totalCount = signal(0);
  readonly allUsers = signal<User[]>([]);

  readonly filteredUsers = computed<User[]>(() =>
    this.groups().flatMap(g => g.users)
  );

  readonly skeletonRows = Array.from({ length: 12 });

  constructor() {
    const filterState$ = toObservable(this.filterService.state);

    // Capture full unfiltered list once — used for location filter option lists
    this.usersService.getUsers().pipe(
      take(1),
      catchError(() => EMPTY),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(users => this.allUsers.set(users));

    const users$ = this.usersService.getUsers().pipe(
      catchError(err => {
        this.loading.set(false);
        this.error.set((err as Error).message ?? 'Failed to load users');
        return EMPTY;
      }),
    );

    combineLatest([users$, filterState$]).pipe(
      distinctUntilChanged(([u1, f1], [u2, f2]) =>
        u1 === u2 && JSON.stringify(f1) === JSON.stringify(f2)
      ),
      switchMap(([users, filterState]) =>
        this.groupingService.group({
          users,
          groupBy: filterState.groupBy,
          searchQuery: filterState.searchQuery,
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
