import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { UsersService } from './users.service';

const MOCK_API_RESPONSE = {
  results: [
    {
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
    },
  ],
  info: { seed: 'awork', results: 1, page: 1 },
};

describe('UsersService', () => {
  let service: UsersService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(UsersService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('maps API response to User[]', () => {
    service.getUsers().subscribe(users => {
      expect(users.length).toBe(1);
      const u = users[0];
      expect(u.firstname).toBe('Alice');
      expect(u.lastname).toBe('Smith');
      expect(u.email).toBe('alice@example.com');
      expect(u.nat).toBe('US');
      expect(u.age).toBe(34);
      expect(u.city).toBe('New York');
      expect(u.id).toBe('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d');
    });

    const req = http.expectOne(r => r.url.includes('randomuser.me/api'));
    req.flush(MOCK_API_RESPONSE);
  });

  it('makes exactly one HTTP request when getUsers() is called multiple times', () => {
    let count = 0;
    // Subscribe twice — shareReplay(1) should serve both from the same HTTP call
    service.getUsers().subscribe(() => count++);
    service.getUsers().subscribe(() => count++);

    const req = http.expectOne(r => r.url.includes('randomuser.me/api'));
    req.flush(MOCK_API_RESPONSE);
    // Both subscribers received data from a single HTTP request
    expect(count).toBe(2);
  });

  it('image URL includes uuid to prevent caching', () => {
    service.getUsers().subscribe(users => {
      expect(users[0].image).toContain('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d');
    });
    http.expectOne(r => r.url.includes('randomuser.me/api')).flush(MOCK_API_RESPONSE);
  });
});
