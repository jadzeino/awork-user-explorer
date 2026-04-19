import { User, GroupBy, SortBy, UserGroup, GroupingResult } from '../core/models/user.model';
import { SearchField } from '../core/services/filter.service';

export interface GroupingRequest {
  users: User[];
  groupBy: GroupBy;
  searchQuery: string;
  searchFields: SearchField[];
  filterGender: string;
  filterNats: string[];
  filterAgeMin: number;
  filterAgeMax: number;
  filterCountry: string;
  filterState: string;
  filterCity: string;
  sortBy: SortBy | '';
}

function sanitizeQuery(q: string): string {
  return q.replace(/[<>"'&]/g, '').trim().toLowerCase();
}

function filterUsers(users: User[], req: GroupingRequest): User[] {
  const query = sanitizeQuery(req.searchQuery);
  const gender = req.filterGender.toLowerCase();
  const nats = req.filterNats.map(n => n.toUpperCase());

  return users.filter(u => {
    if (gender && u.gender.toLowerCase() !== gender) return false;
    if (nats.length && !nats.includes(u.nat)) return false;
    if (req.filterCountry && u.country !== req.filterCountry) return false;
    if (req.filterState && u.state !== req.filterState) return false;
    if (req.filterCity && u.city !== req.filterCity) return false;
    if (req.filterAgeMin > 0 && u.age < req.filterAgeMin) return false;
    if (req.filterAgeMax > 0 && u.age > req.filterAgeMax) return false;
    if (query) {
      const fields: SearchField[] = req.searchFields.length > 0
        ? req.searchFields
        : ['name', 'email', 'username', 'phone', 'city', 'country'];
      const haystack = fields.map(f => {
        switch (f) {
          case 'name':    return `${u.firstname} ${u.lastname}`;
          case 'email':   return u.email;
          case 'username':return u.username;
          case 'phone':   return u.phone;
          case 'city':    return u.city;
          case 'country': return u.country;
        }
      }).join(' ').toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

function sortUsers(users: User[], sortBy: SortBy | ''): User[] {
  if (!sortBy) return users;
  const copy = [...users];
  switch (sortBy) {
    case 'name':
      return copy.sort((a, b) =>
        a.firstname.localeCompare(b.firstname) || a.lastname.localeCompare(b.lastname));
    case 'age-asc':
      return copy.sort((a, b) => a.age - b.age);
    case 'age-desc':
      return copy.sort((a, b) => b.age - a.age);
    case 'nat':
      return copy.sort((a, b) => a.nat.localeCompare(b.nat));
    default:
      return copy;
  }
}

function groupByLetter(users: User[]): UserGroup[] {
  const map = new Map<string, User[]>();
  for (const u of users) {
    const key = u.firstname[0]?.toUpperCase() ?? '#';
    const arr = map.get(key) ?? [];
    arr.push(u);
    map.set(key, arr);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, grpUsers]) => ({ key, label: key, users: grpUsers }));
}

function groupByAge(users: User[]): UserGroup[] {
  const ranges: Array<{ key: string; label: string; min: number; max: number }> = [
    { key: '18-29', label: '18 – 29', min: 18, max: 29 },
    { key: '30-39', label: '30 – 39', min: 30, max: 39 },
    { key: '40-49', label: '40 – 49', min: 40, max: 49 },
    { key: '50-59', label: '50 – 59', min: 50, max: 59 },
    { key: '60+', label: '60 +', min: 60, max: Infinity },
    { key: 'under-18', label: 'Under 18', min: 0, max: 17 },
  ];

  return ranges
    .map(r => ({ ...r, users: users.filter(u => u.age >= r.min && u.age <= r.max) }))
    .filter(r => r.users.length > 0)
    .map(({ key, label, users: grpUsers }) => ({ key, label, users: grpUsers }));
}

function groupByNationality(users: User[]): UserGroup[] {
  const map = new Map<string, User[]>();
  for (const u of users) {
    const arr = map.get(u.nat) ?? [];
    arr.push(u);
    map.set(u.nat, arr);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, grpUsers]) => ({ key, label: key, users: grpUsers }));
}

export function runGrouping(req: GroupingRequest): GroupingResult {
  const filtered = filterUsers(req.users, req);
  const sorted = sortUsers(filtered, req.sortBy);

  let groups: UserGroup[];
  switch (req.groupBy) {
    case 'letter': groups = groupByLetter(sorted); break;
    case 'age': groups = groupByAge(sorted); break;
    case 'nationality': groups = groupByNationality(sorted); break;
  }

  return { groups, totalCount: filtered.length };
}
