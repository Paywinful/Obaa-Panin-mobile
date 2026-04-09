import Constants from 'expo-constants';

/**
 * Gets the correct API URL for the current environment.
 * In development, Expo API routes are served by the metro dev server.
 * On a physical device, we need the local network IP instead of localhost.
 */
export function getApiUrl(): string {
  // Use explicit env var if set to a non-localhost value
  const envUrl = process.env.EXPO_PUBLIC_API_URL || '';
  if (envUrl && !envUrl.includes('localhost')) {
    return envUrl;
  }

  // In development, get the dev server URL from Expo constants
  const debuggerHost = Constants.expoConfig?.hostUri || Constants.experienceUrl;
  if (debuggerHost) {
    // hostUri format is "192.168.x.x:8081"
    const host = debuggerHost.split(':')[0];
    return `http://${host}:8081`;
  }

  return envUrl || 'http://localhost:8081';
}
