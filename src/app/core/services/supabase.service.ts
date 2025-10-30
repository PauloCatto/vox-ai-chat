import { Injectable, inject } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private supabase: SupabaseClient = createClient(
    environment.supabaseUrl,
    environment.supabaseKey
  );

  // Auth
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

  // Profiles
  getProfile(userId: string) {
    return this.supabase.from('profiles').select('*').eq('id', userId).single();
  }

  updateProfile(profile: any) {
    return this.supabase.from('profiles').update(profile).eq('id', profile.id);
  }

  // Conversations
  createConversation(userId: string, title: string) {
    return this.supabase
      .from('conversations')
      .insert({ user_id: userId, title });
  }

  getConversations(userId: string) {
    return this.supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId);
  }

  // Messages
  sendMessage(
    conversationId: string,
    userId: string,
    role: string,
    content: string
  ) {
    return this.supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        user_id: userId,
        role,
        content,
      });
  }

  getMessages(conversationId: string) {
    return this.supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
  }
}
