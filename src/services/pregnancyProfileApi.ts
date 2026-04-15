import { PregnancyProfile } from '../types';
import { getApiUrl } from '../utils/getApiUrl';

export async function syncPregnancyProfile(
  sessionId: string,
  pregnancyProfile: PregnancyProfile,
): Promise<void> {
  const response = await fetch(`${getApiUrl()}/api/pregnancy-profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, pregnancyProfile }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Failed to sync pregnancy profile');
  }
}
