import { Routes } from '@angular/router';
import { authGuard, hrGuard, adminGuard } from './core/auth/auth.guard';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register-hr',
    loadComponent: () => import('./pages/hr-register/hr-register.component').then((m) => m.HRRegisterComponent),
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [hrGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard.component').then((m) => m.DashboardComponent) },
      {
        path: 'jobs',
        loadChildren: () =>
          import('./features/jobs/jobs.routes').then((m) => m.JOB_ROUTES),
      },
      { path: 'applications', loadComponent: () => import('./pages/applications/applications.component').then((m) => m.ApplicationsComponent) },
      { path: 'candidates', loadComponent: () => import('./pages/candidates/candidates.component').then((m) => m.CandidatesComponent) },
      { path: 'reports', loadComponent: () => import('./pages/reports/reports.component').then((m) => m.ReportsComponent) },
      { path: 'users', loadComponent: () => import('./pages/users/users.component').then((m) => m.UsersComponent), canActivate: [adminGuard] },
      { path: 'companies', loadComponent: () => import('./pages/companies/companies.component').then((m) => m.CompaniesComponent), canActivate: [adminGuard] },
      { path: 'companies/:id', loadComponent: () => import('./pages/company-detail/company-detail.component').then((m) => m.CompanyDetailComponent), canActivate: [adminGuard] },
      { path: 'approvals', loadComponent: () => import('./pages/users/users.component').then((m) => m.UsersComponent), canActivate: [adminGuard], data: { accountMode: 'pending' } },
    ],
  },
  { path: '**', redirectTo: '' },
];
