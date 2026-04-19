import { validateAndMapUsers, mapApiUserToUser } from './user.schema';
import { ApiUserResult } from '../models/api-result.model';

const VALID_USER: ApiUserResult = {
  gender: 'female',
  name: { title: 'Mrs', first: 'Alice', last: 'Smith' },
  email: 'alice@example.com',
  phone: '+1-555-0001',
  picture: {
    medium: 'https://randomuser.me/img/med.jpg',
    large: 'https://randomuser.me/img/lg.jpg',
    thumbnail: 'https://randomuser.me/img/th.jpg',
  },
  nat: 'US',
  login: {
    uuid: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    username: 'alice.smith',
    password: 'pass',
    salt: 'salt',
    md5: 'md5',
    sha1: 'sha1',
    sha256: 'sha256',
  },
  location: {
    street: { number: 1, name: 'Main St' },
    city: 'New York',
    state: 'NY',
    country: 'United States',
    postcode: 10001,
  },
  dob: { date: '1990-01-01T00:00:00Z', age: 34 },
};

describe('validateAndMapUsers', () => {
  it('returns mapped users for valid API response', () => {
    const users = validateAndMapUsers({ results: [VALID_USER], info: { seed: 'awork', results: 1, page: 1 } });
    expect(users.length).toBe(1);
    expect(users[0].firstname).toBe('Alice');
  });

  it('returns empty array for empty results', () => {
    const users = validateAndMapUsers({ results: [], info: { seed: 'awork', results: 0, page: 1 } });
    expect(users.length).toBe(0);
  });

  it('falls back gracefully on invalid schema', () => {
    // Missing required fields — Zod parse will fail but lenient fallback runs
    const bad = { results: [{ name: {}, login: {} }], info: {} };
    expect(() => validateAndMapUsers(bad)).not.toThrow();
  });
});

describe('mapApiUserToUser', () => {
  it('builds correct image URL with uuid', () => {
    const user = mapApiUserToUser(VALID_USER);
    expect(user.image).toContain('?id=a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d');
  });

  it('maps all required fields', () => {
    const user = mapApiUserToUser(VALID_USER);
    expect(user.id).toBe('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d');
    expect(user.gender).toBe('female');
    expect(user.age).toBe(34);
    expect(user.city).toBe('New York');
    expect(user.country).toBe('United States');
    expect(user.username).toBe('alice.smith');
  });
});
