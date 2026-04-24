import { GoogleGenAI } from '@google/genai';
import {
  applyPregnancyProfile,
  extractClinicalResponse,
  logConversationTurn,
  persistAssistantTurn,
  recordUserTurn,
} from '../../src/server/clinicalSession';
import { detectMainSymptom } from '../../src/server/profileInference';
import { getSession } from '../../src/server/sessionStore';
import { PregnancyProfile, UserTurnKind } from '../../src/types';
import { buildPromptContext, buildPromptWithSummary } from '../../src/utils/systemPrompt';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const MODEL = 'gemini-2.5-flash';

type YesNoAnswer = 'yes' | 'no';

function isValidPregnancyProfile(value: unknown): value is PregnancyProfile {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const profile = value as PregnancyProfile;
  return (
    typeof profile.isPregnant === 'boolean' &&
    (profile.selectedMonth === null || (Number.isInteger(profile.selectedMonth) && profile.selectedMonth >= 1 && profile.selectedMonth <= 9)) &&
    (profile.isPostpartum == null || typeof profile.isPostpartum === 'boolean') &&
    (profile.isBreastfeeding == null || typeof profile.isBreastfeeding === 'boolean') &&
    typeof profile.answeredAt === 'number'
  );
}

function buildTurnInstruction(userText: string, effectiveProbes: number, knownDangerSigns: string[]): string {
  if (effectiveProbes >= 1 && knownDangerSigns.length === 0) {
    return `${userText}\n\nMANDATORY: You have already asked a clarifying question. You MUST give practical advice now. Do NOT ask another question. Set action to "routine".`;
  }

  return userText;
}

function buildUserTurnText(
  userText: string,
  effectiveProbes: number,
  knownDangerSigns: string[],
  pendingPreviousProblemCheck: boolean | undefined,
  previousProblemFollowUpAsked: boolean | undefined,
  previousProblemSymptom: string | undefined,
  queuedConcernToAddress: string | undefined,
): string {
  if (pendingPreviousProblemCheck && !previousProblemFollowUpAsked) {
    return `${userText}\n\nIMPORTANT: The user has raised a new concern, but before addressing it, ask one short question about how she is feeling now regarding the previous problem: ${previousProblemSymptom || 'the previous problem'}. Do not address the new concern yet.`;
  }

  if (queuedConcernToAddress) {
    return `${userText}\n\nIMPORTANT: The user previously raised this new concern: ${queuedConcernToAddress}. The follow-up on the previous problem has been done. Address the queued concern now with practical guidance.`;
  }

  return buildTurnInstruction(userText, effectiveProbes, knownDangerSigns);
}

