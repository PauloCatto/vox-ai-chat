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
  private apiKey = environment.geminiApiKey;

  constructor(private supabaseService: SupabaseService) {}

  async getAiResponse(
    history: { role: string; content: string }[]
  ): Promise<string> {
    if (!this.apiKey) {
      console.error('API Key for AI is missing!');
      throw new Error('AI service is not configured.');
    }

    const mappedHistory = history.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : msg.role,
      parts: [{ text: msg.content }],
    }));

    const body = {
      contents: mappedHistory,
      generationConfig: {
        temperature: 0.7,
      },
    };

    const url = `${this.chatApiUrl}?key=${this.apiKey}`;

    try {
      const response: any = await lastValueFrom(this.http.post(url, body));

      if (response?.candidates?.[0]?.content?.parts?.[0]?.text) {
        return response.candidates[0].content.parts[0].text.trim();
      } else {
        console.error(
          'Gemini API returned response without text content:',
          response
        );
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
      .select();
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
    return this.supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        user_id: userId,
        role,
        content,
      })
      .select();
  }

  getMessages(conversationId: string) {
    return this.supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
  }

  async updateConversationTitle(
    conversationId: string,
    newTitle: string
  ): Promise<{ data: any; error: any }> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('conversations')
      .update({ title: newTitle })
      .eq('id', conversationId);

    return { data, error };
  }
}
