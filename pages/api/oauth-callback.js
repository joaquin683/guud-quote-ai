
import { google } from 'googleapis';
export default async function handler(req, res) {
  const REDIRECT = 'https://guud-quote-ai.vercel.app/api/oauth-callback';
  const code = req.query.code;
  if (!code) {
    const c = new google.auth.OAuth2(process.env.GOOGLE_OAUTH_CLIENT_ID, process.env.GOOGLE_OAUTH_CLIENT_SECRET, REDIRECT);
    return res.redirect(c.generateAuthUrl({ access_type: 'offline', scope: ['https://www.googleapis.com/auth/calendar'], prompt: 'consent' }));
  }
  const c = new google.auth.OAuth2(process.env.GOOGLE_OAUTH_CLIENT_ID, process.env.GOOGLE_OAUTH_CLIENT_SECRET, REDIRECT);
  try {
    const { tokens } = await c.getToken(code);
    return res.status(200).send('REFRESH_TOKEN:' + tokens.refresh_token + ':END');
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
