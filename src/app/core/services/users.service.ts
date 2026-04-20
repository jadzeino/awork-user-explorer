import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay, map, catchError, throwError } from 'rxjs';
import { User } from '../models/user.model';
import { validateAndMapUsers } from '../validation/user.schema';

const API_URL = 'https://randomuser.me/api';
const RESULTS_COUNT = 5000;
const SEED = 'awork';
export const MAX_PAGES = 5;

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly cache = new Map<number, Observable<User[]>>();

  getUsers(page = 1): Observable<User[]> {
    if (!this.cache.has(page)) {
      const url = `${API_URL}?results=${RESULTS_COUNT}&seed=${SEED}&page=${page}`;
      this.cache.set(page, this.http.get<unknown>(url).pipe(
        map(validateAndMapUsers),
        catchError(err => {
          console.error('[UsersService] Failed to fetch page', page, err);
          return throwError(() => new Error('Failed to load users. Please try again.'));
        }),
        shareReplay(1),
      ));
    }
    return this.cache.get(page)!;
  }
}
