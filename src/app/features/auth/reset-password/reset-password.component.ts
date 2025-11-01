import { Component, OnInit, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss'],
})
export class ResetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private supabaseService = inject(SupabaseService);

  resetForm: FormGroup = new FormGroup({});
  loading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  showPassword: boolean = false;

  private accessToken: string | null = null;

  ngOnInit(): void {
    const urlParams = new URLSearchParams(window.location.search);
    this.accessToken = urlParams.get('access_token');

    if (!this.accessToken && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      this.accessToken = hashParams.get('access_token');
    }

    if (!this.accessToken) {
      this.errorMessage = 'Invalid or expired reset link.';
      this.initForm(true);
      return;
    }

    this.initForm(false);
  }

  initForm(isDisabled: boolean = false): void {
    this.resetForm = this.fb.group(
      {
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', Validators.required],
      },
      { validators: this.passwordsMatch }
    );

    if (isDisabled) {
      this.resetForm.disable();
    }
  }

  passwordsMatch(group: FormGroup) {
    const pass = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return pass === confirm ? null : { mismatch: true };
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  async onSubmit(): Promise<void> {
    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }

    if (!this.accessToken) return;

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const password = this.resetForm.get('password')?.value;
      const supabase = this.supabaseService.client;

      await supabase.auth.setSession({
        access_token: this.accessToken,
        refresh_token: '',
      });

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      this.successMessage =
        'Password updated successfully. Redirecting to login...';
      setTimeout(() => this.router.navigate(['/login']), 2000);
    } catch (error: any) {
      this.errorMessage = error.message || 'Error updating password';
    } finally {
      this.loading = false;
    }
  }
}
