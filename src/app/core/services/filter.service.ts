import { Injectable, signal, computed } from '@angular/core';
import { GroupBy, User } from '../models/user.model';
import { GroupingRequest } from '../../workers/grouping.logic';

export interface FilterState {
  searchQuery: string;
  filterGender: string;
  filterNat: string;
  filterAgeMin: number;
  filterAgeMax: number;
  groupBy: GroupBy;
}

const INITIAL: FilterState = {
  searchQuery: '',
  filterGender: '',
  filterNat: '',
  filterAgeMin: 0,
  filterAgeMax: 0,
  groupBy: 'letter',
};

@Injectable({ providedIn: 'root' })
export class FilterService {
  readonly state = signal<FilterState>({ ...INITIAL });

  readonly hasActiveFilters = computed(() => {
    const s = this.state();
    return !!(s.searchQuery || s.filterGender || s.filterNat || s.filterAgeMin || s.filterAgeMax);
  });

  update(patch: Partial<FilterState>): void {
    this.state.update(s => ({ ...s, ...patch }));
  }

  reset(): void {
    this.state.set({ ...INITIAL });
  }

  toGroupingRequest(users: User[]): GroupingRequest {
    const s = this.state();
    return { users, ...s };
  }
}
