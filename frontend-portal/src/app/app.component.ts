import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NzMessageModule } from 'ng-zorro-antd/message';
import { TranslateService } from '@ngx-translate/core';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NzMessageModule],
  template: `<router-outlet></router-outlet>`,
  styles: [],
})
export class AppComponent {
  title = 'frontend-portal';

  constructor(
    private translate: TranslateService,
    private themeService: ThemeService
  ) {
    translate.setDefaultLang('vi');
    translate.use('vi');
  }
}
