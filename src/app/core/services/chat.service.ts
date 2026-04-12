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

  //Retry delays in ms: 2s → 5s → 10s
  private readonly RETRY_DELAYS = [2000, 5000, 10000];
  private readonly MAX_RETRIES = 3;

  constructor() { }


  //Checks if an HTTP status code is retryable (rate limit or transient error).

  private isRetryableStatus(status: number): boolean {
    return status === 429 || status === 400 || status === 503;
  }

  //Waits for the specified number of milliseconds.

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

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

    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const response = await lastValueFrom(
          this.http.post<GeminiResponse>(url, body)
        );
        return response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
      } catch (error: any) {
        const status = error?.status || error?.error?.code;

        if (this.isRetryableStatus(status) && attempt < this.MAX_RETRIES) {
          const waitTime = this.RETRY_DELAYS[attempt];
          console.warn(`[ChatService] Attempt ${attempt + 1}/${this.MAX_RETRIES} failed (${status}). Retrying in ${waitTime / 1000}s...`);
          await this.delay(waitTime);
          continue;
        }

        console.error('Erro na API:', error);
        this.notify.error(`Erro ${status}: Verifique se o modelo está disponível na sua região.`);
        return null;
      }
    }

    return null;
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

    const body = JSON.stringify({ contents });
    let response: Response | null = null;

    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        });

        if (response.ok) {
          break;
        }

        if (this.isRetryableStatus(response.status) && attempt < this.MAX_RETRIES) {
          const waitTime = this.RETRY_DELAYS[attempt];
          console.warn(
            `[ChatService] Stream attempt ${attempt + 1}/${this.MAX_RETRIES} failed (${response.status}). Retrying in ${waitTime / 1000}s...`
          );
          await this.delay(waitTime);
          response = null;
          continue;
        }

        const err = await response.json().catch(() => ({}));
        console.error('Erro no Stream:', response.status, err);
        this.notify.error(
          `A IA está temporariamente indisponível (${response.status}). Tente novamente em alguns segundos.`
        );
        return;
      } catch (fetchError) {
        if (attempt < this.MAX_RETRIES) {
          const waitTime = this.RETRY_DELAYS[attempt];
          console.warn(`[ChatService] Network error on attempt ${attempt + 1}. Retrying in ${waitTime / 1000}s...`);
          await this.delay(waitTime);
          continue;
        }
        console.error('Streaming network error:', fetchError);
        return;
      }
    }

    if (!response || !response.ok) return;

    try {
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