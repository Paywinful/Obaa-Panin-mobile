import { applyPregnancyProfile } from '../../src/server/clinicalSession';
import { PregnancyProfile } from '../../src/types';

function isValidPregnancyProfile(value: unknown): value is PregnancyProfile {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const profile = value as PregnancyProfile;
  return (
    typeof profile.isPregnant === 'boolean' &&
    (profile.selectedMonth === null || (Number.isInteger(profile.selectedMonth) && profile.selectedMonth >= 1 && profile.selectedMonth <= 9)) &&
    typeof profile.answeredAt === 'number'
  );
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const { sessionId = 'default', pregnancyProfile } = body;

    if (!isValidPregnancyProfile(pregnancyProfile)) {
      return new Response(
        JSON.stringify({ error: 'Valid pregnancyProfile is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    applyPregnancyProfile(sessionId, pregnancyProfile);

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Pregnancy profile API error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to save pregnancy profile' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
