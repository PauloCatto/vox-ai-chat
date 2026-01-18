import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { ReactiveFormsModule, Validators } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ForgotPasswordComponent } from './forgot-password.component';
import { LoadingComponent } from "@shared/loading/loading.component";

describe('ForgotPasswordComponent', () => {
  let component: ForgotPasswordComponent;
  let fixture: ComponentFixture<ForgotPasswordComponent>;
  let authService: AuthService;

  const mockAuthService = {
    resetPassword: jasmine.createSpy('resetPassword')
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ForgotPasswordComponent, 
        ReactiveFormsModule, 
        LoadingComponent
      ],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        provideRouter([])
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ForgotPasswordComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    
    mockAuthService.resetPassword.calls.reset();
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should initialize the form with an empty email', () => {
    fixture.detectChanges();
    expect(component.forgotForm.get('email')).toBeTruthy();
    expect(component.forgotForm.get('email')?.value).toBe('');
  });

  it('should validate email field', () => {
    fixture.detectChanges();
    const emailControl = component.forgotForm.get('email');
    
    emailControl?.setValue('invalid-email');
    expect(emailControl?.invalid).toBeTrue();

    emailControl?.setValue('test@example.com');
    expect(emailControl?.valid).toBeTrue();
  });

  it('should not submit if the form is invalid', () => {
    fixture.detectChanges();
    component.forgotForm.get('email')?.setValue('');
    component.onSubmit();
    expect(mockAuthService.resetPassword).not.toHaveBeenCalled();
  });

  it('should call resetPassword on valid submission', fakeAsync(() => {
    mockAuthService.resetPassword.and.resolveTo({ data: {}, error: null });
    
    fixture.detectChanges();
    component.forgotForm.get('email')?.setValue('test@example.com');
    
    component.onSubmit();
    
    tick(); 
    
    expect(mockAuthService.resetPassword).toHaveBeenCalledWith('test@example.com');
  }));

  it('should display a success message and reset the form on success', fakeAsync(() => {
    mockAuthService.resetPassword.and.resolveTo({ data: {}, error: null });

    fixture.detectChanges();
    component.forgotForm.get('email')?.setValue('test@example.com');
    
    component.onSubmit();
    tick();
    fixture.detectChanges();

    expect(component.successMessage).toBe('A password reset link has been sent to your email.');
    expect(component.errorMessage).toBe('');
    expect(component.forgotForm.get('email')?.value).toBeNull();
    expect(component.loading).toBeFalse();
  }));

  it('should display an error message on API error', fakeAsync(() => {
    mockAuthService.resetPassword.and.resolveTo({ 
      data: null, 
      error: { message: 'User not found' } 
    });

    fixture.detectChanges();
    component.forgotForm.get('email')?.setValue('fail@example.com');
    
    component.onSubmit();
    tick();
    fixture.detectChanges();

    expect(component.errorMessage).toBe('User not found');
    expect(component.successMessage).toBe('');
    expect(component.loading).toBeFalse();
  }));

  it('should display a generic error message on thrown exception', fakeAsync(() => {
    mockAuthService.resetPassword.and.rejectWith('Service failed');

    fixture.detectChanges();
    component.forgotForm.get('email')?.setValue('throw@example.com');
    
    component.onSubmit();
    tick();
    fixture.detectChanges();

    expect(component.errorMessage).toBe('Something went wrong. Please try again.');
    expect(component.successMessage).toBe('');
    expect(component.loading).toBeFalse();
  }));
});