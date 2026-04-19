import { Injectable, signal, computed } from '@angular/core';
import { GroupBy, SortBy, User } from '../models/user.model';
import { GroupingRequest } from '../../workers/grouping.logic';

export interface FilterState {
  searchQuery: string;
  filterGender: string;
  filterNats: string[];
  filterAgeMin: number;
  filterAgeMax: number;
  filterCountry: string;
  filterState: string;
  filterCity: string;
  groupBy: GroupBy;
  sortBy: SortBy | '';
  nlQuery: string;
}

const INITIAL: FilterState = {
  searchQuery: '',
  filterGender: '',
  filterNats: [],
  filterAgeMin: 0,
  filterAgeMax: 0,
  filterCountry: '',
  filterState: '',
  filterCity: '',
  groupBy: 'letter',
  sortBy: '',
  nlQuery: '',
};

const COUNTRY_NAT: Record<string, string> = {
  'german': 'DE', 'germany': 'DE',
  'american': 'US', 'united states': 'US', 'usa': 'US',
  'french': 'FR', 'france': 'FR',
  'british': 'GB', 'uk': 'GB', 'england': 'GB',
  'spanish': 'ES', 'spain': 'ES',
  'australian': 'AU', 'australia': 'AU',
  'canadian': 'CA', 'canada': 'CA',
  'dutch': 'NL', 'netherlands': 'NL', 'holland': 'NL',
  'danish': 'DK', 'denmark': 'DK',
  'finnish': 'FI', 'finland': 'FI',
  'norwegian': 'NO', 'norway': 'NO',
  'swedish': 'SE', 'sweden': 'SE',
  'turkish': 'TR', 'turkey': 'TR',
  'swiss': 'CH', 'switzerland': 'CH',
  'mexican': 'MX', 'mexico': 'MX',
  'brazilian': 'BR', 'brazil': 'BR',
  'irish': 'IE', 'ireland': 'IE',
  'new zealand': 'NZ', 'kiwi': 'NZ',
  'serbian': 'RS', 'serbia': 'RS',
  'iranian': 'IR', 'iran': 'IR',
  'indian': 'IN', 'india': 'IN',
  'ukrainian': 'UA', 'ukraine': 'UA',
};

export function parseNaturalLanguage(query: string): Partial<FilterState> {
  const q = query.toLowerCase().trim();
  if (!q) return {};
  const result: Partial<FilterState> = { nlQuery: query };

  if (/\bfemale\b|\bwomen\b|\bwoman\b|\bgirls?\b/.test(q)) result.filterGender = 'female';
  else if (/\bmale\b|\bmen\b|\bman\b|\bguys?\b/.test(q)) result.filterGender = 'male';

  const underMatch = q.match(/under\s+(\d+)/);
  if (underMatch) result.filterAgeMax = parseInt(underMatch[1]) - 1;

  const overMatch = q.match(/over\s+(\d+)|older than\s+(\d+)/);
  if (overMatch) result.filterAgeMin = parseInt(overMatch[1] ?? overMatch[2]) + 1;

  const atLeast = q.match(/at least\s+(\d+)/);
  if (atLeast) result.filterAgeMin = parseInt(atLeast[1]);

  const atMost = q.match(/at most\s+(\d+)/);
  if (atMost) result.filterAgeMax = parseInt(atMost[1]);

  const between = q.match(/between\s+(\d+)\s+and\s+(\d+)/);
  if (between) {
    result.filterAgeMin = parseInt(between[1]);
    result.filterAgeMax = parseInt(between[2]);
  }

  for (const [keyword, nat] of Object.entries(COUNTRY_NAT)) {
    if (q.includes(keyword)) {
      result.filterNats = [nat];
      break;
    }
  }

  if (/grouped?\s+by\s+age|by\s+age/.test(q)) result.groupBy = 'age';
  else if (/grouped?\s+by\s+nat|by\s+nationality/.test(q)) result.groupBy = 'nationality';
  else if (/grouped?\s+by\s+letter|by\s+name/.test(q)) result.groupBy = 'letter';

  if (/oldest|most senior/.test(q)) result.sortBy = 'age-desc';
  else if (/youngest|most junior/.test(q)) result.sortBy = 'age-asc';

  return result;
}

@Injectable({ providedIn: 'root' })
export class FilterService {
  readonly state = signal<FilterState>({ ...INITIAL });

  readonly hasActiveFilters = computed(() => {
    const s = this.state();
    return !!(
      s.searchQuery || s.filterGender || s.filterNats.length ||
      s.filterAgeMin || s.filterAgeMax ||
      s.filterCountry || s.filterState || s.filterCity ||
      s.nlQuery
    );
  });

  update(patch: Partial<FilterState>): void {
    this.state.update(s => ({ ...s, ...patch }));
  }

  reset(): void {
    this.state.set({ ...INITIAL });
  }

  toGroupingRequest(users: User[]): GroupingRequest {
    const s = this.state();
    return {
      users,
      groupBy: s.groupBy,
      searchQuery: s.searchQuery,
      filterGender: s.filterGender,
      filterNats: s.filterNats,
      filterAgeMin: s.filterAgeMin,
      filterAgeMax: s.filterAgeMax,
      filterCountry: s.filterCountry,
      filterState: s.filterState,
      filterCity: s.filterCity,
      sortBy: s.sortBy,
    };
  }
}
