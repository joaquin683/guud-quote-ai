
import { google } from 'googleapis';

export default async function handler(req, res) {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || 'NOT SET';
  const secretLen = (process.env.GOOGLE_OAUTH_CLIENT_SECRET || '').length;
  const refreshLen = (process.env.GOOGLE_OAUTH_REFRESH_TOKEN || '').length;
  const clientIdStart = clientId.slice(0, 15);
  const secretEnd = (process.env.GOOGLE_OAUTH_CLIENT_SECRET || '').slice(-8);
  const refreshEnd = (process.env.GOOGLE_OAUTH_REFRESH_TOKEN || '').slice(-10);

  // Intentar usar el refresh token
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
  );
  oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN });

  try {
    const { token } = await oauth2Client.getAccessToken();
    return res.status(200).json({
      clientId: clientIdStart,
      secretLen, secretEnd,
      refreshLen, refreshEnd,
      accessTokenOk: !!token,
      accessTokenStart: (token || '').slice(0, 10)
    });
  } catch(e) {
    return res.status(200).json({
      clientId: clientIdStart,
      secretLen, secretEnd,
      refreshLen, refreshEnd,
      error: e.message
    });
  }
}
