import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import {
  SupabaseClient,
  AuthResponse,
  UserResponse,
  AuthError,
  AuthTokenResponsePassword,
} from '@supabase/supabase-js';
import { UserProfile } from '../models/auth.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private supabase: SupabaseClient = this.supabaseService.getClient();

  constructor(private supabaseService: SupabaseService) { }

  async signUp(
    email: string,
    password: string,
    username?: string,
  ): Promise<{ data: any; error: AuthError | any }> {
    const { data: signUpData, error: signUpError } =
      await this.supabase.auth.signUp({ email, password });

    if (signUpError) return { data: null, error: signUpError };

    const { data: signInData, error: signInError } =
      await this.supabase.auth.signInWithPassword({ email, password });

    if (signInError) return { data: null, error: signInError };

    if (username && signInData.user) {
      const { error: profileError } = await this.createProfile(
        signInData.user.id,
        username,
      );
      if (profileError) return { data: null, error: profileError };
    }

    return { data: signUpData, error: null };
  }

  signIn(email: string, password: string): Promise<AuthTokenResponsePassword> {
    return this.supabase.auth.signInWithPassword({ email, password });
  }

  signOut(): Promise<{ error: AuthError | null }> {
    return this.supabase.auth.signOut();
  }

  getUser(): Promise<UserResponse> {
    return this.supabase.auth.getUser();
  }

  async createProfile(userId: string, username: string) {
    return this.supabase
      .from('profiles')
      .insert({ id: userId, username } as UserProfile);
  }

  async resetPassword(
    email: string,
  ): Promise<{ data: any; error: AuthError | null }> {
    const { data, error } = await this.supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${window.location.origin}/reset-password`,
      },
    );

    return { data, error };
  }

  async updatePassword(newPassword: string): Promise<UserResponse> {
    return this.supabase.auth.updateUser({ password: newPassword });
  }

  async signInWithGoogle(): Promise<void> {
    const { error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/chat`,
      },
    });
    if (error) throw error;
  }
}
