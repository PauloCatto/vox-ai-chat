import { inject, Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SupabaseClient, PostgrestSingleResponse } from '@supabase/supabase-js';
import { Conversation, GeminiResponse, Message } from '../models/chat.model';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private supabase: SupabaseClient = this.supabaseService.getClient();
  private http: HttpClient = inject(HttpClient);
  private chatApiUrl: string = environment.chatApiUrl;
  private apiKey: string = environment.geminiApiKey;

  constructor(private supabaseService: SupabaseService) {}

  async getAiResponse(
    history: { role: string; content: string }[],
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('AI service is not configured.');
    }

    const mappedHistory = history.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : msg.role,
      parts: [{ text: msg.content }],
    }));

    const body = {
      contents: mappedHistory,
      generationConfig: { temperature: 0.7 },
    };

    const url = `${this.chatApiUrl}?key=${this.apiKey}`;

    try {
      const response = await lastValueFrom(
        this.http.post<GeminiResponse>(url, body),
      );

      const text = response?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        return text.trim();
      } else {
        throw new Error('AI response was blocked or empty.');
      }
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      throw error;
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

  sendMessage(
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

    return this.supabase
      .from('messages')
      .insert(newMessage)
      .select()
      .returns<Message[]>();
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
    return await this.supabase
      .from('conversations')
      .update({ title: newTitle })
      .eq('id', conversationId);
  }
}
