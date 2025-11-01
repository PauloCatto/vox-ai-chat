import { Component, OnInit, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss'],
})
export class ForgotPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  forgotForm!: FormGroup;
  loading = false;
  successMessage = '';
  errorMessage = '';

  ngOnInit(): void {
    this.initForm();
  }

  initForm(): void {
    this.forgotForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  async onSubmit(): Promise<void> {
    if (this.forgotForm.invalid) {
      this.forgotForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.successMessage = '';
    this.errorMessage = '';

    const { email } = this.forgotForm.value;

    try {
      const { data, error } = await this.authService.resetPassword(email);
      if (error) {
        this.errorMessage = error.message;
      } else {
        this.successMessage =
          'A password reset link has been sent to your email.';
      }
    } catch (err: any) {
      this.errorMessage = 'Something went wrong. Please try again.';
      console.error(err);
    } finally {
      this.loading = false;
    }
  }
}
