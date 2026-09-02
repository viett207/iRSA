import { Routes } from '@angular/router';
import { authGuard, hrGuard, adminGuard } from './core/auth/auth.guard';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';
import { LoginComponent } from './pages/login/login.component';
import { HRRegisterComponent } from './pages/hr-register/hr-register.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { ReportsComponent } from './pages/reports/reports.component';
import { UsersComponent } from './pages/users/users.component';
import { CompaniesComponent } from './pages/companies/companies.component';
import { CompanyDetailComponent } from './pages/company-detail/company-detail.component';
import { ApplicationsComponent } from './pages/applications/applications.component';
import { CandidatesComponent } from './pages/candidates/candidates.component';


export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: 'register-hr',
    component: HRRegisterComponent,
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [hrGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      {
        path: 'jobs',
        loadChildren: () =>
          import('./features/jobs/jobs.routes').then((m) => m.JOB_ROUTES),
      },
      { path: 'applications', component: ApplicationsComponent },
      { path: 'candidates', component: CandidatesComponent },
      { path: 'reports', component: ReportsComponent },
      { path: 'users', component: UsersComponent, canActivate: [adminGuard] },
      { path: 'companies', component: CompaniesComponent, canActivate: [adminGuard] },
      { path: 'companies/:id', component: CompanyDetailComponent, canActivate: [adminGuard] },
      { path: 'approvals', component: UsersComponent, canActivate: [adminGuard], data: { accountMode: 'pending' } },
    ],
  },
  { path: '**', redirectTo: '' },
];
