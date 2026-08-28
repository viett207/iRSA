import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NotFoundComponent } from './not-found.component';
import { provideRouter } from '@angular/router';
import { Location } from '@angular/common';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { NZ_ICONS } from 'ng-zorro-antd/icon';
import {
  HomeOutline,
  ArrowLeftOutline,
  SearchOutline,
  ThunderboltOutline,
  DashboardOutline,
} from '@ant-design/icons-angular/icons';

describe('NotFoundComponent', () => {
  let component: NotFoundComponent;
  let fixture: ComponentFixture<NotFoundComponent>;
  let locationSpy: jasmine.SpyObj<Location>;

  beforeEach(async () => {
    locationSpy = jasmine.createSpyObj('Location', ['back']);

    await TestBed.configureTestingModule({
      imports: [NotFoundComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        provideTranslateService(),
        { provide: Location, useValue: locationSpy },
        {
          provide: NZ_ICONS,
          useValue: [
            HomeOutline,
            ArrowLeftOutline,
            SearchOutline,
            ThunderboltOutline,
            DashboardOutline,
          ],
        },
      ],
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('vi', {
      auth: {
        notFoundTitle: 'Không tìm thấy trang yêu cầu',
      },
    });
    translate.use('vi');

    fixture = TestBed.createComponent(NotFoundComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders 404 status and error title', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.status-code')?.textContent).toContain('404');
    expect(compiled.querySelector('.error-title')?.textContent).toContain('Không tìm thấy trang yêu cầu');
  });

  it('navigates back when goBack is called', () => {
    component.goBack();
    expect(locationSpy.back).toHaveBeenCalled();
  });
});
