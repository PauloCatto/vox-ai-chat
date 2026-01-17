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
import { LoadingComponent } from "@shared/loading/loading.component";

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LoadingComponent],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss'],
})
export class ForgotPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  forgotForm!: FormGroup;

  loading = false;
  private loadingTimer: any;

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

    this.successMessage = '';
    this.errorMessage = '';

    this.loadingTimer = setTimeout(() => {
      this.loading = true;
    }, 300);

    const { email } = this.forgotForm.value;

    try {
      const { error } = await this.authService.resetPassword(email);

      if (error) {
        this.errorMessage = error.message;
        return;
      }

      this.successMessage =
        'A password reset link has been sent to your email.';
      this.forgotForm.reset();
    } catch (err) {
      console.error(err);
      this.errorMessage = 'Something went wrong. Please try again.';
    } finally {
      clearTimeout(this.loadingTimer);
      this.loading = false;
    }
  }
}
