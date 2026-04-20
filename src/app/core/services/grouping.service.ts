import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, Subject, take, of, finalize } from 'rxjs';
import { GroupingRequest, runGrouping } from '../../workers/grouping.logic';
import { GroupingResult } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class GroupingService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private worker: Worker | null = null;
  private requestId = 0;
  private readonly pending = new Map<number, Subject<GroupingResult>>();

  constructor() {
    if (this.isBrowser && typeof Worker !== 'undefined') {
      try {
        this.worker = new Worker(
          new URL('../../workers/grouping.worker', import.meta.url),
          { type: 'module' },
        );
        this.worker.onmessage = ({ data }: MessageEvent<GroupingResult & { __id: number }>) => {
          const subject = this.pending.get(data.__id);
          if (subject) {
            subject.next(data);
            subject.complete();
          }
        };
        this.worker.onerror = err => {
          console.error('[GroupingService] Worker error', err);
          this.pending.forEach(s => s.error(err));
          this.pending.clear();
        };
      } catch {
        // Worker construction blocked (e.g. test environment file:// origin) — fall back to sync
        this.worker = null;
      }
    }
  }

  group(req: GroupingRequest): Observable<GroupingResult> {
    if (this.worker) {
      const id = ++this.requestId;
      const response$ = new Subject<GroupingResult>();
      this.pending.set(id, response$);
      this.worker.postMessage({ ...req, __id: id });
      return response$.pipe(
        take(1),
        finalize(() => this.pending.delete(id)),
      );
    }
    return of(runGrouping(req));
  }
}
