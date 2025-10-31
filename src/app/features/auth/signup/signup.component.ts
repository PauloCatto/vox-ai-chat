import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss'],
})
export class SignupComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  signupForm!: FormGroup;
  loading = false;
  errorMessage = '';

  ngOnInit(): void {
    this.initForm();
  }

  initForm(): void {
    this.signupForm = this.fb.group(
      {
        name: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        password: ['', Validators.required],
        confirmPassword: ['', Validators.required],
      },
      { validators: this.passwordMatchValidator }
    );
  }

  private passwordMatchValidator(group: FormGroup): { [key: string]: boolean } | null {
    const password = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return password === confirm ? null : { mismatch: true };
  }

  async onSubmit(): Promise<void> {
    if (this.signupForm.invalid) {
      this.signupForm.markAllAsTouched();
      return;
    }

    const { name, email, password } = this.signupForm.value;
    this.loading = true;
    this.errorMessage = '';

    try {
      const { data, error } = await this.authService.signUp(email, password);

      if (error) {
        this.errorMessage = error.message;
        return;
      }

      if (!data || !data.user) return;

      await this.authService.createProfile(data.user.id, name);

      console.log('Sign Up successful:', data.user);
      this.router.navigate(['/login']);
    } catch (err: any) {
      this.errorMessage = err.message || 'An error occurred';
      console.error(err);
    } finally {
      this.loading = false;
    }
  }
}
