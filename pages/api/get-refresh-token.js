
import { google } from 'googleapis';

export default async function handler(req, res) {
  const code = req.method === 'GET' ? req.query.code : req.body?.code;
  if (!code) return res.status(400).json({ error: 'code required' });

  // Usar el nuevo client ID 575457646854 con su secret
  const oauth2Client = new google.auth.OAuth2(
    '575457646854-9ijpqrrnb8e62mv7hkltmhhjpqmladq2.apps.googleusercontent.com',
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
  );

  try {
    const { tokens } = await oauth2Client.getToken(code);
    return res.status(200).json({ 
      refresh_token: tokens.refresh_token,
      client_id_used: '575457646854',
      ok: true
    });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
