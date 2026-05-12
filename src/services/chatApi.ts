import { ChatResponse, LanguageCode, Message, PregnancyProfile } from '../types';
import { sendDirectChatMessage } from './directChatApi';

export async function sendChatMessage(
  messages: Message[],
  language: LanguageCode = 'twi',
  sessionId?: string,
  pregnancyProfile?: PregnancyProfile | null,
): Promise<ChatResponse> {
  return sendDirectChatMessage(messages, language, sessionId, pregnancyProfile);
}
