import { GoogleGenAI } from '@google/genai';
import { extractClinicalResponse, persistAssistantTurn, recordUserTurn } from '../../src/server/clinicalSession';
import { buildPromptWithSummary } from '../../src/utils/systemPrompt';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const MODEL = 'gemini-2.5-flash';

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

    const lastMessage = messages[messages.length - 1];
    const userText = lastMessage.content;

    const session = await recordUserTurn(ai, sessionId, userText);

    // Build system prompt
    const systemPrompt = buildPromptWithSummary(session.clinical_summary, language);

    // Build Gemini contents from session messages
    const contents = session.messages.map((m) => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    // Call Gemini
    const result = await ai.models.generateContent({
      model: MODEL,
      config: { systemInstruction: systemPrompt },
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
