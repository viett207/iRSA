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
  AlertFill, AlertOutline, ApartmentOutline, AppstoreFill, AppstoreOutline, ArrowLeftOutline, ArrowRightOutline, AudioFill,
  AudioOutline, AuditOutline, BankFill, BankOutline, BarChartOutline, BellFill, BellOutline, BranchesOutline,
  BulbFill, BulbOutline, CalendarFill, CalendarOutline, CheckCircleFill, CheckCircleOutline, CheckOutline, CheckSquareFill,
  CheckSquareOutline, ClockCircleFill, ClockCircleOutline, CloseCircleFill, CloseCircleOutline, CloseOutline, ClusterOutline, ControlFill,
  ControlOutline, DashboardFill, DashboardOutline, DeleteFill, DeleteOutline, DiffFill, DiffOutline, DownOutline,
  DownloadOutline, EditFill, EditOutline, EllipsisOutline, EnvironmentFill, EnvironmentOutline, ExclamationCircleFill, ExclamationCircleOutline,
  ExportOutline, EyeFill, EyeInvisibleFill, EyeInvisibleOutline, EyeOutline, FileExclamationFill, FileExclamationOutline, FileFill,
  FileOutline, FilePdfFill, FilePdfOutline, FileSearchOutline, FileTextFill, FileTextOutline, FileWordFill, FileWordOutline,
  FilterFill, FilterOutline, FlagFill, FlagOutline, FolderOpenFill, FolderOpenOutline, FormOutline, FunctionOutline,
  GlobalOutline, GoldFill, GoldOutline, GroupOutline, HighlightFill, HighlightOutline, InfoCircleFill, InfoCircleOutline,
  InfoOutline, LayoutFill, LayoutOutline, LeftOutline, LikeFill, LikeOutline, LinkOutline, LoadingOutline,
  LockFill, LockOutline, LoginOutline, LogoutOutline, MailFill, MailOutline, MediumOutline, MenuFoldOutline,
  MenuUnfoldOutline, MessageFill, MessageOutline, MinusCircleFill, MinusCircleOutline, MinusOutline, MoreOutline, NotificationFill,
  NotificationOutline, NumberOutline, PartitionOutline, PhoneFill, PhoneOutline, PlusCircleFill, PlusCircleOutline, PlusOutline,
  PoweroffOutline, ProfileFill, ProfileOutline, ProjectFill, ProjectOutline, QuestionCircleFill, QuestionCircleOutline, ReloadOutline,
  RightOutline, RiseOutline, RobotFill, RobotOutline, RollbackOutline, SafetyCertificateFill, SafetyCertificateOutline, SaveFill,
  SaveOutline, ScheduleFill, ScheduleOutline, SearchOutline, SendOutline, SlidersFill, SlidersOutline, SolutionOutline,
  StarFill, StarOutline, StopFill, StopOutline, SwapOutline, SyncOutline, TableOutline, TagsFill,
  TagsOutline, TeamOutline, ThunderboltFill, ThunderboltOutline, ToolFill, ToolOutline, TrophyFill, TrophyOutline,
  UnorderedListOutline, UploadOutline, UserOutline, WarningFill, WarningOutline,
} from '@ant-design/icons-angular/icons';

registerLocaleData(vi);

// Keep the initial bundle small: register only icons referenced by this app.
const icons: IconDefinition[] = [
  AlertFill, AlertOutline, ApartmentOutline, AppstoreFill, AppstoreOutline, ArrowLeftOutline, ArrowRightOutline, AudioFill,
  AudioOutline, AuditOutline, BankFill, BankOutline, BarChartOutline, BellFill, BellOutline, BranchesOutline,
  BulbFill, BulbOutline, CalendarFill, CalendarOutline, CheckCircleFill, CheckCircleOutline, CheckOutline, CheckSquareFill,
  CheckSquareOutline, ClockCircleFill, ClockCircleOutline, CloseCircleFill, CloseCircleOutline, CloseOutline, ClusterOutline, ControlFill,
  ControlOutline, DashboardFill, DashboardOutline, DeleteFill, DeleteOutline, DiffFill, DiffOutline, DownOutline,
  DownloadOutline, EditFill, EditOutline, EllipsisOutline, EnvironmentFill, EnvironmentOutline, ExclamationCircleFill, ExclamationCircleOutline,
  ExportOutline, EyeFill, EyeInvisibleFill, EyeInvisibleOutline, EyeOutline, FileExclamationFill, FileExclamationOutline, FileFill,
  FileOutline, FilePdfFill, FilePdfOutline, FileSearchOutline, FileTextFill, FileTextOutline, FileWordFill, FileWordOutline,
  FilterFill, FilterOutline, FlagFill, FlagOutline, FolderOpenFill, FolderOpenOutline, FormOutline, FunctionOutline,
  GlobalOutline, GoldFill, GoldOutline, GroupOutline, HighlightFill, HighlightOutline, InfoCircleFill, InfoCircleOutline,
  InfoOutline, LayoutFill, LayoutOutline, LeftOutline, LikeFill, LikeOutline, LinkOutline, LoadingOutline,
  LockFill, LockOutline, LoginOutline, LogoutOutline, MailFill, MailOutline, MediumOutline, MenuFoldOutline,
  MenuUnfoldOutline, MessageFill, MessageOutline, MinusCircleFill, MinusCircleOutline, MinusOutline, MoreOutline, NotificationFill,
  NotificationOutline, NumberOutline, PartitionOutline, PhoneFill, PhoneOutline, PlusCircleFill, PlusCircleOutline, PlusOutline,
  PoweroffOutline, ProfileFill, ProfileOutline, ProjectFill, ProjectOutline, QuestionCircleFill, QuestionCircleOutline, ReloadOutline,
  RightOutline, RiseOutline, RobotFill, RobotOutline, RollbackOutline, SafetyCertificateFill, SafetyCertificateOutline, SaveFill,
  SaveOutline, ScheduleFill, ScheduleOutline, SearchOutline, SendOutline, SlidersFill, SlidersOutline, SolutionOutline,
  StarFill, StarOutline, StopFill, StopOutline, SwapOutline, SyncOutline, TableOutline, TagsFill,
  TagsOutline, TeamOutline, ThunderboltFill, ThunderboltOutline, ToolFill, ToolOutline, TrophyFill, TrophyOutline,
  UnorderedListOutline, UploadOutline, UserOutline, WarningFill, WarningOutline,
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
