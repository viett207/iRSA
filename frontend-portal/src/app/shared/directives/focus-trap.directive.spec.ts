import { Component, ElementRef, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FocusTrapDirective } from './focus-trap.directive';
import { By } from '@angular/platform-browser';

@Component({
  template: `
    <div appFocusTrap (escapePressed)="onEscape()">
      <button #firstBtn id="first-btn">First</button>
      <input #inputField id="input-field" type="text" />
      <button #lastBtn id="last-btn">Last</button>
    </div>
  `,
  standalone: true,
  imports: [FocusTrapDirective],
})
class TestHostComponent {
  @ViewChild('firstBtn') firstBtn!: ElementRef<HTMLButtonElement>;
  @ViewChild('lastBtn') lastBtn!: ElementRef<HTMLButtonElement>;
  escaped = false;
  onEscape(): void {
    this.escaped = true;
  }
}

describe('FocusTrapDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let component: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    component = fixture.componentInstance;
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
  });

  afterEach(() => {
    if (fixture.nativeElement.parentNode) {
      fixture.nativeElement.parentNode.removeChild(fixture.nativeElement);
    }
  });

  it('emits escapePressed when Escape key is pressed', () => {
    const directiveDebug = fixture.debugElement.query(By.directive(FocusTrapDirective));
    const directiveInstance = directiveDebug.injector.get(FocusTrapDirective);

    let emitted = false;
    directiveInstance.escapePressed.subscribe(() => {
      emitted = true;
    });

    const mockEvent = {
      key: 'Escape',
      preventDefault: jasmine.createSpy('preventDefault'),
      stopPropagation: jasmine.createSpy('stopPropagation'),
    } as unknown as KeyboardEvent;

    directiveInstance.handleKeyDown(mockEvent);

    expect(emitted).toBeTrue();
    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });

  it('finds focusable elements in container', () => {
    const directiveDebug = fixture.debugElement.query(By.directive(FocusTrapDirective));
    const directiveInstance = directiveDebug.injector.get(FocusTrapDirective);

    const elements = directiveInstance.getFocusableElements();
    expect(elements.length).toBe(3);
    expect(elements[0].id).toBe('first-btn');
    expect(elements[2].id).toBe('last-btn');
  });

  it('traps focus to first element when Tab pressed on last element', () => {
    const directiveDebug = fixture.debugElement.query(By.directive(FocusTrapDirective));
    const directiveInstance = directiveDebug.injector.get(FocusTrapDirective);
    const firstBtn = component.firstBtn.nativeElement;
    const lastBtn = component.lastBtn.nativeElement;

    spyOn(firstBtn, 'focus');

    const trapped = directiveInstance.trapFocus(false, lastBtn);
    expect(trapped).toBeTrue();
    expect(firstBtn.focus).toHaveBeenCalled();
  });

  it('traps focus to last element when Shift+Tab pressed on first element', () => {
    const directiveDebug = fixture.debugElement.query(By.directive(FocusTrapDirective));
    const directiveInstance = directiveDebug.injector.get(FocusTrapDirective);
    const firstBtn = component.firstBtn.nativeElement;
    const lastBtn = component.lastBtn.nativeElement;

    spyOn(lastBtn, 'focus');

    const trapped = directiveInstance.trapFocus(true, firstBtn);
    expect(trapped).toBeTrue();
    expect(lastBtn.focus).toHaveBeenCalled();
  });
});
