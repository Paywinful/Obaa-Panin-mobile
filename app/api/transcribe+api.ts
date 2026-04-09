const ASR_ENDPOINT = 'https://whisper-service-194975005212.europe-west4.run.app/transcribe';

export async function POST(request: Request): Promise<Response> {
  try {
    const formData = await request.formData() as any;
    const audioFile = formData.get('audio') as Blob | null;

    if (!audioFile) {
      return new Response(
        JSON.stringify({ error: 'Audio file is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Forward to Akan ASR service
    const asrForm = new FormData();
    asrForm.append('file', audioFile, 'recording.m4a');
    asrForm.append('language', 'tw');
    asrForm.append('isImpaired', 'false');

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
