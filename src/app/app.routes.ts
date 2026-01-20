import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { SignupComponent } from './features/auth/signup/signup.component';
import { ForgotPasswordComponent } from './features/auth/forgot-password/forgot-password.component';
import { ChatComponent } from './features/chat/chat/chat.component';
import { ResetPasswordComponent } from './features/auth/reset-password/reset-password.component';
import { publicGuard, authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [publicGuard],
  },
  {
    path: 'signup',
    component: SignupComponent,
    canActivate: [publicGuard],
  },
  {
    path: 'forgot-password',
    component: ForgotPasswordComponent,
    canActivate: [publicGuard],
  },
  {
    path: 'chat',
    component: ChatComponent,
    canActivate: [authGuard],
  },
  {
    path: 'reset-password',
    component: ResetPasswordComponent,
    canActivate: [authGuard],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