function isLikelyUnclearReply(userText: string): boolean {
  const text = userText.trim().toLowerCase();

  if (!text) {
    return true;
  }

  if (/^(hmm+|eh+|haa+|hello+|test+)$/.test(text)) {
    return true;
  }

  if (/^(i don't know|dont know|not sure|me nnim|mennim|mente ase|what|pardon|come again)$/.test(text)) {
    return true;
  }

  return false;
}

function normalizeYesNoAnswer(userText: string): YesNoAnswer | undefined {
  const text = userText.trim().toLowerCase();

  if (/^(yes|yep|yeah|aane|ane|oo)$/.test(text)) {
    return 'yes';
  }

  if (/^(no|nope|daabi|dabi)$/.test(text)) {
    return 'no';
  }

  return undefined;
}

function contextualizeShortAnswer(userText: string, previousAssistantMessage?: string): string {
  const answer = normalizeYesNoAnswer(userText);
  const previous = previousAssistantMessage?.trim().toLowerCase() || '';

  if (!answer || !previous) {
    return userText;
  }

  if (/ani so|blur|fitaa|kusuu/.test(previous)) {
    return answer === 'yes'
      ? 'yes, I have blurred vision with this headache'
      : 'no, I do not have blurred vision with this headache';
  }

  if (/blood|mogya|bleeding/.test(previous)) {
    return answer === 'yes'
      ? 'yes, I have bleeding'
      : 'no, I do not have bleeding';
  }

  if (/breathing|ahomegye|home y/.test(previous)) {
    return answer === 'yes'
      ? 'yes, I have difficulty breathing'
      : 'no, I do not have difficulty breathing';
  }

  if (/abofra|baby.*moving|movement/.test(previous)) {
    return answer === 'yes'
      ? 'yes, the baby is not moving well'
      : 'no, the baby is moving';
  }

  return userText;
}

function classifyIncomingTurn(
  rawUserText: string,
  activeCase: ReturnType<typeof getSession>['activeCase'],
): UserTurnKind {
  const text = rawUserText.trim();
  const hasKnownQuestion = Boolean(activeCase.lastAssistantQuestion);

  if (!text) {
    return 'unclear';
  }

  if (hasKnownQuestion) {
    if (normalizeYesNoAnswer(text)) {
      return 'answer';
    }

    if (!detectMainSymptom(text) || detectMainSymptom(text) === activeCase.mainSymptom) {
      return 'answer';
    }
  }

  const detectedSymptom = detectMainSymptom(text);
  if (detectedSymptom && activeCase.mainSymptom && detectedSymptom !== activeCase.mainSymptom) {
    return 'new_concern';
  }

  if (detectedSymptom) {
    return 'continuation';
  }

  return hasKnownQuestion ? 'unclear' : 'continuation';
}

function getEffectiveProbes(probeTurnsUsed: number, clientAssistantTurns: number): number {
  return Math.max(probeTurnsUsed, clientAssistantTurns);
}

function shouldForceDirectGuidance(effectiveProbes: number, knownDangerSigns: string[], action: string): boolean {
  return action === 'probe' && effectiveProbes >= 1 && knownDangerSigns.length === 0;
}

function shouldBypassFurtherProbing(effectiveProbes: number, knownDangerSigns: string[]): boolean {
  return effectiveProbes >= 1 && knownDangerSigns.length === 0;
}

async function rewriteAsDirectGuidance(
  systemPrompt: string,
  draftReply: string,
  language: string,
): Promise<string> {
  const rewritePrompt = language === 'en'
    ? `Rewrite this as short, direct, practical guidance. Do not ask any question. Return only JSON with action "routine" and the rewritten reply.\n\nDraft: ${draftReply}`
    : `San kyerɛw mmuae yi ma ɛnyɛ akwankyerɛ tẽẽ, tiawa, na ɛmmoa ntɛm. Mmmisa asɛm biara. Fa JSON nko ara san ba, na action no nyɛ "routine".\n\nDraft: ${draftReply}`;

  const result = await ai.models.generateContent({
    model: MODEL,
    config: { systemInstruction: systemPrompt },
    contents: [{ role: 'user', parts: [{ text: rewritePrompt }] }],
  });

  return extractClinicalResponse(result.text?.trim() || '').reply;
}

async function generateDirectGuidance(
  systemPrompt: string,
  activeComplaint: string,
  latestUserText: string,
  language: string,
): Promise<string> {
  const guidancePrompt = language === 'en'
    ? `Give short, direct, practical guidance for this active complaint. Do not ask any question. Do not restart the consultation. Return only JSON with action "routine".\n\nActive complaint: ${activeComplaint}\nLatest user turn: ${latestUserText}`
    : `Fa akwankyerɛ tẽẽ, tiawa, na ɛboa ntɛm ma yadeɛ yi. Mmmisa asɛm biara. Mfi ase bio sɛ nkɔmmɔ foforo. Fa JSON nko ara san ba, na action no nyɛ "routine".\n\nYareɛ titiriw: ${activeComplaint}\nMmuae a ɔde aba seesei: ${latestUserText}`;

  const result = await ai.models.generateContent({
    model: MODEL,
    config: { systemInstruction: systemPrompt },
    contents: [{ role: 'user', parts: [{ text: guidancePrompt }] }],
  });

  return extractClinicalResponse(result.text?.trim() || '').reply;
}

function buildRepeatReply(language: string): string {
  return language === 'en'
    ? "Sorry, I didn't get that well. Please say it again briefly."
    : 'Mepa wo kyɛw, mante ase yiye. San ka no bio tiawa ma mente ase.';
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const { messages, language = 'twi', sessionId = 'default', pregnancyProfile } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const normalizedMessages = messages
      .filter((message) => message && typeof message.content === 'string')
      .map((message) => ({
        role: message.role === 'assistant' || message.role === 'model' ? 'model' : 'user',
        content: message.content.trim(),
      }))
      .filter((message) => message.content.length > 0);

    if (normalizedMessages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'At least one non-empty message is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const lastMessage = normalizedMessages[normalizedMessages.length - 1];
    const rawUserText = lastMessage.content;

    const hasPregnancyProfile = isValidPregnancyProfile(pregnancyProfile);

    console.log(JSON.stringify({
      type: 'chat_request_meta',
      timestamp: new Date().toISOString(),
      sessionId,
      language,
      messageCount: normalizedMessages.length,
      hasPregnancyProfile,
      pregnancyProfile: hasPregnancyProfile ? pregnancyProfile : null,
    }));

    if (hasPregnancyProfile) {
      applyPregnancyProfile(sessionId, pregnancyProfile);
    }

    const existingSession = getSession(sessionId);
    const previousAssistantMessage = [...existingSession.messages]
      .reverse()
      .find((message) => message.role === 'model')?.content;
    const turnKind = classifyIncomingTurn(rawUserText, existingSession.activeCase);
    const userText = contextualizeShortAnswer(rawUserText, previousAssistantMessage);

    if (
      existingSession.messages.length > 0 &&
      (turnKind === 'unclear' || isLikelyUnclearReply(rawUserText))
    ) {
      const repeatReply = buildRepeatReply(language);
      logConversationTurn({
        sessionId,
        role: 'user',
        content: rawUserText,
        source: 'chat',
        meta: { classifiedAsUnclearReply: true, turnKind },
      });
      logConversationTurn({
        sessionId,
        role: 'assistant',
        content: repeatReply,
        action: 'probe',
        source: 'system',
      });
      return new Response(
        JSON.stringify({
          content: repeatReply,
          action: 'probe',
          is_emergency: false,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const clientAssistantTurns = normalizedMessages.filter((m) => m.role === 'model').length;

    const session = await recordUserTurn(ai, sessionId, userText, {
      rawUserText,
      turnKind,
    });
    const effectiveProbes = getEffectiveProbes(session.activeCase.probeTurnsUsed, clientAssistantTurns);
    const promptContext = buildPromptContext({
      profile: session.patientProfile,
      caseState: session.activeCase,
      language: language === 'en' ? 'en' : 'ak',
      isFreshConversation: session.messages.length <= 1,
    });
    const systemPrompt = buildPromptWithSummary({
      profile: session.patientProfile,
      caseState: session.activeCase,
      language: language === 'en' ? 'en' : 'ak',
      isFreshConversation: session.messages.length <= 1,
    });

    console.log(JSON.stringify({
      type: 'chat_prompt_context',
      timestamp: new Date().toISOString(),
      sessionId,
      patientProfile: session.patientProfile,
      activeCase: session.activeCase,
      promptContextPreview: promptContext.slice(0, 1200),
    }));

    if (shouldBypassFurtherProbing(
      effectiveProbes,
      session.activeCase.dangerSignsKnown || [],
    )) {
      const directReply = await generateDirectGuidance(
        systemPrompt,
        session.activeCase.mainSymptom || rawUserText,
        userText,
        language,
      );

      persistAssistantTurn(sessionId, directReply, 'routine');

      return new Response(
        JSON.stringify({
          content: directReply,
          action: 'routine',
          is_emergency: false,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const contents = session.messages.slice(-6).map((message, index, recentMessages) => {
      const isLatestUserMessage =
        index === recentMessages.length - 1 && message.role !== 'model';

      return {
        role: message.role === 'model' ? 'model' : 'user',
        parts: [{
          text: isLatestUserMessage
            ? buildUserTurnText(
              message.content,
              effectiveProbes,
              session.activeCase.dangerSignsKnown || [],
              session.activeCase.pendingPreviousProblemCheck,
              session.activeCase.previousProblemFollowUpAsked,
              session.activeCase.previousProblemSymptom,
              session.activeCase.queuedConcernToAddress,
            )
            : message.content,
        }],
      };
    });

    const generationContents = promptContext
      ? [
        {
          role: 'user' as const,
          parts: [{
            text: `Structured consultation context. Treat this as source-of-truth state for the consultation.\n\n${promptContext}`,
          }],
        },
        ...contents,
      ]
      : contents;

    const result = await ai.models.generateContent({
      model: MODEL,
      config: { systemInstruction: systemPrompt },
      contents: generationContents,
    });

    const rawText = result.text?.trim() || '';
    const parsed = extractClinicalResponse(rawText);
    let action = parsed.action;
    let reply = parsed.reply;

    if (shouldForceDirectGuidance(
      effectiveProbes,
      session.activeCase.dangerSignsKnown || [],
      action,
    )) {
      reply = await rewriteAsDirectGuidance(systemPrompt, reply, language);
      action = 'routine';
    }

    persistAssistantTurn(sessionId, reply, action);

    return new Response(
      JSON.stringify({
        content: reply,
        action,
        is_emergency: action === 'emergency',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({
        content: 'Mfomso aba wɛ system no mu. Yɛsrɛ wo bɔ mmɔden bio.',
        action: 'probe',
        is_emergency: false,
        error: 'Failed to get response',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
