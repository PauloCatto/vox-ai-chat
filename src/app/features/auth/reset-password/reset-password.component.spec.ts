import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router, provideRouter } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase.service';
import { ResetPasswordComponent } from './reset-password.component';
import { LoadingComponent } from '../../../shared/loading/loading.component';

describe('ResetPasswordComponent', () => {
  let component: ResetPasswordComponent;
  let fixture: ComponentFixture<ResetPasswordComponent>;
  let router: Router;

  const mockSupabaseClient = {
    auth: {
      setSession: jasmine
        .createSpy('setSession')
        .and.resolveTo({ data: {}, error: null }),
      updateUser: jasmine
        .createSpy('updateUser')
        .and.resolveTo({ data: {}, error: null }),
    },
  };

  const mockSupabaseService = {
    get client() {
      return mockSupabaseClient;
    },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResetPasswordComponent, ReactiveFormsModule, LoadingComponent],
      providers: [
        { provide: SupabaseService, useValue: mockSupabaseService },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ResetPasswordComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
  });

  const setupValidState = () => {
    (component as any).accessToken = 'valid-token';
    component.initForm();
    fixture.detectChanges();
  };

  it('should create', () => {
    setupValidState();
    expect(component).toBeTruthy();
  });

  describe('onSubmit', () => {
    beforeEach(() => {
      spyOn(component as any, 'extractAccessToken').and.callFake(() => {});
      setupValidState();
      mockSupabaseClient.auth.setSession.calls.reset();
      mockSupabaseClient.auth.updateUser.calls.reset();
      mockSupabaseClient.auth.updateUser.and.resolveTo({
        data: {},
        error: null,
      });
    });

    it('should call updateUser and navigate on success', fakeAsync(() => {
      const navigateSpy = spyOn(router, 'navigate');

      component.resetForm.patchValue({
        password: 'newPassword123',
        confirmPassword: 'newPassword123',
      });

      component.onSubmit();

      tick();

      expect(mockSupabaseClient.auth.setSession).toHaveBeenCalledWith({
        access_token: 'valid-token',
        refresh_token: '',
      });

      expect(mockSupabaseClient.auth.updateUser).toHaveBeenCalledWith({
        password: 'newPassword123',
      });

      expect(component.successMessage).toContain(
        'Password updated successfully',
      );

      tick(2000);
      expect(navigateSpy).toHaveBeenCalledWith(['/login']);
    }));

    it('should set error message if updateUser fails', fakeAsync(() => {
      mockSupabaseClient.auth.updateUser.and.resolveTo({
        error: { message: 'Token expired' },
      });

      component.resetForm.patchValue({
        password: 'newPassword123',
        confirmPassword: 'newPassword123',
      });

      component.onSubmit();
      tick();

      expect(component.errorMessage).toBe('Token expired');
      expect(component.loading).toBe(false);
    }));
  });
});
