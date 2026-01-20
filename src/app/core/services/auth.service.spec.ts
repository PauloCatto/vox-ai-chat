import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

describe('AuthService', () => {
  let service: AuthService;
  let supabaseSpy: any;

  beforeEach(() => {
    supabaseSpy = {
      auth: {
        signUp: jasmine.createSpy('signUp'),
        signInWithPassword: jasmine.createSpy('signInWithPassword'),
        signOut: jasmine.createSpy('signOut'),
        getUser: jasmine.createSpy('getUser'),
        resetPasswordForEmail: jasmine.createSpy('resetPasswordForEmail'),
        updateUser: jasmine.createSpy('updateUser'),
        signInWithOAuth: jasmine.createSpy('signInWithOAuth'),
      },
      from: jasmine.createSpy('from').and.returnValue({
        insert: jasmine.createSpy('insert').and.resolveTo({ error: null }),
      }),
    };

    const supabaseServiceMock = {
      getClient: () => supabaseSpy,
    };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: SupabaseService, useValue: supabaseServiceMock },
      ],
    });

    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('signUp flow', () => {
    it('should complete full sign up flow (signUp -> signIn -> createProfile)', async () => {
      const email = 'test@test.com';
      const password = 'password123';
      const username = 'testuser';

      supabaseSpy.auth.signUp.and.resolveTo({
        data: { user: { id: '123' } },
        error: null,
      });
      supabaseSpy.auth.signInWithPassword.and.resolveTo({
        data: { user: { id: '123' } },
        error: null,
      });

      const result = await service.signUp(email, password, username);

      expect(supabaseSpy.auth.signUp).toHaveBeenCalled();
      expect(supabaseSpy.auth.signInWithPassword).toHaveBeenCalled();
      expect(supabaseSpy.from).toHaveBeenCalledWith('profiles');
      expect(result.error).toBeNull();
    });

    it('should return error if signUp fails', async () => {
      supabaseSpy.auth.signUp.and.resolveTo({
        data: null,
        error: { message: 'Auth Error' },
      });

      const result = await service.signUp('test@test.com', '123');

      expect(result.error).toBeDefined();
      expect(supabaseSpy.auth.signInWithPassword).not.toHaveBeenCalled();
    });
  });

  describe('Auth Methods', () => {
    it('should call signInWithPassword', async () => {
      supabaseSpy.auth.signInWithPassword.and.resolveTo({
        data: {},
        error: null,
      });
      await service.signIn('test@test.com', '123');
      expect(supabaseSpy.auth.signInWithPassword).toHaveBeenCalled();
    });

    it('should call signOut', async () => {
      supabaseSpy.auth.signOut.and.resolveTo({ error: null });
      await service.signOut();
      expect(supabaseSpy.auth.signOut).toHaveBeenCalled();
    });

    it('should call resetPasswordForEmail with correct redirect', async () => {
      supabaseSpy.auth.resetPasswordForEmail.and.resolveTo({
        data: {},
        error: null,
      });
      await service.resetPassword('test@test.com');

      expect(supabaseSpy.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@test.com',
        jasmine.objectContaining({
          redirectTo: jasmine.stringMatching('/reset-password'),
        }),
      );
    });
  });

  describe('OAuth', () => {
    it('should call signInWithOAuth for Google', async () => {
      supabaseSpy.auth.signInWithOAuth.and.resolveTo({ error: null });
      await service.signInWithGoogle();
      expect(supabaseSpy.auth.signInWithOAuth).toHaveBeenCalledWith(
        jasmine.objectContaining({ provider: 'google' }),
      );
    });
  });
});
