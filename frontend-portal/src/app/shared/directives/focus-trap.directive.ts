import {
  Directive,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnInit,
  Output,
  booleanAttribute,
} from '@angular/core';

@Directive({
  selector: '[appFocusTrap]',
  standalone: true,
})
export class FocusTrapDirective implements OnInit {
  @Input({ transform: booleanAttribute }) appFocusTrap = true;
  @Input({ transform: booleanAttribute }) autoFocusFirst = true;
  @Output() escapePressed = new EventEmitter<void>();

  private readonly focusableSelector =
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  constructor(private el: ElementRef<HTMLElement>) {}

  ngOnInit(): void {
    if (this.appFocusTrap && this.autoFocusFirst) {
      setTimeout(() => {
        this.focusFirstElement();
      }, 50);
    }
  }

  @HostListener('keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    if (!this.appFocusTrap) return;

    if (event.key === 'Escape') {
      if (typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
      if (typeof event.stopPropagation === 'function') {
        event.stopPropagation();
      }
      this.escapePressed.emit();
      return;
    }

    if (event.key === 'Tab') {
      const current =
        (event.target as HTMLElement) || (document.activeElement as HTMLElement);
      const trapped = this.trapFocus(event.shiftKey, current);
      if (trapped && typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
    }
  }

  trapFocus(isShift: boolean, currentElement?: HTMLElement | null): boolean {
    const focusableElements = this.getFocusableElements();
    if (focusableElements.length === 0) return false;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    const active = currentElement || (document.activeElement as HTMLElement);

    if (isShift) {
      if (active === firstElement || !this.el.nativeElement.contains(active)) {
        lastElement.focus();
        return true;
      }
    } else {
      if (active === lastElement || !this.el.nativeElement.contains(active)) {
        firstElement.focus();
        return true;
      }
    }
    return false;
  }

  getFocusableElements(): HTMLElement[] {
    const elements = Array.from(
      this.el.nativeElement.querySelectorAll<HTMLElement>(this.focusableSelector)
    );
    return elements.filter((el) => {
      if (typeof window !== 'undefined') {
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') {
          return false;
        }
      }
      return true;
    });
  }

  focusFirstElement(): void {
    const focusable = this.getFocusableElements();
    if (focusable.length > 0) {
      focusable[0].focus();
    }
  }
}
