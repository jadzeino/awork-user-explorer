import { Injectable } from '@angular/core';
import { EMPTY } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class GroupingService {
  group = jest.fn(() => EMPTY);
}
