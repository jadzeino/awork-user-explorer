import { Component, ChangeDetectionStrategy, input, computed, inject } from '@angular/core';
import { User } from '../../../../core/models/user.model';
import { FilterService } from '../../../../core/services/filter.service';

@Component({
  selector: 'app-analytics',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './analytics.component.html',
  styleUrl: './analytics.component.scss',
})
export class AnalyticsComponent {
  readonly users = input.required<User[]>();
  private readonly filterService = inject(FilterService);

  readonly RADIUS = 42;
  readonly CIRCUM = 2 * Math.PI * this.RADIUS;

  readonly genderData = computed(() => {
    const users = this.users();
    const total = users.length || 1;
    const female = users.filter(u => u.gender === 'female').length;
    const male = users.filter(u => u.gender === 'male').length;
    const other = users.filter(u => u.gender !== 'female' && u.gender !== 'male').length;
    const femaleArc = this.CIRCUM * female / total;
    const maleArc = this.CIRCUM * male / total;
    const otherArc = this.CIRCUM * other / total;
    return {
      total: users.length,
      female, male, other,
      femalePercent: Math.round(female / total * 100),
      malePercent: Math.round(male / total * 100),
      otherPercent: Math.round(other / total * 100),
      femaleArc,
      maleArc,
      otherArc,
      maleOffset: -(femaleArc),
      otherOffset: -(femaleArc + maleArc),
      circum: this.CIRCUM,
    };
  });

  readonly AGE_BUCKETS = [
    { label: '<18',   min: 0,  max: 17  },
    { label: '18–29', min: 18, max: 29  },
    { label: '30–39', min: 30, max: 39  },
    { label: '40–49', min: 40, max: 49  },
    { label: '50–59', min: 50, max: 59  },
    { label: '60+',   min: 60, max: 999 },
  ];

  readonly ageData = computed(() => {
    const users = this.users();
    const counts = this.AGE_BUCKETS.map(b => ({
      ...b,
      count: users.filter(u => u.age >= b.min && u.age <= b.max).length,
    }));
    const maxCount = Math.max(...counts.map(c => c.count), 1);
    return counts.map(c => ({ ...c, pct: Math.round(c.count / maxCount * 100) }));
  });

  readonly natData = computed(() => {
    const users = this.users();
    const map = new Map<string, number>();
    for (const u of users) map.set(u.nat, (map.get(u.nat) ?? 0) + 1);
    const sorted = [...map.entries()].sort(([, a], [, b]) => b - a);
    const top3 = sorted.slice(0, 3);
    const othersCount = sorted.slice(3).reduce((sum, [, c]) => sum + c, 0);
    const rows = top3.map(([nat, count]) => ({ nat, count, isOthers: false }));
    if (othersCount > 0) rows.push({ nat: 'Rest', count: othersCount, isOthers: true });
    const max = rows[0]?.count ?? 1;
    return rows.map(r => ({ ...r, pct: Math.round(r.count / max * 100) }));
  });

  // ── Active-state helpers for visual feedback ─────────
  readonly activeGender = computed(() => this.filterService.state().filterGender);
  readonly activeNats   = computed(() => this.filterService.state().filterNats);
  readonly activeAgeMin = computed(() => this.filterService.state().filterAgeMin);
  readonly activeAgeMax = computed(() => this.filterService.state().filterAgeMax);

  // ── Click handlers ────────────────────────────────────
  clickGender(gender: string): void {
    const current = this.filterService.state().filterGender;
    this.filterService.update({ filterGender: current === gender ? '' : gender });
  }

  clickNat(nat: string): void {
    const current = this.filterService.state().filterNats;
    const next = current.includes(nat) ? current.filter(n => n !== nat) : [...current, nat];
    this.filterService.update({ filterNats: next });
  }

  clickAge(min: number, max: number): void {
    const s = this.filterService.state();
    const isActive = s.filterAgeMin === min && s.filterAgeMax === max;
    this.filterService.update(isActive
      ? { filterAgeMin: 0, filterAgeMax: 0 }
      : { filterAgeMin: min, filterAgeMax: max }
    );
  }
}
