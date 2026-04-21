import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { FilterService } from '../../../../core/services/filter.service';
import { GroupBy, SortBy } from '../../../../core/models/user.model';

@Component({
  selector: 'app-faceted-filters',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './faceted-filters.component.html',
  styleUrl: './faceted-filters.component.scss',
})
export class FacetedFiltersComponent {
  readonly filterService = inject(FilterService);
  readonly state = this.filterService.state;

  readonly NAT_CODES = [
    'AU','BR','CA','CH','DE','DK','ES','FI',
    'FR','GB','IE','IN','IR','MX','NL','NO',
    'NZ','RS','TR','UA','US',
  ];

  readonly GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
    { value: 'letter', label: 'A–Z' },
    { value: 'age', label: 'Age' },
    { value: 'nationality', label: 'Country' },
  ];

  readonly SORT_OPTIONS: { value: SortBy | ''; label: string }[] = [
    { value: '',         label: 'Default' },
    { value: 'name',     label: 'Name' },
    { value: 'age-asc',  label: 'Age ↑' },
    { value: 'age-desc', label: 'Age ↓' },
  ];

  readonly AGE_MIN = 18;
  readonly AGE_MAX = 80;

  readonly displayAgeMin = computed(() => this.state().filterAgeMin || this.AGE_MIN);
  readonly displayAgeMax = computed(() => this.state().filterAgeMax || this.AGE_MAX);

  readonly fillLeft = computed(() => {
    const pct = (this.displayAgeMin() - this.AGE_MIN) / (this.AGE_MAX - this.AGE_MIN) * 100;
    return `${pct}%`;
  });

  readonly fillRight = computed(() => {
    const pct = (this.AGE_MAX - this.displayAgeMax()) / (this.AGE_MAX - this.AGE_MIN) * 100;
    return `${pct}%`;
  });

  readonly ageLabel = computed(() => {
    const min = this.displayAgeMin();
    const max = this.displayAgeMax();
    const hasFilter = this.state().filterAgeMin > 0 || this.state().filterAgeMax > 0;
    if (!hasFilter) return 'Any age';
    return `${min} – ${max}`;
  });

  setGender(gender: string): void {
    this.filterService.update({ filterGender: gender });
  }

  toggleNat(nat: string): void {
    const current = this.state().filterNats;
    const next = current.includes(nat)
      ? current.filter(n => n !== nat)
      : [...current, nat];
    this.filterService.update({ filterNats: next });
  }

  setGroupBy(groupBy: GroupBy): void {
    this.filterService.update({ groupBy });
  }

  setSortBy(sortBy: SortBy | ''): void {
    this.filterService.update({ sortBy });
  }

  onAgeMinInput(event: Event): void {
    if (!(event.target instanceof HTMLInputElement)) return;
    const value = parseInt(event.target.value, 10);
    if (isNaN(value)) return;
    const max = this.displayAgeMax();
    this.filterService.update({ filterAgeMin: Math.min(value, max - 1) });
  }

  onAgeMaxInput(event: Event): void {
    if (!(event.target instanceof HTMLInputElement)) return;
    const value = parseInt(event.target.value, 10);
    if (isNaN(value)) return;
    const min = this.displayAgeMin();
    this.filterService.update({ filterAgeMax: Math.max(value, min + 1) });
  }
}
