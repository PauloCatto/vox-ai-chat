import { Component, OnInit, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { LoadingComponent } from '@shared/loading/loading.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LoadingComponent],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  loginForm!: FormGroup;
  loading: boolean = false;
  showPassword: boolean = false;
  errorMessage: string = '';

  ngOnInit(): void {
    this.initForm();
  }

  initForm(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { email, password } = this.loginForm.value;

    this.loading = true;
    this.errorMessage = '';

    try {
      const { error } = await this.authService.signIn(email, password);

      if (error) {
        this.errorMessage = error.message;
        return;
      }

      this.router.navigate(['/chat']);
    } catch (err) {
      console.error('Unexpected error:', err);
      this.errorMessage = 'An unexpected error occurred. Please try again.';
    } finally {
      this.loading = false;
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  async loginWithGoogle(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';

    try {
      await this.authService.signInWithGoogle();
    } catch (err: any) {
      console.error('Google login failed:', err);
      this.errorMessage =
        err.message || 'Google login failed. Please try again.';
      this.loading = false;
    }
  }
}
