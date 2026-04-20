import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { SavedFiltersService } from '../../../../core/services/saved-filters.service';
import { FilterService } from '../../../../core/services/filter.service';

@Component({
  selector: 'app-saved-filters',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './saved-filters.component.html',
  styleUrl: './saved-filters.component.scss',
})
export class SavedFiltersComponent {
  readonly savedFiltersService = inject(SavedFiltersService);
  private readonly filterService = inject(FilterService);

  readonly hasActiveFilters = this.filterService.hasActiveFilters;
  readonly showNameInput = signal(false);
  readonly nameInput = signal('');

  startSave(): void {
    this.showNameInput.set(true);
    this.nameInput.set('');
  }

  confirmSave(): void {
    const name = this.nameInput().trim();
    if (!name) return;
    this.savedFiltersService.save(name);
    this.showNameInput.set(false);
    this.nameInput.set('');
  }

  cancelSave(): void {
    this.showNameInput.set(false);
    this.nameInput.set('');
  }

  onNameKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') this.confirmSave();
    if (event.key === 'Escape') this.cancelSave();
  }
}
