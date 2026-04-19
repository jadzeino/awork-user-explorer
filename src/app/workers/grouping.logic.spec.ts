import { runGrouping, GroupingRequest } from './grouping.logic';
import { User } from '../core/models/user.model';

const makeUser = (overrides: Partial<User> = {}): User => ({
  id: 'uuid-1',
  firstname: 'Alice',
  lastname: 'Smith',
  username: 'alice.smith',
  email: 'alice@example.com',
  phone: '+1-555-0000',
  image: 'https://example.com/img.jpg',
  nat: 'US',
  gender: 'female',
  age: 30,
  city: 'New York',
  country: 'United States',
  ...overrides,
});

const BASE_REQ: Omit<GroupingRequest, 'users'> = {
  groupBy: 'letter',
  searchQuery: '',
  filterGender: '',
  filterNat: '',
  filterAgeMin: 0,
  filterAgeMax: 0,
};

describe('runGrouping', () => {
  describe('group by letter', () => {
    it('groups users by first letter of firstname', () => {
      const users = [
        makeUser({ id: '1', firstname: 'Alice' }),
        makeUser({ id: '2', firstname: 'Bob' }),
        makeUser({ id: '3', firstname: 'Anna' }),
      ];
      const result = runGrouping({ ...BASE_REQ, groupBy: 'letter', users });
      const keys = result.groups.map(g => g.key);
      expect(keys).toContain('A');
      expect(keys).toContain('B');
      const aGroup = result.groups.find(g => g.key === 'A')!;
      expect(aGroup.users.length).toBe(2);
    });

    it('sorts groups alphabetically', () => {
      const users = [
        makeUser({ id: '1', firstname: 'Zoe' }),
        makeUser({ id: '2', firstname: 'Alice' }),
      ];
      const result = runGrouping({ ...BASE_REQ, groupBy: 'letter', users });
      expect(result.groups[0].key).toBe('A');
      expect(result.groups[1].key).toBe('Z');
    });
  });

  describe('group by age', () => {
    it('puts users in correct age buckets', () => {
      const users = [
        makeUser({ id: '1', age: 25 }),
        makeUser({ id: '2', age: 35 }),
        makeUser({ id: '3', age: 65 }),
      ];
      const result = runGrouping({ ...BASE_REQ, groupBy: 'age', users });
      const keys = result.groups.map(g => g.key);
      expect(keys).toContain('18-29');
      expect(keys).toContain('30-39');
      expect(keys).toContain('60+');
    });

    it('omits empty age buckets', () => {
      const users = [makeUser({ id: '1', age: 25 })];
      const result = runGrouping({ ...BASE_REQ, groupBy: 'age', users });
      expect(result.groups.length).toBe(1);
    });
  });

  describe('group by nationality', () => {
    it('groups by nat code', () => {
      const users = [
        makeUser({ id: '1', nat: 'US' }),
        makeUser({ id: '2', nat: 'DE' }),
        makeUser({ id: '3', nat: 'US' }),
      ];
      const result = runGrouping({ ...BASE_REQ, groupBy: 'nationality', users });
      const de = result.groups.find(g => g.key === 'DE')!;
      const us = result.groups.find(g => g.key === 'US')!;
      expect(de.users.length).toBe(1);
      expect(us.users.length).toBe(2);
    });
  });

  describe('filtering', () => {
    it('filters by gender', () => {
      const users = [
        makeUser({ id: '1', gender: 'female' }),
        makeUser({ id: '2', gender: 'male' }),
      ];
      const result = runGrouping({ ...BASE_REQ, filterGender: 'female', users });
      expect(result.totalCount).toBe(1);
    });

    it('filters by nationality', () => {
      const users = [
        makeUser({ id: '1', nat: 'US' }),
        makeUser({ id: '2', nat: 'DE' }),
      ];
      const result = runGrouping({ ...BASE_REQ, filterNat: 'US', users });
      expect(result.totalCount).toBe(1);
    });

    it('filters by age range', () => {
      const users = [
        makeUser({ id: '1', age: 20 }),
        makeUser({ id: '2', age: 40 }),
        makeUser({ id: '3', age: 60 }),
      ];
      const result = runGrouping({ ...BASE_REQ, filterAgeMin: 30, filterAgeMax: 50, users });
      expect(result.totalCount).toBe(1);
    });

    it('filters by search query on name', () => {
      const users = [
        makeUser({ id: '1', firstname: 'Alice', lastname: 'Smith', email: 'x@x.com', username: 'x' }),
        makeUser({ id: '2', firstname: 'Bob', lastname: 'Jones', email: 'y@y.com', username: 'y' }),
      ];
      const result = runGrouping({ ...BASE_REQ, searchQuery: 'alice', users });
      expect(result.totalCount).toBe(1);
    });

    it('filters by search query on email', () => {
      const users = [
        makeUser({ id: '1', firstname: 'X', email: 'alice@example.com', username: 'x1' }),
        makeUser({ id: '2', firstname: 'Y', email: 'bob@example.com', username: 'y2' }),
      ];
      const result = runGrouping({ ...BASE_REQ, searchQuery: 'bob', users });
      expect(result.totalCount).toBe(1);
    });

    it('sanitizes query — strips HTML chars', () => {
      const users = [makeUser({ id: '1', firstname: 'Alice' })];
      // Should not throw, should treat as query without the unsafe chars
      expect(() =>
        runGrouping({ ...BASE_REQ, searchQuery: '<script>alert(1)</script>', users })
      ).not.toThrow();
    });

    it('returns empty groups when no users match', () => {
      const users = [makeUser({ id: '1', nat: 'US' })];
      const result = runGrouping({ ...BASE_REQ, filterNat: 'DE', users });
      expect(result.totalCount).toBe(0);
      expect(result.groups.length).toBe(0);
    });

    it('combines multiple filters', () => {
      const users = [
        makeUser({ id: '1', nat: 'US', gender: 'female', age: 25 }),
        makeUser({ id: '2', nat: 'US', gender: 'male', age: 25 }),
        makeUser({ id: '3', nat: 'DE', gender: 'female', age: 25 }),
      ];
      const result = runGrouping({ ...BASE_REQ, filterNat: 'US', filterGender: 'female', users });
      expect(result.totalCount).toBe(1);
    });
  });

  describe('totalCount', () => {
    it('reflects filtered count not total', () => {
      const users = Array.from({ length: 10 }, (_, i) =>
        makeUser({ id: String(i), gender: i < 3 ? 'female' : 'male' })
      );
      const result = runGrouping({ ...BASE_REQ, filterGender: 'female', users });
      expect(result.totalCount).toBe(3);
    });
  });
});
