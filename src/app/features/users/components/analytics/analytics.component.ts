import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { User } from '../../../../core/models/user.model';

@Component({
  selector: 'app-analytics',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './analytics.component.html',
  styleUrl: './analytics.component.scss',
})
export class AnalyticsComponent {
  readonly users = input.required<User[]>();

  readonly RADIUS = 35;
  readonly CIRCUM = 2 * Math.PI * this.RADIUS;

  readonly genderData = computed(() => {
    const users = this.users();
    const total = users.length || 1;
    const female = users.filter(u => u.gender === 'female').length;
    const male = users.filter(u => u.gender === 'male').length;
    const femaleArc = this.CIRCUM * female / total;
    const maleArc = this.CIRCUM * male / total;
    return {
      total: users.length,
      female,
      male,
      femalePercent: Math.round(female / total * 100),
      malePercent: Math.round(male / total * 100),
      femaleArc,
      maleArc,
      maleOffset: -(femaleArc),
      circum: this.CIRCUM,
    };
  });

  readonly ageData = computed(() => {
    const users = this.users();
    const buckets = [
      { label: '<18', min: 0, max: 17 },
      { label: '18–29', min: 18, max: 29 },
      { label: '30–39', min: 30, max: 39 },
      { label: '40–49', min: 40, max: 49 },
      { label: '50–59', min: 50, max: 59 },
      { label: '60+', min: 60, max: 999 },
    ];
    const counts = buckets.map(b => ({
      label: b.label,
      count: users.filter(u => u.age >= b.min && u.age <= b.max).length,
    }));
    const max = Math.max(...counts.map(c => c.count), 1);
    return counts.map(c => ({ ...c, pct: Math.round(c.count / max * 100) }));
  });

  readonly natData = computed(() => {
    const users = this.users();
    const map = new Map<string, number>();
    for (const u of users) map.set(u.nat, (map.get(u.nat) ?? 0) + 1);
    const sorted = [...map.entries()].sort(([, a], [, b]) => b - a).slice(0, 5);
    const max = sorted[0]?.[1] ?? 1;
    return sorted.map(([nat, count]) => ({ nat, count, pct: Math.round(count / max * 100) }));
  });
}
