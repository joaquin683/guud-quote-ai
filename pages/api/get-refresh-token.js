
import { google } from 'googleapis';

export default async function handler(req, res) {
  const { code } = req.query;
  
  // Si viene el code por GET (callback de Google), hacer el exchange
  if (code) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_OAUTH_CLIENT_ID,
      process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      'https://guud-quote-ai.vercel.app/api/get-refresh-token'
    );
    try {
      const { tokens } = await oauth2Client.getToken(code);
      return res.status(200).send('<h1>REFRESH TOKEN:</h1><p style="word-break:break-all;font-size:20px;color:green">' + tokens.refresh_token + '</p><p>Copia este valor</p>');
    } catch(e) {
      return res.status(500).send('Error: ' + e.message);
    }
  }
  
  // Si no hay code, generar URL de autorización
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    'https://guud-quote-ai.vercel.app/api/get-refresh-token'
  );
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar'],
    prompt: 'consent'
  });
  return res.redirect(authUrl);
}
