import { Injectable, inject, signal } from '@angular/core';
import { FilterService, FilterState } from './filter.service';

export interface SavedFilter {
  id: string;
  name: string;
  state: Partial<FilterState>;
  createdAt: number;
}

const STORAGE_KEY = 'aw-saved-filters';

@Injectable({ providedIn: 'root' })
export class SavedFiltersService {
  private readonly filterService = inject(FilterService);

  readonly saved = signal<SavedFilter[]>(this.load());

  private load(): SavedFilter[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as SavedFilter[]) : [];
    } catch {
      return [];
    }
  }

  private persist(filters: SavedFilter[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch { /* storage full or unavailable */ }
  }

  save(name: string): void {
    const s = this.filterService.state();
    const entry: SavedFilter = {
      id: crypto.randomUUID(),
      name: name.trim() || 'Filter',
      state: {
        searchQuery: s.searchQuery,
        searchFields: s.searchFields,
        filterGender: s.filterGender,
        filterNats: s.filterNats,
        filterAgeMin: s.filterAgeMin,
        filterAgeMax: s.filterAgeMax,
        filterCountry: s.filterCountry,
        filterState: s.filterState,
        filterCity: s.filterCity,
        groupBy: s.groupBy,
        sortBy: s.sortBy,
      },
      createdAt: Date.now(),
    };
    const next = [...this.saved(), entry];
    this.saved.set(next);
    this.persist(next);
  }

  apply(id: string): void {
    const entry = this.saved().find(s => s.id === id);
    if (entry) this.filterService.update(entry.state);
  }

  remove(id: string): void {
    const next = this.saved().filter(s => s.id !== id);
    this.saved.set(next);
    this.persist(next);
  }
}
