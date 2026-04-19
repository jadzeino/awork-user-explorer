import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FilterService, parseNaturalLanguage } from '../../../../core/services/filter.service';

@Component({
  selector: 'app-command-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './command-bar.component.html',
  styleUrl: './command-bar.component.scss',
})
export class CommandBarComponent {
  private readonly filterService = inject(FilterService);

  readonly inputValue = signal('');

  onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.inputValue.set(value);
    if (!value.trim()) {
      this.filterService.reset();
      return;
    }
    this.filterService.update(parseNaturalLanguage(value));
  }

  clear(): void {
    this.inputValue.set('');
    this.filterService.reset();
  }
}
