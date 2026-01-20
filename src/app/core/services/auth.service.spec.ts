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

    const supabaseServiceMock = { getClient: () => supabaseSpy };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: SupabaseService, useValue: supabaseServiceMock },
      ],
    });

    service = TestBed.inject(AuthService);
  });

  describe('signUp Branches', () => {
    it('should complete full flow with username', async () => {
      supabaseSpy.auth.signUp.and.resolveTo({
        data: { user: { id: '1' } },
        error: null,
      });
      supabaseSpy.auth.signInWithPassword.and.resolveTo({
        data: { user: { id: '1' } },
        error: null,
      });

      const result = await service.signUp('a@a.com', '123', 'user');
      expect(result.error).toBeNull();
      expect(supabaseSpy.from).toHaveBeenCalledWith('profiles');
    });

    it('should return error if auto-login fails', async () => {
      supabaseSpy.auth.signUp.and.resolveTo({
        data: { user: { id: '1' } },
        error: null,
      });
      supabaseSpy.auth.signInWithPassword.and.resolveTo({
        data: null,
        error: { message: 'login error' },
      });

      const result = await service.signUp('a@a.com', '123', 'user');
      expect(result.error.message).toBe('login error');
    });

    it('should return error if profile creation fails', async () => {
      supabaseSpy.auth.signUp.and.resolveTo({
        data: { user: { id: '1' } },
        error: null,
      });
      supabaseSpy.auth.signInWithPassword.and.resolveTo({
        data: { user: { id: '1' } },
        error: null,
      });

      supabaseSpy.from.and.returnValue({
        insert: jasmine
          .createSpy('insert')
          .and.resolveTo({ error: { message: 'db error' } }),
      });

      const result = await service.signUp('a@a.com', '123', 'user');
      expect(result.error.message).toBe('db error');
    });
  });

  describe('Other Methods', () => {
    it('should call updatePassword (was updateUser)', async () => {
      supabaseSpy.auth.updateUser.and.resolveTo({ data: {}, error: null });
      await service.updatePassword('new-pass');
      expect(supabaseSpy.auth.updateUser).toHaveBeenCalledWith({
        password: 'new-pass',
      });
    });

    it('should handle signInWithGoogle success', async () => {
      supabaseSpy.auth.signInWithOAuth.and.resolveTo({ error: null });
      await service.signInWithGoogle();
      expect(supabaseSpy.auth.signInWithOAuth).toHaveBeenCalled();
    });

    it('should throw error in signInWithGoogle if fails', async () => {
      supabaseSpy.auth.signInWithOAuth.and.resolveTo({
        error: { message: 'OAuth Fail' },
      });
      try {
        await service.signInWithGoogle();
      } catch (e: any) {
        expect(e.message).toBe('OAuth Fail');
      }
    });

    it('should cover getUser', async () => {
      supabaseSpy.auth.getUser.and.resolveTo({
        data: { user: {} },
        error: null,
      });
      await service.getUser();
      expect(supabaseSpy.auth.getUser).toHaveBeenCalled();
    });

    it('should cover signOut', async () => {
      supabaseSpy.auth.signOut.and.resolveTo({ error: null });
      await service.signOut();
      expect(supabaseSpy.auth.signOut).toHaveBeenCalled();
    });
  });
});
