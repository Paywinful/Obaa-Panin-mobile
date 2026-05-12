import { extractClinicalResponse, persistAssistantTurn, recordUserTurn } from '../server/clinicalSession';
import { MedicineAnalysisRequest, MedicineAnalysisResponse } from '../types';
import { buildMedicinePromptWithSummary } from '../utils/systemPrompt';
import { createInlineDataPart, createTextPart, geminiClient } from './geminiRuntime';

const MODEL = 'gemini-2.5-flash';

function sanitizeMimeType(value?: string): string {
  if (!value) return 'image/jpeg';
  return value.startsWith('image/') ? value : 'image/jpeg';
}

function buildScanSummary(spokenContext?: string): string {
  const note = spokenContext?.trim();

  if (note) {
    return `Medicine scan request. The user wants maternal health guidance about a medicine photo. Spoken context: ${note}`;
  }

  return 'Medicine scan request. The user wants maternal health guidance about a medicine photo.';
}

export async function analyzeMedicineDirect(
  payload: MedicineAnalysisRequest,
): Promise<MedicineAnalysisResponse> {
  try {
    const {
      imageBase64,
      mimeType,
      spokenContext = '',
      language = 'twi',
      sessionId = 'default',
    } = payload;

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return { content: '', error: 'imageBase64 is required' };
    }

    const userText = buildScanSummary(spokenContext);
    const session = await recordUserTurn(geminiClient as any, sessionId, userText);
    const systemPrompt = buildMedicinePromptWithSummary(session.clinical_summary, language);

    const historyContents = session.messages
      .slice(0, -1)
      .map((message) => ({
        role: message.role === 'model' ? 'model' as const : 'user' as const,
        parts: [createTextPart(message.content)],
      }));

    const result = await geminiClient.models.generateContent({
      model: MODEL,
      systemInstruction: systemPrompt,
      contents: [
        ...historyContents,
        {
          role: 'user',
          parts: [
            createTextPart(userText),
            createInlineDataPart(imageBase64, sanitizeMimeType(mimeType)),
          ],
        },
      ],
    });

    const parsed = extractClinicalResponse(result.text?.trim() || '');
    const identifiedMedicine =
      parsed.identifiedMedicine && parsed.identifiedMedicine.toLowerCase() !== 'unknown'
        ? parsed.identifiedMedicine
        : undefined;

    await persistAssistantTurn(sessionId, parsed.reply, parsed.action, identifiedMedicine);

    return {
      content: parsed.reply,
      action: parsed.action,
      is_emergency: parsed.action === 'emergency',
      identifiedMedicine,
      confidence: parsed.confidence,
    };
  } catch (error) {
    console.error('Direct medicine analysis error:', error);
    return {
      content: 'Mfomso aba wɔ nnuru mfonini nhwehwɛmu no mu. Yɛsrɛ wo fa mfonini no bio anaa san bɔ mmɔden bio.',
      action: 'probe',
      is_emergency: false,
      error: error instanceof Error ? error.message : 'Failed to analyze medicine image',
    };
  }
}
