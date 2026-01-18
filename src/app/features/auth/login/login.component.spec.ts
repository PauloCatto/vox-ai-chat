import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { LoginComponent } from './login.component';
import { LoadingComponent } from '@shared/loading/loading.component';

class MockAuthService {
  signIn(email: string, pass: string) {
    if (email === 'test@example.com' && pass === 'password') {
      return Promise.resolve({ error: null });
    }
    return Promise.resolve({ error: { message: 'Invalid credentials' } });
  }

  signInWithGoogle() {
    return Promise.resolve();
  }
}

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authService: AuthService;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent, ReactiveFormsModule, LoadingComponent],
      providers: [
        { provide: AuthService, useClass: MockAuthService },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize the form with empty controls', () => {
    expect(component.loginForm.get('email')).toBeTruthy();
    expect(component.loginForm.get('password')).toBeTruthy();
    expect(component.loginForm.valid).toBeFalsy();
  });

  it('should validate email format', () => {
    const email = component.loginForm.get('email');
    email?.setValue('invalid-email');
    expect(email?.hasError('email')).toBeTruthy();

    email?.setValue('valid@email.com');
    expect(email?.hasError('email')).toBeFalsy();
  });

  it('should toggle password visibility', () => {
    expect(component.showPassword).toBeFalse();
    component.togglePasswordVisibility();
    expect(component.showPassword).toBeTrue();
  });

  describe('onSubmit', () => {
    it('should not call authService if form is invalid', async () => {
      const signInSpy = spyOn(authService, 'signIn');
      await component.onSubmit();
      expect(signInSpy).not.toHaveBeenCalled();
    });

    it('should call authService.signIn and navigate on success', fakeAsync(() => {
      const navigateSpy = spyOn(router, 'navigate');

      component.loginForm.patchValue({
        email: 'test@example.com',
        password: 'password',
      });

      component.onSubmit();
      tick();

      expect(navigateSpy).toHaveBeenCalledWith(['/chat']);
      expect(component.loading).toBeFalse();
    }));

    it('should set error message on failed login', fakeAsync(() => {
      component.loginForm.patchValue({
        email: 'wrong@example.com',
        password: 'wrongpassword',
      });

      component.onSubmit();
      tick();

      expect(component.errorMessage).toBe('Invalid credentials');
      expect(component.loading).toBeFalse();
    }));
  });

  describe('loginWithGoogle', () => {
    it('should call authService.signInWithGoogle', fakeAsync(() => {
      const googleSpy = spyOn(
        authService,
        'signInWithGoogle',
      ).and.callThrough();
      component.loginWithGoogle();
      expect(component.loading).toBeTrue();
      tick();
      expect(googleSpy).toHaveBeenCalled();
    }));

    it('should handle Google login error', fakeAsync(() => {
      spyOn(authService, 'signInWithGoogle').and.returnValue(
        Promise.reject({ message: 'Google error' }),
      );

      component.loginWithGoogle();
      tick();

      expect(component.errorMessage).toBe('Google error');
      expect(component.loading).toBeFalse();
    }));
  });
});
