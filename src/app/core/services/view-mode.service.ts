import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ViewModeService {
  readonly paginationMode = signal(false);

  toggle(): void {
    this.paginationMode.update(v => !v);
  }
}
