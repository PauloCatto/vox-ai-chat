import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private supabase = this.supabaseService.getClient();

  constructor(private supabaseService: SupabaseService) {}

  signUp(email: string, password: string) {
    return this.supabase.auth.signUp({ email, password });
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
}
