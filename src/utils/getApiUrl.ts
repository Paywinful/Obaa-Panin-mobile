import Constants from 'expo-constants';

/**
 * Gets the correct API URL for the current environment.
 * In development, Expo API routes are served by the metro dev server.
 * On a physical device, we need the local network IP instead of localhost.
 */
export function getApiUrl(): string {
  const envUrl = (process.env.EXPO_PUBLIC_API_URL || '').trim().replace(/\/+$/, '');
  if (envUrl) {
    return envUrl;
  }

  if (__DEV__) {
    const debuggerHost = Constants.expoConfig?.hostUri || Constants.experienceUrl;
    if (debuggerHost) {
      const host = debuggerHost.split(':')[0];
      return `http://${host}:8081`;
    }

    return 'http://localhost:8081';
  }

  throw new Error(
    'EXPO_PUBLIC_API_URL is required for production builds. Expo API routes are not available inside a standalone APK.',
  );
}
