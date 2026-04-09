import { createPartFromBase64, GoogleGenAI } from '@google/genai';
import { extractClinicalResponse, persistAssistantTurn, recordUserTurn } from '../../src/server/clinicalSession';
import { buildMedicinePromptWithSummary } from '../../src/utils/systemPrompt';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const MODEL = 'gemini-2.5-flash';

function sanitizeMimeType(value?: string): string {
  if (!value) return 'image/jpeg';
  return value.startsWith('image/') ? value : 'image/jpeg';
}

function buildScanSummary(contextNote?: string): string {
  const note = contextNote?.trim();

  if (note) {
    return `Medicine scan request. The user wants maternal health guidance about a medicine photo. Extra note: ${note}`;
  }

  return 'Medicine scan request. The user wants maternal health guidance about a medicine photo.';
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const {
      imageBase64,
      mimeType,
      contextNote = '',
      language = 'twi',
      sessionId = 'default',
    } = body;

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return new Response(
        JSON.stringify({ error: 'imageBase64 is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const userText = buildScanSummary(contextNote);
    const session = await recordUserTurn(ai, sessionId, userText);
    const systemPrompt = buildMedicinePromptWithSummary(session.clinical_summary, language);

    const historyContents = session.messages
      .slice(0, -1)
      .map((message) => ({
        role: message.role === 'model' ? 'model' : 'user',
        parts: [{ text: message.content }],
      }));

    const result = await ai.models.generateContent({
      model: MODEL,
      config: { systemInstruction: systemPrompt },
      contents: [
        ...historyContents,
        {
          role: 'user',
          parts: [
            { text: userText },
            createPartFromBase64(
              imageBase64.replace(/^data:.*;base64,/, ''),
              sanitizeMimeType(mimeType),
            ),
          ],
        },
      ],
    });

    const parsed = extractClinicalResponse(result.text?.trim() || '');
    const identifiedMedicine =
      parsed.identifiedMedicine && parsed.identifiedMedicine.toLowerCase() !== 'unknown'
        ? parsed.identifiedMedicine
        : undefined;

    persistAssistantTurn(sessionId, parsed.reply, parsed.action, identifiedMedicine);

    return new Response(
      JSON.stringify({
        content: parsed.reply,
        action: parsed.action,
        is_emergency: parsed.action === 'emergency',
        identifiedMedicine,
        confidence: parsed.confidence,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Medicine analysis API error:', error);

    return new Response(
      JSON.stringify({
        content: 'Mfomso aba wɔ nnuru mfonini nhwehwɛmu no mu. Yɛsrɛ wo fa mfonini no bio anaa san bɔ mmɔden bio.',
        action: 'probe',
        is_emergency: false,
        error: 'Failed to analyze medicine image',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
