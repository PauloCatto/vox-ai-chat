import { inject, Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private supabase = this.supabaseService.getClient();
  private http = inject(HttpClient);
  private chatApiUrl = environment.chatApiUrl;
  private apiKey = environment.openAiApiKey;

  constructor(private supabaseService: SupabaseService) {}

  async getAiResponse(
    history: { role: string; content: string }[]
  ): Promise<string> {
    if (!this.apiKey) {
      console.error('API Key for AI is missing!');
      return 'Sorry, the AI service is not configured.';
    }

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    };

    const body = {
      model: 'gpt-3.5-turbo',
      messages: history,
      temperature: 0.7,
    };

    try {
      const response: any = await lastValueFrom(
        this.http.post(this.chatApiUrl, body, { headers })
      );

      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error calling external AI API:', error);
      return 'Sorry, the AI is currently unavailable. Please try again later.';
    }
  }
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

  updateConversationTitle(conversationId: string, title: string) {
    return this.supabase
      .from('conversations')
      .update({ title })
      .eq('id', conversationId);
  }
}
