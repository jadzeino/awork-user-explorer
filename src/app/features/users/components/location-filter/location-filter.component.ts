import { Component, ChangeDetectionStrategy, input, computed, inject } from '@angular/core';
import { FilterService } from '../../../../core/services/filter.service';
import { User } from '../../../../core/models/user.model';

@Component({
  selector: 'app-location-filter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './location-filter.component.html',
  styleUrl: './location-filter.component.scss',
})
export class LocationFilterComponent {
  readonly users = input.required<User[]>();
  readonly filterService = inject(FilterService);
  readonly state = this.filterService.state;

  readonly countries = computed(() => {
    const set = new Set(this.users().map(u => u.country).filter(Boolean));
    return [...set].sort();
  });

  readonly states = computed(() => {
    const country = this.state().filterCountry;
    if (!country) return [];
    const set = new Set(
      this.users()
        .filter(u => u.country === country && u.state)
        .map(u => u.state)
    );
    return [...set].sort();
  });

  readonly cities = computed(() => {
    const { filterCountry, filterState } = this.state();
    const set = new Set(
      this.users()
        .filter(u =>
          (!filterCountry || u.country === filterCountry) &&
          (!filterState || u.state === filterState)
        )
        .map(u => u.city)
        .filter(Boolean)
    );
    return [...set].sort();
  });

  readonly hasLocation = computed(() => {
    const s = this.state();
    return !!(s.filterCountry || s.filterState || s.filterCity);
  });

  onCountryChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.filterService.update({ filterCountry: value, filterState: '', filterCity: '' });
  }

  onStateChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.filterService.update({ filterState: value, filterCity: '' });
  }

  onCityInput(event: Event): void {
    if (!(event.target instanceof HTMLInputElement)) return;
    const raw = event.target.value;
    // Accept the value only when it matches a real city (or is empty)
    const value = this.cities().includes(raw) || raw === '' ? raw : this.state().filterCity;
    this.filterService.update({ filterCity: value });
  }

  onCityChange(event: Event): void {
    if (!(event.target instanceof HTMLInputElement)) return;
    const raw = event.target.value;
    this.filterService.update({ filterCity: raw });
  }

  clearLocation(): void {
    this.filterService.update({ filterCountry: '', filterState: '', filterCity: '' });
  }
}
