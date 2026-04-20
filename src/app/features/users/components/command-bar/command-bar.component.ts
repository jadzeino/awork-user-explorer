import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { FilterService, SearchField, parseNaturalLanguage } from '../../../../core/services/filter.service';

interface FieldChip {
  key: SearchField;
  label: string;
}

@Component({
  selector: 'app-command-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './command-bar.component.html',
  styleUrl: './command-bar.component.scss',
})
export class CommandBarComponent {
  private readonly filterService = inject(FilterService);

  readonly inputValue = signal('');
  readonly showFieldChips = signal(false);

  readonly FIELD_CHIPS: FieldChip[] = [
    { key: 'name',    label: 'Name' },
    { key: 'email',   label: 'Email' },
    { key: 'username',label: 'Username' },
    { key: 'phone',   label: 'Phone' },
    { key: 'city',    label: 'City' },
    { key: 'country', label: 'Country' },
  ];

  readonly activeFields = computed(() => this.filterService.state().searchFields);

  readonly placeholder = computed(() => {
    const fields = this.activeFields();
    if (fields.length === 0) return 'Search all fields, or try "female users under 30"';
    return `Searching in: ${fields.join(', ')}`;
  });

  onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.inputValue.set(value);
    if (!value.trim()) {
      this.filterService.update({
        searchQuery: '', nlQuery: '', filterGender: '',
        filterNats: [], filterAgeMin: 0, filterAgeMax: 0, filterCity: '',
      });
      return;
    }
    const { filters, remainder } = parseNaturalLanguage(value);
    // remainder contains only unrecognised tokens — used as keyword search
    this.filterService.update({ searchQuery: remainder, ...filters });
  }

  toggleField(field: SearchField): void {
    const current = this.filterService.state().searchFields;
    const next = current.includes(field)
      ? current.filter(f => f !== field)
      : [...current, field];
    this.filterService.update({ searchFields: next });
  }

  toggleFieldChipsPanel(): void {
    this.showFieldChips.update(v => !v);
  }

  clear(): void {
    this.inputValue.set('');
    this.filterService.update({
      searchQuery: '', nlQuery: '', searchFields: [],
      filterGender: '', filterNats: [], filterAgeMin: 0, filterAgeMax: 0, filterCity: '',
    });
    this.showFieldChips.set(false);
  }
}
