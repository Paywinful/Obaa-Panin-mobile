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
export type UserTurnKind = 'answer' | 'continuation' | 'new_concern' | 'unclear';

export interface PregnancyProfile {
  isPregnant: boolean;
  selectedMonth: number | null;
  isPostpartum?: boolean | null;
  isBreastfeeding?: boolean | null;
  answeredAt: number;
}

export interface PatientProfile {
  isPregnant: boolean | null;
  pregnancyStartDate?: string | null;
  gestationalWeeks?: number | null;
  isPostpartum?: boolean | null;
  deliveryDate?: string | null;
  isBreastfeeding?: boolean | null;
  pregnancyAnsweredAt?: number | null;
  pregnancySelectedMonth?: number | null;
}

export interface ActiveCaseState {
  mainSymptom?: string;
  onset?: string;
  severity?: string;
  dangerSignsKnown?: string[];
  symptomsStillActive?: string[];
  adviceAlreadyGiven?: string[];
  probeTurnsUsed: number;
  triageLevel?: ClinicalAction;
  pendingPreviousProblemCheck?: boolean;
  previousProblemSymptom?: string;
  previousProblemFollowUpAsked?: boolean;
  queuedConcern?: string;
  queuedConcernSymptom?: string;
  queuedConcernToAddress?: string;
  lastAssistantQuestion?: string;
  latestUserTurnKind?: UserTurnKind;
  latestUserTurnRaw?: string;
}

export interface PromptContext {
  profile?: PatientProfile;
  caseState?: ActiveCaseState;
  language?: 'ak' | 'en';
  isFreshConversation?: boolean;
}

export interface ChatRequest {
  messages: Message[];
  language?: LanguageCode;
  sessionId?: string;
  pregnancyProfile?: PregnancyProfile | null;
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
