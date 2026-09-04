import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { vi_VN, provideNzI18n } from 'ng-zorro-antd/i18n';
import { registerLocaleData } from '@angular/common';
import vi from '@angular/common/locales/vi';
import { FormsModule } from '@angular/forms';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { authInterceptor } from './core/auth/auth.interceptor';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { IconDefinition } from '@ant-design/icons-angular';
import { NzIconModule } from 'ng-zorro-antd/icon';
import {
  AlertFill, AlertOutline, ApartmentOutline, AppstoreFill, AppstoreOutline, ArrowLeftOutline, ArrowRightOutline, AuditOutline,
  BankFill, BankOutline, BellFill, BellOutline, BuildFill, BuildOutline, CalendarFill, CalendarOutline,
  CheckCircleFill, CheckCircleOutline, CheckOutline, ClockCircleFill, ClockCircleOutline, CloseCircleFill, CloseCircleOutline, CloseOutline,
  CodeFill, CodeOutline, ContainerFill, ContainerOutline, DashboardFill, DashboardOutline, DollarOutline, DownOutline,
  DownloadOutline, EnvironmentFill, EnvironmentOutline, ExclamationCircleFill, ExclamationCircleOutline, EyeFill, EyeInvisibleFill, EyeInvisibleOutline,
  EyeOutline, FileFill, FileOutline, FilePdfFill, FilePdfOutline, FileProtectOutline, FileSearchOutline, FileTextFill,
  FileTextOutline, FilterFill, FilterOutline, FireFill, FireOutline, FormOutline, GlobalOutline, GroupOutline,
  HeartFill, HeartOutline, HomeFill, HomeOutline, HourglassFill, HourglassOutline, IdcardFill, IdcardOutline,
  InboxOutline, InfoCircleFill, InfoCircleOutline, KeyOutline, LaptopOutline, LayoutFill, LayoutOutline, LinkOutline,
  LoadingOutline, LockFill, LockOutline, LoginOutline, LogoutOutline, MailFill, MailOutline, MedicineBoxFill,
  MedicineBoxOutline, MenuOutline, MessageFill, MessageOutline, NotificationFill, NotificationOutline, PhoneFill, PhoneOutline,
  ProfileFill, ProfileOutline, ReadFill, ReadOutline, ReloadOutline, RightOutline, SaveFill, SaveOutline,
  ScheduleFill, ScheduleOutline, SearchOutline, SendOutline, ShareAltOutline, SolutionOutline, StarFill, StarOutline,
  TagsFill, TagsOutline, TeamOutline, ThunderboltFill, ThunderboltOutline, TrophyFill, TrophyOutline, UploadOutline,
  UserOutline, VideoCameraFill, VideoCameraOutline, WarningFill, WarningOutline,
} from '@ant-design/icons-angular/icons';

registerLocaleData(vi);

const icons: IconDefinition[] = [
  AlertFill, AlertOutline, ApartmentOutline, AppstoreFill, AppstoreOutline, ArrowLeftOutline, ArrowRightOutline, AuditOutline,
  BankFill, BankOutline, BellFill, BellOutline, BuildFill, BuildOutline, CalendarFill, CalendarOutline,
  CheckCircleFill, CheckCircleOutline, CheckOutline, ClockCircleFill, ClockCircleOutline, CloseCircleFill, CloseCircleOutline, CloseOutline,
  CodeFill, CodeOutline, ContainerFill, ContainerOutline, DashboardFill, DashboardOutline, DollarOutline, DownOutline,
  DownloadOutline, EnvironmentFill, EnvironmentOutline, ExclamationCircleFill, ExclamationCircleOutline, EyeFill, EyeInvisibleFill, EyeInvisibleOutline,
  EyeOutline, FileFill, FileOutline, FilePdfFill, FilePdfOutline, FileProtectOutline, FileSearchOutline, FileTextFill,
  FileTextOutline, FilterFill, FilterOutline, FireFill, FireOutline, FormOutline, GlobalOutline, GroupOutline,
  HeartFill, HeartOutline, HomeFill, HomeOutline, HourglassFill, HourglassOutline, IdcardFill, IdcardOutline,
  InboxOutline, InfoCircleFill, InfoCircleOutline, KeyOutline, LaptopOutline, LayoutFill, LayoutOutline, LinkOutline,
  LoadingOutline, LockFill, LockOutline, LoginOutline, LogoutOutline, MailFill, MailOutline, MedicineBoxFill,
  MedicineBoxOutline, MenuOutline, MessageFill, MessageOutline, NotificationFill, NotificationOutline, PhoneFill, PhoneOutline,
  ProfileFill, ProfileOutline, ReadFill, ReadOutline, ReloadOutline, RightOutline, SaveFill, SaveOutline,
  ScheduleFill, ScheduleOutline, SearchOutline, SendOutline, ShareAltOutline, SolutionOutline, StarFill, StarOutline,
  TagsFill, TagsOutline, TeamOutline, ThunderboltFill, ThunderboltOutline, TrophyFill, TrophyOutline, UploadOutline,
  UserOutline, VideoCameraFill, VideoCameraOutline, WarningFill, WarningOutline,
];

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideNzI18n(vi_VN),
    importProvidersFrom(NzIconModule.forRoot(icons)),
    importProvidersFrom(FormsModule),
    provideAnimationsAsync(),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideTranslateService({
      defaultLanguage: 'vi',
    }),
    provideTranslateHttpLoader({
      prefix: './assets/i18n/',
      suffix: '.json',
    }),
  ],
};
