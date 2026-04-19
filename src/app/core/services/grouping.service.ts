import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, Subject, from } from 'rxjs';
import { GroupingRequest } from '../../workers/grouping.worker';
import { GroupingResult } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class GroupingService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private worker: Worker | null = null;
  private readonly result$ = new Subject<GroupingResult>();

  constructor() {
    if (this.isBrowser && typeof Worker !== 'undefined') {
      this.worker = new Worker(
        new URL('../../workers/grouping.worker', import.meta.url),
        { type: 'module' },
      );
      this.worker.onmessage = ({ data }: MessageEvent<GroupingResult>) => {
        this.result$.next(data);
      };
      this.worker.onerror = err => {
        console.error('[GroupingService] Worker error', err);
      };
    }
  }

  group(req: GroupingRequest): Observable<GroupingResult> {
    if (this.worker) {
      this.worker.postMessage(req);
      return this.result$.asObservable();
    }
    // Synchronous fallback when workers unavailable (SSR / old browsers)
    return from(import('../../workers/grouping.worker').then(() => {
      throw new Error('Worker fallback not supported in this context');
    }));
  }
}
