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
  private apiKey: string = environment.geminiApiKey;

  private readonly baseUrl = environment.chatApiUrl;

  constructor() { }

  async getAiResponse(
    history: { role: string; content: string }[],
    image?: { mimeType: string, data: string }
  ): Promise<string | null> {
    if (!this.apiKey) {
      this.notify.error('Gemini API Key is missing.');
      return null;
    }

    const url = `${this.baseUrl}:generateContent?key=${this.apiKey}`;

    const contents = history.map((msg) => ({
      role: msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    if (image && contents.length > 0 && contents[contents.length - 1].role === 'user') {
      contents[contents.length - 1].parts.push({
        inline_data: {
          mime_type: image.mimeType,
          data: image.data
        }
      } as any);
    }

    const body = { contents };

    try {
      const response = await lastValueFrom(
        this.http.post<GeminiResponse>(url, body)
      );

      return response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
    } catch (error: any) {
      console.error('Erro na API:', error);
      this.notify.error(`Erro ${error.status}: Verifique se o modelo está disponível na sua região.`);
      return null;
    }
  }

  async *streamAiResponse(
    history: { role: string; content: string }[],
    image?: { mimeType: string, data: string }
  ): AsyncIterable<string> {
    if (!this.apiKey) return;

    const url = `${this.baseUrl}:streamGenerateContent?key=${this.apiKey}`;

    const contents = history.map((msg) => ({
      role: msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    if (image && contents.length > 0 && contents[contents.length - 1].role === 'user') {
      contents[contents.length - 1].parts.push({
        inline_data: {
          mime_type: image.mimeType,
          data: image.data
        }
      } as any);
    }

    const body = { contents };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const err = await response.json();
        console.error('Erro no Stream:', err);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        let startBracket = buffer.indexOf('{');
        while (startBracket !== -1) {
          let bracketCount = 0;
          let endBracket = -1;

          for (let i = startBracket; i < buffer.length; i++) {
            if (buffer[i] === '{') bracketCount++;
            else if (buffer[i] === '}') bracketCount--;

            if (bracketCount === 0) {
              endBracket = i;
              break;
            }
          }

          if (endBracket !== -1) {
            const jsonStr = buffer.substring(startBracket, endBracket + 1);
            try {
              const json = JSON.parse(jsonStr);
              const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) yield text;
            } catch (e) { }
            buffer = buffer.substring(endBracket + 1);
            startBracket = buffer.indexOf('{');
          } else {
            break;
          }
        }
      }
    } catch (error) {
      console.error('Streaming error:', error);
    }
  }

  createConversation(userId: string, title: string) {
    return this.supabase.from('conversations').insert({ user_id: userId, title }).select().returns<Conversation[]>();
  }

  getConversations(userId: string) {
    return this.supabase.from('conversations').select('*').eq('user_id', userId).returns<Conversation[]>();
  }

  async sendMessage(conversationId: string, userId: string, role: string, content: string) {
    const newMessage: Partial<Message> = {
      conversation_id: conversationId,
      user_id: userId,
      role: role as 'user' | 'assistant',
      content,
    };
    return await this.supabase.from('messages').insert(newMessage).select().returns<Message[]>();
  }

  getMessages(conversationId: string) {
    return this.supabase.from('messages').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: true }).returns<Message[]>();
  }

  async updateConversationTitle(conversationId: string, newTitle: string) {
    return await this.supabase.from('conversations').update({ title: newTitle }).eq('id', conversationId);
  }
}