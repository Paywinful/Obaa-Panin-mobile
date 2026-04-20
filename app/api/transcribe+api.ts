const ASR_ENDPOINT = 'https://whisper-service-health-194975005212.europe-west4.run.app/transcribe';

function normalizeLanguage(value: FormDataEntryValue | null): string {
  if (typeof value !== 'string') {
    return 'akan';
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === 'en' || normalized === 'english') {
    return 'en';
  }

  if (normalized === 'tw' || normalized === 'twi') {
    return 'tw';
  }

  return normalized || 'akan';
}

export async function POST(request: Request): Promise<Response> {
  try {
    const formData = await request.formData() as any;
    const audioFile = formData.get('audio') as Blob | null;
    const language = normalizeLanguage(formData.get('language'));
    const isImpaired = typeof formData.get('isImpaired') === 'string'
      ? String(formData.get('isImpaired'))
      : 'false';

    if (!audioFile) {
      return new Response(
        JSON.stringify({ error: 'Audio file is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Forward to Akan ASR service
    const asrForm = new FormData();
    asrForm.append('file', audioFile, 'recording.m4a');
    asrForm.append('language', language);
    asrForm.append('isImpaired', isImpaired);

    const asrResponse = await fetch(ASR_ENDPOINT, {
      method: 'POST',
      body: asrForm as any,
    });

    const responseText = await asrResponse.text();
    console.log('ASR status:', asrResponse.status);
    console.log('ASR response:', responseText);

    if (!asrResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Transcription failed', detail: responseText }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const data = JSON.parse(responseText);
    return new Response(
      JSON.stringify({ text: data.text || data.transcription || '' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Transcription error:', error);
    return new Response(
      JSON.stringify({ error: 'Transcription failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
