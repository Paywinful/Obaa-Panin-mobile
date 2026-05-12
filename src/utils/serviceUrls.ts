import Constants from 'expo-constants';

function normalizeUrl(value?: string): string {
  return (value || '').trim().replace(/\/+$/, '');
}

function getDevServerBaseUrl(): string {
  const debuggerHost = Constants.expoConfig?.hostUri || Constants.experienceUrl;
  if (debuggerHost) {
    const host = debuggerHost.split(':')[0];
    return `http://${host}:8081`;
  }

  return 'http://localhost:8081';
}

export function getAsrApiUrl(): string {
  const directUrl = normalizeUrl(process.env.EXPO_PUBLIC_ASR_API_URL);
  if (directUrl) {
    return directUrl;
  }

  if (__DEV__) {
    return `${getDevServerBaseUrl()}/api/transcribe`;
  }

  throw new Error('Set EXPO_PUBLIC_ASR_API_URL for production builds.');
}

export function getTtsApiUrl(): string {
  const directUrl = normalizeUrl(process.env.EXPO_PUBLIC_TTS_API_URL);
  if (directUrl) {
    return directUrl;
  }

  if (__DEV__) {
    return `${getDevServerBaseUrl()}/api/tts`;
  }

  throw new Error('Set EXPO_PUBLIC_TTS_API_URL for production builds.');
}
