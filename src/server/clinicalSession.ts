import { GoogleGenAI } from '@google/genai';
import { buildClinicalSummary, refineSummaryWithLLM, sanitizeActiveCase, shouldRefineSummary } from './clinicalSummary';
import {
  applyPregnancyProfileToPatientProfile,
  inferActiveCase,
  inferPatientProfile,
  updateCaseAfterAssistantTurn,
} from './profileInference';
import { getSession, Session, updateSession } from './sessionStore';
import { ClinicalAction, MedicineConfidence, PregnancyProfile, UserTurnKind } from '../types';

const DEFAULT_REPLY = 'Mepa wo kyɛw, san ka nea ɛrekɔ so no bio ma mente ase yiye.';

export interface ParsedClinicalResponse {
  action: ClinicalAction;
  reply: string;
  identifiedMedicine?: string;
  confidence?: MedicineConfidence;
}

type ConversationLogRole = 'user' | 'assistant';

interface ConversationLogPayload {
  sessionId: string;
  role: ConversationLogRole;
  content: string;
  action?: ClinicalAction;
  source?: 'chat' | 'medicine' | 'system';
  meta?: Record<string, unknown>;
}

export function logConversationTurn(payload: ConversationLogPayload): void {
  console.log(JSON.stringify({
    type: 'conversation_turn',
    timestamp: new Date().toISOString(),
    sessionId: payload.sessionId,
    role: payload.role,
    source: payload.source || 'chat',
    action: payload.action || null,
    content: payload.content,
    meta: payload.meta || {},
  }));
}

function trimSessionMessages(session: Session): void {
  if (session.messages.length > 6) {
    session.messages = session.messages.slice(-6);
  }
}

export function normalizeAction(value?: string): ClinicalAction {
  const normalized = (value || 'probe').trim().toLowerCase();

  if (normalized === 'routine' || normalized === 'urgent' || normalized === 'emergency') {
    return normalized;
  }

  return 'probe';
}

function normalizeConfidence(value?: string): MedicineConfidence | undefined {
  const normalized = (value || '').trim().toLowerCase();

  if (normalized === 'low' || normalized === 'medium' || normalized === 'high') {
    return normalized;
  }

  return undefined;
}

export function extractClinicalResponse(text: string): ParsedClinicalResponse {
  const cleaned = (text || '')
    .trim()
    .replace(/```json\s*/gi, '')
    .replace(/```/g, '')
    .trim();

  const parse = (value: string): ParsedClinicalResponse | null => {
    try {
      const data = JSON.parse(value);

      if (!data || typeof data !== 'object') {
        return null;
      }

      const identifiedMedicine =
        typeof data.identified_medicine === 'string'
          ? data.identified_medicine.trim()
          : undefined;

      return {
        action: normalizeAction(typeof data.action === 'string' ? data.action : undefined),
        reply: typeof data.reply === 'string' && data.reply.trim() ? data.reply.trim() : DEFAULT_REPLY,
        identifiedMedicine: identifiedMedicine || undefined,
        confidence: normalizeConfidence(typeof data.confidence === 'string' ? data.confidence : undefined),
      };
    } catch {
      return null;
    }
  };

  const direct = parse(cleaned);
  if (direct) {
    return direct;
  }

  const match = cleaned.match(/\{[\s\S]*\}/);
  const extracted = match ? parse(match[0]) : null;

  return extracted || {
    action: 'probe',
    reply: cleaned || DEFAULT_REPLY,
  };
}

export async function recordUserTurn(
  ai: GoogleGenAI,
  sessionId: string,
  userText: string,
  options?: { rawUserText?: string; turnKind?: UserTurnKind },
): Promise<Session> {
  const session = getSession(sessionId);

  logConversationTurn({
    sessionId,
    role: 'user',
    content: options?.rawUserText || userText,
    meta: options?.turnKind ? { turnKind: options.turnKind, normalizedText: userText } : undefined,
  });

  inferPatientProfile(userText, session.patientProfile);
  session.activeCase.latestUserTurnKind = options?.turnKind || 'continuation';
  session.activeCase.latestUserTurnRaw = options?.rawUserText || userText;
  inferActiveCase(userText, session.activeCase, options?.turnKind);
  session.activeCase = sanitizeActiveCase(session.activeCase);
  session.clinical_summary = buildClinicalSummary(session.patientProfile, session.activeCase);

  if (shouldRefineSummary(session.messages.length + 1)) {
    session.activeCase = await refineSummaryWithLLM(
      ai,
      session.patientProfile,
      session.activeCase,
      session.messages,
    );
    session.clinical_summary = buildClinicalSummary(session.patientProfile, session.activeCase);
  }

  session.messages.push({ role: 'user', content: userText });
  trimSessionMessages(session);

  updateSession(sessionId, session);
  return session;
}

export function persistAssistantTurn(
  sessionId: string,
  reply: string,
  action: ClinicalAction,
  identifiedMedicine?: string,
): Session {
  const session = getSession(sessionId);

  updateCaseAfterAssistantTurn(session.activeCase, action, reply);

  if (identifiedMedicine) {
    session.activeCase.adviceAlreadyGiven = Array.from(
      new Set([...(session.activeCase.adviceAlreadyGiven || []), `medicine:${identifiedMedicine}`]),
    );
  }

  session.messages.push({ role: 'model', content: reply });
  trimSessionMessages(session);
  session.activeCase = sanitizeActiveCase(session.activeCase);
  session.clinical_summary = buildClinicalSummary(session.patientProfile, session.activeCase);

  logConversationTurn({
    sessionId,
    role: 'assistant',
    content: reply,
    action,
    source: identifiedMedicine ? 'medicine' : 'chat',
    meta: identifiedMedicine ? { identifiedMedicine } : undefined,
  });

  updateSession(sessionId, session);
  return session;
}

export function applyPregnancyProfile(
  sessionId: string,
  pregnancyProfile: PregnancyProfile,
): Session {
  const session = getSession(sessionId);

  applyPregnancyProfileToPatientProfile(
    session.patientProfile,
    pregnancyProfile.isPregnant,
    pregnancyProfile.selectedMonth,
    pregnancyProfile.answeredAt,
  );

  session.clinical_summary = buildClinicalSummary(session.patientProfile, session.activeCase);
  updateSession(sessionId, session);
  return session;
}
