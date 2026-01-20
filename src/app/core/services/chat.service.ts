import { inject, Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SupabaseClient, PostgrestSingleResponse } from '@supabase/supabase-js';
import { Conversation, GeminiResponse, Message } from '../models/chat.model';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private readonly supabaseService = inject(SupabaseService);
  private readonly http = inject(HttpClient);
  private readonly notify = inject(NotificationService);

  private supabase: SupabaseClient = this.supabaseService.getClient();
  private chatApiUrl: string = environment.chatApiUrl;
  private apiKey: string = environment.geminiApiKey;

  constructor() {}

  async getAiResponse(
    history: { role: string; content: string }[],
  ): Promise<string | null> {
    if (!this.apiKey) {
      this.notify.error('Gemini API Key is missing.');
      return null;
    }

    const url = `${this.chatApiUrl}?key=${this.apiKey}`;
    const body = {
      contents: history.map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : msg.role,
        parts: [{ text: msg.content }],
      })),
    };

    try {
      const response = await lastValueFrom(
        this.http.post<GeminiResponse>(url, body),
      );

      const text = response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      if (!text) {
        this.notify.error('AI returned an empty response.');
        return null;
      }

      return text;
    } catch (error: any) {
      const errorMsg =
        error.status === 429
          ? 'Rate limit exceeded.'
          : 'Failed to connect to AI Service.';

      this.notify.error(errorMsg);
      return null;
    }
  }

  createConversation(userId: string, title: string) {
    return this.supabase
      .from('conversations')
      .insert({ user_id: userId, title })
      .select()
      .returns<Conversation[]>();
  }

  getConversations(userId: string) {
    return this.supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .returns<Conversation[]>();
  }

  async sendMessage(
    conversationId: string,
    userId: string,
    role: string,
    content: string,
  ) {
    const newMessage: Partial<Message> = {
      conversation_id: conversationId,
      user_id: userId,
      role: role as 'user' | 'assistant',
      content,
    };

    const response = await this.supabase
      .from('messages')
      .insert(newMessage)
      .select()
      .returns<Message[]>();

    if (response.error) {
      this.notify.error('Failed to save message.');
    }

    return response;
  }

  getMessages(conversationId: string) {
    return this.supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .returns<Message[]>();
  }

  async updateConversationTitle(
    conversationId: string,
    newTitle: string,
  ): Promise<PostgrestSingleResponse<null>> {
    const response = await this.supabase
      .from('conversations')
      .update({ title: newTitle })
      .eq('id', conversationId);

    if (response.error) {
      this.notify.error('Failed to update title.');
    } else {
      this.notify.success('Title updated.');
    }

    return response;
  }
}
