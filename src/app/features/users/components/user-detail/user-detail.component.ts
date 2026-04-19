import {
  Component, ChangeDetectionStrategy, input, output,
  inject, ElementRef, HostListener
} from '@angular/core';
import { User } from '../../../../core/models/user.model';

@Component({
  selector: 'app-user-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './user-detail.component.html',
  styleUrl: './user-detail.component.scss',
})
export class UserDetailComponent {
  readonly user = input.required<User>();
  readonly natCount = input.required<number>();
  readonly close = output<void>();

  private readonly el = inject(ElementRef<HTMLElement>);

  /** Close when clicking the backdrop (the ::before pseudo-element area) */
  @HostListener('click', ['$event'])
  onHostClick(event: MouseEvent): void {
    const panel = this.el.nativeElement.querySelector('.detail') as HTMLElement;
    if (panel && !panel.contains(event.target as Node)) {
      this.close.emit();
    }
  }

  /** Close on Escape key */
  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close.emit();
  }
}
