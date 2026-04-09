import { GoogleAuth } from 'google-auth-library';
import path from 'path';

const credentialsPath = path.resolve(process.cwd(), 'google-credentials.json');
const auth = new GoogleAuth({
  keyFilename: credentialsPath,
  scopes: ['https://www.googleapis.com/auth/cloud-translation'],
});

const PROJECT_ID = (() => {
  try {
    const creds = require('../../google-credentials.json');
    return creds.project_id;
  } catch {
    return '';
  }
})();

export async function POST(request: Request): Promise<Response> {
  try {
    const { text, source = 'ak', target = 'en' } = await request.json();

    if (!text) {
      return new Response(
        JSON.stringify({ error: 'Text is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    const translateRes = await fetch(
      `https://translation.googleapis.com/v3/projects/${PROJECT_ID}/locations/global:translateText`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [text],
          sourceLanguageCode: source,
          targetLanguageCode: target,
          mimeType: 'text/plain',
        }),
      },
    );

    const data = await translateRes.json();

    if (!translateRes.ok) {
      console.error('Google Translate error:', JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: 'Translation failed', detail: data.error?.message || JSON.stringify(data) }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const translated = data.translations?.[0]?.translatedText || '';

    return new Response(
      JSON.stringify({ translatedText: translated }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Translation error:', error);
    return new Response(
      JSON.stringify({ error: 'Translation failed', detail: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
