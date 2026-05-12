type GeminiTextPart = { text: string };
type GeminiInlineDataPart = {
  inlineData: {
    mimeType: string;
    data: string;
  };
};

type GeminiPart = GeminiTextPart | GeminiInlineDataPart;

type GeminiContent = {
  role: 'user' | 'model';
  parts: GeminiPart[];
};

interface GenerateGeminiContentArgs {
  model: string;
  systemInstruction?: string;
  contents: GeminiContent[];
}

function getGeminiApiKey(): string {
  const key = (process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '').trim();
  if (!key) {
    throw new Error('Set EXPO_PUBLIC_GEMINI_API_KEY for direct Gemini calls from the app.');
  }

  return key;
}

function buildGeminiPayload(args: GenerateGeminiContentArgs) {
  return {
    systemInstruction: args.systemInstruction
      ? {
        parts: [{ text: args.systemInstruction }],
      }
      : undefined,
    contents: args.contents.map((content) => ({
      role: content.role,
      parts: content.parts.map((part) => ('text' in part ? { text: part.text } : {
        inlineData: {
          mimeType: part.inlineData.mimeType,
          data: part.inlineData.data,
        },
      })),
    })),
  };
}

function extractResponseText(data: any): string {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) {
    return '';
  }

  return parts
    .map((part) => (typeof part?.text === 'string' ? part.text : ''))
    .join('')
    .trim();
}

async function generateGeminiText(args: GenerateGeminiContentArgs): Promise<string> {
  const apiKey = getGeminiApiKey();
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${args.model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildGeminiPayload(args)),
    },
  );

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(responseText || `Gemini request failed (${response.status})`);
  }

  const data = JSON.parse(responseText);
  return extractResponseText(data);
}

export const geminiClient = {
  models: {
    async generateContent(args: GenerateGeminiContentArgs): Promise<{ text: string }> {
      return {
        text: await generateGeminiText(args),
      };
    },
  },
};

export function createTextPart(text: string): GeminiTextPart {
  return { text };
}

export function createInlineDataPart(base64: string, mimeType: string): GeminiInlineDataPart {
  return {
    inlineData: {
      mimeType,
      data: base64.replace(/^data:.*;base64,/, ''),
    },
  };
}
