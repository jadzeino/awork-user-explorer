import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, shareReplay, map, catchError, throwError, tap } from 'rxjs';
import { User } from '../models/user.model';
import { validateAndMapUsers } from '../validation/user.schema';

const API_URL = 'https://randomuser.me/api';
const RESULTS_COUNT = 5000;
const SEED = 'awork';
export const MAX_PAGES = 5;

const SESSION_KEY = (page: number) => `aw-users-p${page}`;

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly cache = new Map<number, Observable<User[]>>();

  getUsers(page = 1): Observable<User[]> {
    const cached = this.cache.get(page);
    if (cached) return cached;

    // Serve from sessionStorage to avoid re-hitting the API on hot-reload / refresh
    const stored = this.readSession(page);
    if (stored) {
      const obs = of(stored).pipe(shareReplay(1));
      this.cache.set(page, obs);
      return obs;
    }

    const url = `${API_URL}?results=${RESULTS_COUNT}&seed=${SEED}&page=${page}`;
    const obs = this.http.get<unknown>(url).pipe(
      map(validateAndMapUsers),
      tap(users => this.writeSession(page, users)),
      catchError(err => {
        console.error('[UsersService] Failed to fetch page', page, err);
        return throwError(() => new Error('Failed to load users. Please try again.'));
      }),
      shareReplay(1),
    );
    this.cache.set(page, obs);
    return obs;
  }

  private readSession(page: number): User[] | null {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY(page));
      return raw ? (JSON.parse(raw) as User[]) : null;
    } catch { return null; }
  }

  private writeSession(page: number, users: User[]): void {
    try { sessionStorage.setItem(SESSION_KEY(page), JSON.stringify(users)); }
    catch { /* quota exceeded — silently skip */ }
  }
}
