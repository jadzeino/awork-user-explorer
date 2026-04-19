import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay, map, catchError, throwError } from 'rxjs';
import { User } from '../models/user.model';
import { validateAndMapUsers } from '../validation/user.schema';

const API_URL = 'https://randomuser.me/api';
const RESULTS_COUNT = 5000;
const SEED = 'awork';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);

  private readonly users$: Observable<User[]> = this.http
    .get<unknown>(`${API_URL}?results=${RESULTS_COUNT}&seed=${SEED}`)
    .pipe(
      map(validateAndMapUsers),
      catchError(err => {
        console.error('[UsersService] Failed to fetch users', err);
        return throwError(() => new Error('Failed to load users. Please try again.'));
      }),
      shareReplay(1),
    );

  getUsers(): Observable<User[]> {
    return this.users$;
  }
}
