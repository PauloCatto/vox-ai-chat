export interface Message {
  id: string;
  user_id: string;
  conversation_id: string;
  role?: 'user' | 'assistant' | 'model';
  content: string;
  created_at?: string;
}

export interface Conversation {
  id: string;
  title: string;
  user_id: string;
  created_at: string;
}

export interface GeminiResponse {
  candidates: {
    content: {
      parts: { text: string }[];
      role: string;
    };
    finishReason: string;
    index: number;
    safetyRatings: any[];
  }[];
  usageMetadata: any;
}
