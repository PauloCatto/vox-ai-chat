export interface Message {
  id: string;
  user_id: string;
  conversation_id: string;
  role?: 'user' | 'assistant' | 'model';
  content: string;
  created_at?: string;
  image_url?: string;
}

export interface Conversation {
  id: string;
  title: string;
  user_id: string;
  created_at: string;
}

export interface GeminiResponseCandidate {
  content: {
    parts: { text?: string; functionCall?: GeminiFunctionCall }[];
    role: string;
  };
  finishReason?: string;
  index?: number;
}

export interface GeminiResponse {
  candidates?: GeminiResponseCandidate[];
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}

export interface GeminiFunctionCall {
  name: string;
  args: Record<string, any>;
}

export interface ImageAttachment {
  mimeType: string;
  data: string;
}

export interface SpeechRecognitionEvent extends Event {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
        confidence: number;
      };
      isFinal: boolean;
    };
    length: number;
  };
  resultIndex: number;
}

export interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

