const TTS_ENDPOINT = 'https://akan-tts-194975005212.europe-west4.run.app';

export async function POST(request: Request): Promise<Response> {
  try {
    const { text } = await request.json();

    if (!text) {
      return new Response(
        JSON.stringify({ error: 'Text is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }
    const ttsResponse = await fetch(TTS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_type: 'ss',
        speaker: 'PT',
      }),
    });

    if (!ttsResponse.ok) {
      const errText = await ttsResponse.text();
      console.error('TTS error:', ttsResponse.status, errText);
      return new Response(
        JSON.stringify({ error: 'Text-to-speech failed', detail: errText }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const audioBuffer = await ttsResponse.arrayBuffer();
    const base64 = Buffer.from(audioBuffer).toString('base64');
    const contentType = ttsResponse.headers.get('Content-Type') || 'audio/wav';

    return new Response(
      JSON.stringify({ audio: base64, contentType }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('TTS error:', error);
    return new Response(
      JSON.stringify({ error: 'Text-to-speech failed', detail: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
