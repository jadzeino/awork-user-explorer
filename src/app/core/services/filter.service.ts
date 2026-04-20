import { Injectable, signal, computed } from '@angular/core';
import { GroupBy, SortBy, User } from '../models/user.model';
import { GroupingRequest } from '../../workers/grouping.logic';

export type SearchField = 'name' | 'email' | 'username' | 'phone' | 'city' | 'country';
export type CompareBy = 'gender' | 'nationality' | '';

export interface FilterState {
  searchQuery: string;
  searchFields: SearchField[];
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
  compareMode: boolean;
  compareBy: CompareBy;
  compareA: string;
  compareB: string;
  agentMode: boolean;
}

const INITIAL: FilterState = {
  searchQuery: '',
  searchFields: [],
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
  compareMode: false,
  compareBy: '',
  compareA: '',
  compareB: '',
  agentMode: false,
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

export interface NLParseResult {
  filters: Partial<FilterState>;
  remainder: string;
}

export function parseNaturalLanguage(query: string): NLParseResult {
  const q = query.toLowerCase().trim();
  if (!q) return { filters: {}, remainder: '' };

  const filters: Partial<FilterState> = { nlQuery: query };
  // Mutable working copy — consumed tokens are replaced with spaces
  let w = q;

  // Gender
  const femaleM = w.match(/\b(female|women|woman|girls?)\b/);
  if (femaleM) { filters.filterGender = 'female'; w = w.replace(femaleM[0], ' '); }
  else {
    const maleM = w.match(/\b(male|men|man|guys?)\b/);
    if (maleM) { filters.filterGender = 'male'; w = w.replace(maleM[0], ' '); }
  }

  // Age — longest patterns first to avoid partial overlap
  const betweenM = w.match(/between\s+(\d+)\s+and\s+(\d+)/);
  if (betweenM) {
    filters.filterAgeMin = parseInt(betweenM[1]);
    filters.filterAgeMax = parseInt(betweenM[2]);
    w = w.replace(betweenM[0], ' ');
  }
  const atLeastM = w.match(/at\s+least\s+(\d+)/);
  if (atLeastM) { filters.filterAgeMin = parseInt(atLeastM[1]); w = w.replace(atLeastM[0], ' '); }
  const atMostM = w.match(/at\s+most\s+(\d+)/);
  if (atMostM) { filters.filterAgeMax = parseInt(atMostM[1]); w = w.replace(atMostM[0], ' '); }
  const underM = w.match(/under\s+(\d+)/);
  if (underM) { filters.filterAgeMax = parseInt(underM[1]) - 1; w = w.replace(underM[0], ' '); }
  const overM = w.match(/(?:over|older\s+than)\s+(\d+)/);
  if (overM) { filters.filterAgeMin = parseInt(overM[1]) + 1; w = w.replace(overM[0], ' '); }

  // Nationality — try longer keywords first to avoid "iran" matching inside "iranian"
  const sortedNat = Object.entries(COUNTRY_NAT).sort(([a], [b]) => b.length - a.length);
  for (const [keyword, nat] of sortedNat) {
    if (w.includes(keyword)) {
      filters.filterNats = [nat];
      w = w.replace(keyword, ' ');
      break;
    }
  }

  // Group by
  const groupM = w.match(/grouped?\s+by\s+(age|nat(?:ionality)?|letter|name)/);
  if (groupM) {
    if (groupM[1] === 'age') filters.groupBy = 'age';
    else if (groupM[1].startsWith('nat')) filters.groupBy = 'nationality';
    else filters.groupBy = 'letter';
    w = w.replace(groupM[0], ' ');
  }

  // Sort
  const sortM = w.match(/\b(oldest|most\s+senior|youngest|most\s+junior)\b/);
  if (sortM) {
    filters.sortBy = /oldest|senior/.test(sortM[0]) ? 'age-desc' : 'age-asc';
    w = w.replace(sortM[0], ' ');
  }

  // Strip common stop words so they don't pollute keyword search
  w = w.replace(/\b(users?|people|from|in|the|a|an|and|with|who|are)\b/g, ' ');

  const remainder = w.split(/\s+/).filter(t => t.length > 0).join(' ');

  return { filters, remainder };
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
      s.nlQuery || s.searchFields.length
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
      searchFields: s.searchFields,
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
