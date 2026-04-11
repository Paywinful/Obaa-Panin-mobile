import { LanguageCode } from '../types';
import { getApiUrl } from '../utils/getApiUrl';
import { RecordedAudio } from '../hooks/useAudioCapture';

function mapLanguage(language: LanguageCode): string {
  return language === 'en' ? 'en' : 'akan';
}

export async function transcribeAudio(
  audio: RecordedAudio,
  language: LanguageCode,
): Promise<string> {
  const formData = new FormData();
  formData.append('audio', {
    uri: audio.uri,
    type: audio.mimeType,
    name: audio.fileName,
  } as any);
  formData.append('language', mapLanguage(language));
  formData.append('isImpaired', 'false');

  const response = await fetch(`${getApiUrl()}/api/transcribe`, {
    method: 'POST',
    body: formData,
  });

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(responseText || 'Transcription failed');
  }

  const data = JSON.parse(responseText);
  return data.text || data.transcription || '';
}
