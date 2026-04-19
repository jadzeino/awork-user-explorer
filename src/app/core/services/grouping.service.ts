import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, Subject, take, of } from 'rxjs';
import { GroupingRequest, runGrouping } from '../../workers/grouping.logic';
import { GroupingResult } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class GroupingService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private worker: Worker | null = null;

  /**
   * Tracks the Subject for the most recently posted request.
   * When a new request arrives before the previous one completes, the old Subject
   * is abandoned — switchMap in the caller disposes the previous subscription.
   */
  private pendingResponse: Subject<GroupingResult> | null = null;

  constructor() {
    if (this.isBrowser && typeof Worker !== 'undefined') {
      this.worker = new Worker(
        new URL('../../workers/grouping.worker', import.meta.url),
        { type: 'module' },
      );
      this.worker.onmessage = ({ data }: MessageEvent<GroupingResult>) => {
        this.pendingResponse?.next(data);
        this.pendingResponse?.complete();
        this.pendingResponse = null;
      };
      this.worker.onerror = err => {
        console.error('[GroupingService] Worker error', err);
        this.pendingResponse?.error(err);
        this.pendingResponse = null;
      };
    }
  }

  group(req: GroupingRequest): Observable<GroupingResult> {
    if (this.worker) {
      const response$ = new Subject<GroupingResult>();
      this.pendingResponse = response$;
      this.worker.postMessage(req);
      return response$.pipe(take(1));
    }
    // Synchronous fallback for SSR or environments without Worker support
    return of(runGrouping(req));
  }
}
