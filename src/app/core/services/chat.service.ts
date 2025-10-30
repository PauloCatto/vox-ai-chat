import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private supabase = this.supabaseService.getClient();

  constructor(private supabaseService: SupabaseService) {}

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

  sendMessage(
    conversationId: string,
    userId: string,
    role: string,
    content: string
  ) {
    return this.supabase.from('messages').insert({
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
