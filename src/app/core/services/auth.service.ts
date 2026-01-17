import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private supabase = this.supabaseService.getClient();

  constructor(private supabaseService: SupabaseService) {}

  async signUp(email: string, password: string, username?: string) {
    const { data: signUpData, error: signUpError } =
      await this.supabase.auth.signUp({ email, password });
    if (signUpError) return { data: null, error: signUpError };

    const { data: signInData, error: signInError } =
      await this.supabase.auth.signInWithPassword({ email, password });
    if (signInError) return { data: null, error: signInError };

    if (username && signInData.user) {
      const { error: profileError } = await this.createProfile(
        signInData.user.id,
        username
      );
      if (profileError) return { data: null, error: profileError };
    }

    return { data: signUpData, error: null };
  }

  signIn(email: string, password: string) {
    return this.supabase.auth.signInWithPassword({ email, password });
  }

  signOut() {
    return this.supabase.auth.signOut();
  }

  getUser() {
    return this.supabase.auth.getUser();
  }

  async createProfile(userId: string, username: string) {
    return this.supabase.from('profiles').insert({ id: userId, username });
  }

  async resetPassword(email: string) {
    return this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://vox-ai-chat.vercel.app/reset-password',
    });
  }

  async updatePassword(newPassword: string) {
    return this.supabase.auth.updateUser({ password: newPassword });
  }
}
