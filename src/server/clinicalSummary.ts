import { GoogleGenAI } from '@google/genai';
import { UserProfile, SessionMessage } from './sessionStore';

const SUMMARY_REFINE_EVERY = 4;

const SUMMARY_REFINER_PROMPT = `You are updating a compact clinical memory summary for a maternal-health chatbot.

Your task:
Refine the existing summary using the recent conversation.

Rules:
- Return ONLY plain text
- Keep it short and structured
- Focus only on clinically relevant context
- Include only facts that were actually stated
- Do not invent symptoms
- Do not add diagnoses
- Capture continuity for future turns

Include these fields where known:
- pregnancy_status
- gestational_age
- postpartum_status
- breastfeeding_status
- main_concern
- latest_update
- last_medicine_discussed
- current_action
- red_flags
- open_question

Format:
CLINICAL SUMMARY:
- pregnancy_status: ...
- gestational_age: ...
- postpartum_status: ...
- breastfeeding_status: ...
- main_concern: ...
- latest_update: ...
- last_medicine_discussed: ...
- current_action: ...
- red_flags: ...
- open_question: ...

If something is unknown, write unknown.`;

export function buildClinicalSummary(profile: UserProfile): string {
  const redFlags = profile.red_flags.length > 0 ? profile.red_flags.join(', ') : 'none';

  return [
    'CLINICAL SUMMARY:',
    `- pregnancy_status: ${profile.pregnancy_status || 'unknown'}`,
    `- gestational_age: ${profile.gestational_age || 'unknown'}`,
    `- postpartum_status: ${profile.postpartum_status || 'unknown'}`,
    `- breastfeeding_status: ${profile.breastfeeding_status || 'unknown'}`,
    `- main_concern: ${profile.main_concern || 'unknown'}`,
    `- latest_update: ${profile.latest_update || 'unknown'}`,
    `- last_medicine_discussed: ${profile.last_medicine_discussed || 'unknown'}`,
    `- current_action: ${profile.last_action || 'unknown'}`,
    `- red_flags: ${redFlags}`,
    `- open_question: ${profile.open_question || 'none'}`,
    '',
    'IMPORTANT:',
    '- This is the same patient continuing the conversation.',
    '- Use this for continuity.',
    '- Do not repeat questions already answered.',
    '- Prioritize ongoing concerns.',
  ].join('\n');
}

export async function refineSummaryWithLLM(
  ai: GoogleGenAI,
  currentSummary: string,
  recentMessages: SessionMessage[],
): Promise<string> {
  try {
    const conversationLines = recentMessages
      .slice(-8)
      .map((m) => `${m.role === 'model' ? 'Assistant' : 'User'}: ${m.content}`)
      .join('\n');

    const prompt = `${SUMMARY_REFINER_PROMPT}\n\nExisting summary:\n${currentSummary}\n\nRecent conversation:\n${conversationLines}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const refined = response.text?.trim() || '';
    if (refined && refined.startsWith('CLINICAL SUMMARY:')) {
      return refined;
    }
  } catch (err) {
    console.error('Summary refinement failed:', err);
  }
  return currentSummary;
}

export function shouldRefineSummary(turnCount: number): boolean {
  return turnCount > 0 && turnCount % SUMMARY_REFINE_EVERY === 0;
}
