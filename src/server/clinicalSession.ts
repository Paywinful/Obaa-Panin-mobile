import { GoogleGenAI } from '@google/genai';
import { buildClinicalSummary, refineSummaryWithLLM, shouldRefineSummary } from './clinicalSummary';
import { inferLightProfile } from './profileInference';
import { getSession, Session, updateSession } from './sessionStore';
import { ClinicalAction, MedicineConfidence } from '../types';

const DEFAULT_REPLY = 'Mepa wo kyɛw, san ka nea ɛrekɛ so no bio ma mente ase yiye.';

export interface ParsedClinicalResponse {
  action: ClinicalAction;
  reply: string;
  identifiedMedicine?: string;
  confidence?: MedicineConfidence;
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
): Promise<Session> {
  const session = getSession(sessionId);

  inferLightProfile(userText, session.profile);
  session.profile.user_turn_count += 1;
  session.clinical_summary = buildClinicalSummary(session.profile);

  if (shouldRefineSummary(session.profile.user_turn_count)) {
    session.clinical_summary = await refineSummaryWithLLM(ai, session.clinical_summary, session.messages);
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

  session.profile.last_action = action;
  session.profile.last_advice = reply.slice(0, 220);
  session.profile.open_question = action === 'probe' ? reply.slice(0, 180) : null;

  if (identifiedMedicine) {
    session.profile.last_medicine_discussed = identifiedMedicine;
  }

  session.messages.push({ role: 'model', content: reply });
  trimSessionMessages(session);
  session.clinical_summary = buildClinicalSummary(session.profile);

  updateSession(sessionId, session);
  return session;
}
