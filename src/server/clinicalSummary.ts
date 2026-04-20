import { GoogleGenAI } from '@google/genai';
import { ActiveCaseState, PatientProfile, PromptContext } from '../types';
import { SessionMessage } from './sessionStore';
import { buildPromptContext } from '../utils/systemPrompt';

const SUMMARY_REFINE_EVERY = 4;

const SUMMARY_REFINER_PROMPT = `You update a compact structured active-case summary for a maternal-health clinician assistant.

Rules:
- Return ONLY valid JSON
- Keep only clinically relevant current-case details
- Focus on the user's latest concern
- Do not carry forward old symptoms unless still clinically active
- Do not invent facts

Return this shape:
{
  "mainSymptom": string | null,
  "onset": string | null,
  "severity": string | null,
  "dangerSignsKnown": string[],
  "symptomsStillActive": string[],
  "adviceAlreadyGiven": string[],
  "probeTurnsUsed": number,
  "triageLevel": "probe" | "routine" | "urgent" | "emergency"
}`;

function dedupe(values: string[] | undefined): string[] {
  return values ? Array.from(new Set(values)).slice(-5) : [];
}

export function sanitizeActiveCase(caseState: ActiveCaseState): ActiveCaseState {
  const main = caseState.mainSymptom?.toLowerCase();
  const activeSymptoms = dedupe(caseState.symptomsStillActive).filter((symptom) => {
    if (!main) return true;
    return symptom.toLowerCase() === main || caseState.dangerSignsKnown?.includes(symptom);
  });

  return {
    ...caseState,
    dangerSignsKnown: dedupe(caseState.dangerSignsKnown),
    symptomsStillActive: activeSymptoms,
    adviceAlreadyGiven: dedupe(caseState.adviceAlreadyGiven),
  };
}

export function buildClinicalSummary(
  patientProfile: PatientProfile,
  activeCase: ActiveCaseState,
): string {
  const promptContext: PromptContext = {
    profile: patientProfile,
    caseState: sanitizeActiveCase(activeCase),
  };

  return buildPromptContext(promptContext);
}

export async function refineSummaryWithLLM(
  ai: GoogleGenAI,
  patientProfile: PatientProfile,
  activeCase: ActiveCaseState,
  recentMessages: SessionMessage[],
): Promise<ActiveCaseState> {
  try {
    const conversationLines = recentMessages
      .slice(-6)
      .map((m) => `${m.role === 'model' ? 'Assistant' : 'User'}: ${m.content}`)
      .join('\n');

    const existingCase = JSON.stringify(sanitizeActiveCase(activeCase), null, 2);
    const profileBlock = buildPromptContext({ profile: patientProfile });
    const prompt = `${SUMMARY_REFINER_PROMPT}\n\n${profileBlock}\n\nExisting active case:\n${existingCase}\n\nRecent conversation:\n${conversationLines}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const parsed = JSON.parse(response.text || '{}') as Partial<ActiveCaseState>;
    return sanitizeActiveCase({
      mainSymptom: parsed.mainSymptom ?? activeCase.mainSymptom,
      onset: parsed.onset ?? activeCase.onset,
      severity: parsed.severity ?? activeCase.severity,
      dangerSignsKnown: Array.isArray(parsed.dangerSignsKnown) ? parsed.dangerSignsKnown : activeCase.dangerSignsKnown,
      symptomsStillActive: Array.isArray(parsed.symptomsStillActive) ? parsed.symptomsStillActive : activeCase.symptomsStillActive,
      adviceAlreadyGiven: Array.isArray(parsed.adviceAlreadyGiven) ? parsed.adviceAlreadyGiven : activeCase.adviceAlreadyGiven,
      probeTurnsUsed: typeof parsed.probeTurnsUsed === 'number' ? parsed.probeTurnsUsed : activeCase.probeTurnsUsed,
      triageLevel: parsed.triageLevel ?? activeCase.triageLevel,
    });
  } catch (err) {
    console.error('Summary refinement failed:', err);
    return sanitizeActiveCase(activeCase);
  }
}

export function shouldRefineSummary(turnCount: number): boolean {
  return turnCount > 0 && turnCount % SUMMARY_REFINE_EVERY === 0;
}
