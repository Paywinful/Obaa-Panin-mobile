export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  action?: ClinicalAction;
  is_emergency?: boolean;
}

export type AppPhase = 'idle' | 'listening' | 'processing' | 'speaking';
export type LanguageCode = 'twi' | 'en';
export type ClinicalAction = 'probe' | 'routine' | 'urgent' | 'emergency';
export type MedicineConfidence = 'low' | 'medium' | 'high';

export interface ChatRequest {
  messages: Message[];
  language?: LanguageCode;
  sessionId?: string;
}

export interface ChatResponse {
  content: string;
  action?: ClinicalAction;
  is_emergency?: boolean;
  error?: string;
}

export interface MedicineAnalysisRequest {
  imageBase64: string;
  mimeType: string;
  spokenContext?: string;
  language?: LanguageCode;
  sessionId?: string;
}

export interface MedicineAnalysisResponse extends ChatResponse {
  identifiedMedicine?: string;
  confidence?: MedicineConfidence;
}
