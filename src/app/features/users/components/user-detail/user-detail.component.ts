import {
  Component, ChangeDetectionStrategy, input, output,
  inject, ElementRef, HostListener, AfterViewInit
} from '@angular/core';
import { User } from '../../../../core/models/user.model';

@Component({
  selector: 'app-user-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './user-detail.component.html',
  styleUrl: './user-detail.component.scss',
})
export class UserDetailComponent implements AfterViewInit {
  readonly user = input.required<User>();
  readonly natCount = input.required<number>();
  readonly close = output<void>();

  private readonly el = inject(ElementRef<HTMLElement>);

  ngAfterViewInit(): void {
    // Move focus to the close button so keyboard users can dismiss immediately
    const btn = this.el.nativeElement.querySelector('.detail__close') as HTMLElement | null;
    btn?.focus();
  }

  /** Close on Escape key */
  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close.emit();
  }
}
