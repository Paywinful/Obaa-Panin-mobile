import { ChatResponse, LanguageCode, Message } from '../types';
import { getApiUrl } from '../utils/getApiUrl';

export async function sendChatMessage(
  messages: Message[],
  language: LanguageCode = 'twi',
  sessionId?: string,
): Promise<ChatResponse> {
  try {
    const response = await fetch(`${getApiUrl()}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        language,
        sessionId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { content: '', error: errorText || 'Request failed' };
    }

    const data = await response.json();
    return { content: data.content, action: data.action, is_emergency: data.is_emergency };
  } catch {
    return { content: '', error: 'Network error. Please try again.' };
  }
}
