import { GoogleGenAI } from '@google/genai';
import { extractClinicalResponse, persistAssistantTurn, recordUserTurn } from '../../src/server/clinicalSession';
// import { buildPromptWithSummary } from '../../src/utils/systemPrompt';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const MODEL = 'gemini-3.1-flash-lite-preview';

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const { messages, language = 'twi', sessionId = 'default' } = body;

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
    const userText = lastMessage.content;
    const session = await recordUserTurn(ai, sessionId, userText);
    const pregnancyContext =
      session.profile.pregnancy_status === 'pregnant'
        ? `Pregnancy context: user is pregnant. ${session.profile.gestational_age || ''}`
        : session.profile.pregnancy_status === 'not_pregnant'
          ? 'Pregnancy context: user said she is not pregnant.'
          : '';
    // const systemPrompt = buildPromptWithSummary(session.clinical_summary, language);
    const contents = [
      {
        role: 'user',
        parts: [{
          text:
            `${pregnancyContext ? `${pregnancyContext}\n\n` : ''}${userText}\n\n` +
            `Respond in Asante Twi only. `,
        }],
      },
    ];

    const result = await ai.models.generateContent({
      model: MODEL,
      // config: { systemInstruction: systemPrompt },
      contents,
    });

    const rawText = result.text?.trim() || '';
    const parsed = extractClinicalResponse(rawText);
    const action = parsed.action;
    const reply = parsed.reply;

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
