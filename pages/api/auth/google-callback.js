export default async function handler(req, res) {
  const { code, error } = req.query

  if (error) {
    return res.status(400).send('<h2>Error: ' + error + '</h2>')
  }

  if (!code) {
    // Redirect to Google OAuth
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
      redirect_uri: process.env.NEXT_PUBLIC_BASE_URL + '/api/auth/google-callback',
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/calendar',
      access_type: 'offline',
      prompt: 'consent'
    })
    return res.redirect('https://accounts.google.com/o/oauth2/v2/auth?' + params.toString())
  }

  // Exchange code for tokens
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
        client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
        redirect_uri: process.env.NEXT_PUBLIC_BASE_URL + '/api/auth/google-callback',
        grant_type: 'authorization_code'
      }).toString()
    })
    const tokens = await tokenRes.json()
    res.status(200).send('<h2>Tokens OK</h2><pre>' + JSON.stringify(tokens, null, 2) + '</pre>')
  } catch(e) {
    res.status(500).send('<h2>Error: ' + e.message + '</h2>')
  }
}
