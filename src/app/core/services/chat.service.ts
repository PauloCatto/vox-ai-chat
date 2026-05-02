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
  private readonly proxyUrl = environment.geminiProxyUrl;

  //Retry delays in ms: 2s → 5s → 10s
  private readonly RETRY_DELAYS = [2000, 5000, 10000];
  private readonly MAX_RETRIES = 3;

  private readonly GEMINI_TOOLS = [{
    functionDeclarations: [
      {
        name: "get_current_time",
        description: "Obtém a data, hora exata atual e timezone.",
      },
      {
        name: "get_weather",
        description: "Obtém a previsão do tempo atual para uma cidade especificada.",
        parameters: {
          type: "OBJECT",
          properties: {
            location: { type: "STRING", description: "O nome da cidade (ex: São Paulo, Rio de Janeiro)" }
          },
          required: ["location"]
        }
      },
      {
        name: "calculate_math",
        description: "Resolve expressões matemáticas complexas.",
        parameters: {
          type: "OBJECT",
          properties: {
            expression: { type: "STRING", description: "Expressão matemática válida em eval() (ex: 2+2*(10/5))" }
          },
          required: ["expression"]
        }
      }
    ]
  }];

  private localTools: Record<string, Function> = {
    get_current_time: () => {
      const now = new Date();
      return {
        date: now.toLocaleDateString('pt-BR'),
        time: now.toLocaleTimeString('pt-BR'),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
    },
    get_weather: (args: { location: string }) => {
      const mockTemps = [22, 25, 28, 30, 18, 15, 32];
      const temp = mockTemps[Math.floor(Math.random() * mockTemps.length)];
      return {
        location: args.location,
        temperature: `${temp}ºC`,
        condition: temp > 25 ? "Ensolarado" : "Pancadas de chuva"
      };
    },
    calculate_math: (args: { expression: string }) => {
      try {
        const result = new Function(`return ${args.expression}`)();
        return { result };
      } catch (e) {
        return { error: "Expressão matemática inválida." };
      }
    }
  };

  constructor() { }

  private isRetryableStatus(status: number): boolean {
    return status === 429 || status === 400 || status === 503;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getAiResponse(
    history: { role: string; content: string }[],
    image?: { mimeType: string, data: string }
  ): Promise<string | null> {
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

    const systemInstruction = {
      parts: [{ text: "Você é um agente autônomo inteligente do Vox AI. Você é um assistente virtual útil e capaz de responder a perguntas sobre qualquer assunto (conhecimentos gerais, ciência, etc). Você possui ferramentas (tools) para buscar dados atualizados do mundo real. SEMPRE invoque as ferramentas apropriadas se o usuário perguntar as horas, clima, ou quiser realizar cálculos matemáticos avançados. Para outros assuntos, tente compreender possíveis erros de digitação e responda usando seu amplo conhecimento interno." }]
    };

    const body = { contents, systemInstruction, tools: this.GEMINI_TOOLS, stream: false };

    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const response = await lastValueFrom(
          this.http.post<GeminiResponse>(this.proxyUrl, body)
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

        console.error('Erro na API (proxy):', error);
        this.notify.error(`Erro ${status}: Serviço temporariamente indisponível. Tente novamente.`);
        return null;
      }
    }

    return null;
  }

  async *streamAiResponse(
    history: { role: string; content: string }[],
    image?: { mimeType: string, data: string }
  ): AsyncIterable<string> {
    const url = this.proxyUrl;

    const systemInstruction = {
      parts: [{ text: "Você é um agente autônomo e assistente virtual geral do Vox AI. Responda a perguntas sobre qualquer assunto da melhor forma possível, interpretando possíveis erros de digitação. Você possui ferramentas (tools) para buscar dados em tempo real. Priorize USAR A FERRAMENTA se o contexto pedir por horas locais, clima de cidades ou matemática. Para todo o resto (como perguntas sobre medicamentos, conceitos, etc), responda normalmente usando seu próprio conhecimento." }]
    };

    let contents: any[] = history.map((msg) => ({
      role: msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    if (image && contents.length > 0 && contents[contents.length - 1].role === 'user') {
      contents[contents.length - 1].parts.push({
        inline_data: {
          mime_type: image.mimeType,
          data: image.data
        }
      });
    }

    let isAgentLooping = true;

    while (isAgentLooping) {
      isAgentLooping = false;

      const bodyPayload = {
        contents,
        systemInstruction,
        tools: this.GEMINI_TOOLS,
        stream: true
      };

      const body = JSON.stringify(bodyPayload);
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
        let functionCalls: any[] = [];

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
                const part = json?.candidates?.[0]?.content?.parts?.[0];

                if (part?.text) {
                  yield part.text;
                }

                if (part?.functionCall) {
                  functionCalls.push(part.functionCall);
                }
              } catch (e) { }
              buffer = buffer.substring(endBracket + 1);
              startBracket = buffer.indexOf('{');
            } else {
              break;
            }
          }
        }

        if (functionCalls.length > 0) {
          const uniqueCalls = new Map();
          for (const fc of functionCalls) {
            uniqueCalls.set(fc.name, fc);
          }

          const modelParts: any[] = [];
          const functionResponsesParts: any[] = [];

          for (const fc of uniqueCalls.values()) {
            console.log(`[Agent] Rodou Tool: ${fc.name}`, fc.args);
            modelParts.push({ functionCall: fc });

            let result;
            if (this.localTools[fc.name]) {
              result = await Promise.resolve(this.localTools[fc.name](fc.args || {}));
            } else {
              result = { error: "Unknown tool" };
            }

            functionResponsesParts.push({
              functionResponse: {
                name: fc.name,
                response: result
              }
            });
          }

          contents.push({ role: 'model', parts: modelParts });
          contents.push({ role: 'user', parts: functionResponsesParts });

          isAgentLooping = true;
        }

      } catch (error) {
        console.error('Streaming error:', error);
      }
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