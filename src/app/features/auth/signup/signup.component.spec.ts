import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SignupComponent } from './signup.component';
import { LoadingComponent } from '@shared/loading/loading.component';

describe('SignupComponent', () => {
  let component: SignupComponent;
  let fixture: ComponentFixture<SignupComponent>;
  let router: Router;

  const mockAuthService = {
    signUp: jasmine.createSpy('signUp').and.callFake((email: string) => {
      if (email.includes('fail')) {
        return Promise.resolve({
          error: { message: 'Sign-up failed' },
          data: { user: null },
        });
      }
      return Promise.resolve({ data: { user: { id: '123' } }, error: null });
    }),
    createProfile: jasmine
      .createSpy('createProfile')
      .and.callFake((id: string, name: string) => {
        if (name.includes('fail')) {
          return Promise.reject({ message: 'Profile creation failed' });
        }
        return Promise.resolve();
      }),
  };

  beforeEach(async () => {
    mockAuthService.signUp.calls.reset();
    mockAuthService.createProfile.calls.reset();

    await TestBed.configureTestingModule({
      imports: [SignupComponent, ReactiveFormsModule, LoadingComponent],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SignupComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with required validators', () => {
    expect(component.signupForm).toBeDefined();
    const form = component.signupForm;
    expect(form.get('name')?.hasValidator(Validators.required)).toBe(true);
    expect(form.get('email')?.hasValidator(Validators.email)).toBe(true);
    expect(form.get('password')?.hasValidator(Validators.required)).toBe(true);
  });

  it('should have a password mismatch error if passwords do not match', () => {
    component.signupForm.patchValue({
      password: '123',
      confirmPassword: '456',
    });
    expect(component.signupForm.hasError('mismatch')).toBe(true);
  });

  it('should be valid when all fields are correct', () => {
    component.signupForm.patchValue({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    });
    expect(component.signupForm.valid).toBe(true);
  });

  it('should toggle password visibility', () => {
    expect(component.showPassword).toBe(false);
    component.togglePasswordVisibility();
    expect(component.showPassword).toBe(true);
  });

  describe('onSubmit', () => {
    beforeEach(() => {
      component.signupForm.patchValue({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
      });
    });

    it('should not call signUp if form is invalid', async () => {
      component.signupForm.get('name')?.setValue('');
      await component.onSubmit();
      expect(mockAuthService.signUp).not.toHaveBeenCalled();
    });

    it('should call signUp and createProfile, then navigate on success', fakeAsync(() => {
      const navigateSpy = spyOn(router, 'navigate');

      component.onSubmit();

      expect(component.loading).toBe(true);
      expect(component.signupForm.disabled).toBe(true);

      tick();

      expect(mockAuthService.signUp).toHaveBeenCalledWith(
        'test@example.com',
        'password123',
      );
      expect(mockAuthService.createProfile).toHaveBeenCalledWith(
        '123',
        'Test User',
      );
      expect(navigateSpy).toHaveBeenCalledWith(['/login']);

      expect(component.loading).toBe(false);
      expect(component.signupForm.enabled).toBe(true);
    }));

    it('should set error message if signUp fails', fakeAsync(() => {
      component.signupForm.get('email')?.setValue('fail@example.com');
      const navigateSpy = spyOn(router, 'navigate');

      component.onSubmit();
      tick();

      expect(component.errorMessage).toBe('Sign-up failed');
      expect(mockAuthService.createProfile).not.toHaveBeenCalled();
      expect(navigateSpy).not.toHaveBeenCalled();
      expect(component.loading).toBe(false);
    }));

    it('should set error message if createProfile fails', fakeAsync(() => {
      component.signupForm.get('name')?.setValue('Test User fail');
      const navigateSpy = spyOn(router, 'navigate');

      component.onSubmit();
      tick();

      expect(component.errorMessage).toBe('Profile creation failed');
      expect(navigateSpy).not.toHaveBeenCalled();
      expect(component.loading).toBe(false);
    }));
  });
});
