import { Component, ChangeDetectionStrategy, input, computed, inject } from '@angular/core';
import { FilterService, CompareBy } from '../../../../core/services/filter.service';
import { User } from '../../../../core/models/user.model';
import { AnalyticsComponent } from '../analytics/analytics.component';

@Component({
  selector: 'app-compare-mode',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AnalyticsComponent],
  templateUrl: './compare-mode.component.html',
  styleUrl: './compare-mode.component.scss',
})
export class CompareModeComponent {
  readonly users = input.required<User[]>();
  private readonly filterService = inject(FilterService);
  readonly state = this.filterService.state;

  readonly COMPARE_OPTIONS: { value: CompareBy; label: string }[] = [
    { value: 'gender',      label: 'Gender' },
    { value: 'nationality', label: 'Nationality' },
  ];

  readonly countries = computed(() => {
    const set = new Set(this.users().map(u => u.country).filter(Boolean));
    return [...set].sort();
  });

  /** Default segment labels when compareBy is set but no explicit choice made */
  readonly labelA = computed(() => {
    const { compareBy, compareA } = this.state();
    if (compareA) return compareA;
    return compareBy === 'gender' ? 'Female' : 'Group A';
  });

  readonly labelB = computed(() => {
    const { compareBy, compareB } = this.state();
    if (compareB) return compareB;
    return compareBy === 'gender' ? 'Male' : 'Group B';
  });

  readonly groupAUsers = computed(() => {
    const { compareBy, compareA } = this.state();
    const users = this.users();
    if (compareBy === 'gender') {
      const g = compareA || 'female';
      return users.filter(u => u.gender === g);
    }
    if (compareBy === 'nationality' && compareA) {
      return users.filter(u => u.country === compareA);
    }
    return [];
  });

  readonly groupBUsers = computed(() => {
    const { compareBy, compareB } = this.state();
    const users = this.users();
    if (compareBy === 'gender') {
      const g = compareB || 'male';
      return users.filter(u => u.gender === g);
    }
    if (compareBy === 'nationality' && compareB) {
      return users.filter(u => u.country === compareB);
    }
    return [];
  });

  setCompareBy(value: CompareBy): void {
    if (value === 'gender') {
      this.filterService.update({ compareBy: value, compareA: 'female', compareB: 'male' });
    } else {
      this.filterService.update({ compareBy: value, compareA: '', compareB: '' });
    }
  }

  onSegmentChange(side: 'A' | 'B', event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (side === 'A') this.filterService.update({ compareA: value });
    else this.filterService.update({ compareB: value });
  }
}
