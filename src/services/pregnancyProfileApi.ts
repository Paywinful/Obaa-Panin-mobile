import { PregnancyProfile } from '../types';
import { applyPregnancyProfile } from '../server/clinicalSession';

export async function syncPregnancyProfile(
  sessionId: string,
  pregnancyProfile: PregnancyProfile,
): Promise<void> {
  await applyPregnancyProfile(sessionId, pregnancyProfile);
}
