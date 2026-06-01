
import { google } from 'googleapis';

export default async function handler(req, res) {
  const REDIRECT = 'https://guud-quote-ai.vercel.app/api/oauth-callback';
  const code = req.query.code;

  if (!code) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_OAUTH_CLIENT_ID,
      process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      REDIRECT
    );
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar'],
      prompt: 'consent'
    });
    return res.redirect(url);
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    REDIRECT
  );
  try {
    const { tokens } = await oauth2Client.getToken(code);
    const rt = tokens.refresh_token;
    return res.status(200).send('REFRESH_TOKEN:' + rt + ':END');
  } catch(e) {
    return res.status(500).json({ error: e.message, clientId: (process.env.GOOGLE_OAUTH_CLIENT_ID||'').slice(0,20) });
  }
}
