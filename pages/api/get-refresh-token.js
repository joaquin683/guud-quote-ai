
import { google } from 'googleapis';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'code required' });

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
  );

  try {
    const { tokens } = await oauth2Client.getToken(code);
    return res.status(200).json({ 
      refresh_token: tokens.refresh_token,
      access_token: tokens.access_token ? 'ok' : 'none'
    });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
