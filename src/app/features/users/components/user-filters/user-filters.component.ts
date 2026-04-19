import {
  Component, ChangeDetectionStrategy, inject, OnInit, OnDestroy, signal
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';
import { FilterService } from '../../../../core/services/filter.service';
import { GroupBy } from '../../../../core/models/user.model';

const NAT_OPTIONS = [
  'AU','BR','CA','CH','DE','DK','ES','FI','FR','GB',
  'IE','IN','IR','MX','NL','NO','NZ','RS','TR','UA','US',
];

@Component({
  selector: 'app-user-filters',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './user-filters.component.html',
  styleUrl: './user-filters.component.scss',
})
export class UserFiltersComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly filterService = inject(FilterService);
  private readonly destroy$ = new Subject<void>();

  readonly natOptions = NAT_OPTIONS;
  readonly groupByOptions: { value: GroupBy; label: string }[] = [
    { value: 'letter', label: 'By Letter' },
    { value: 'age', label: 'By Age' },
    { value: 'nationality', label: 'By Nationality' },
  ];

  readonly hasActiveFilters = this.filterService.hasActiveFilters;

  form!: FormGroup;

  ngOnInit(): void {
    const s = this.filterService.state();
    this.form = this.fb.group({
      searchQuery: [s.searchQuery],
      filterGender: [s.filterGender],
      filterNat: [s.filterNat],
      filterAgeMin: [s.filterAgeMin || ''],
      filterAgeMax: [s.filterAgeMax || ''],
      groupBy: [s.groupBy],
    });

    this.form.valueChanges.pipe(
      debounceTime(250),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
      takeUntil(this.destroy$),
    ).subscribe(v => {
      this.filterService.update({
        searchQuery: (v.searchQuery as string) ?? '',
        filterGender: (v.filterGender as string) ?? '',
        filterNat: (v.filterNat as string) ?? '',
        filterAgeMin: Number(v.filterAgeMin) || 0,
        filterAgeMax: Number(v.filterAgeMax) || 0,
        groupBy: (v.groupBy as GroupBy) ?? 'letter',
      });
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  clearFilters(): void {
    this.filterService.reset();
    this.form.reset({
      searchQuery: '', filterGender: '', filterNat: '',
      filterAgeMin: '', filterAgeMax: '', groupBy: 'letter',
    }, { emitEvent: false });
  }
}
