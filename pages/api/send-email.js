import { google } from 'googleapis'

async function getGmailAccessToken() {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  )
  oauth2.setCredentials({ refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN })
  const { token } = await oauth2.getAccessToken()
  return token
}

function makeEmailBody({ to, subject, html }) {
  const boundary = 'guud_boundary_' + Date.now()
  const raw = [
    'MIME-Version: 1.0',
    'Content-Type: multipart/alternative; boundary="' + boundary + '"',
    'From: GÜÜD Company <' + process.env.GUUD_EMAIL + '>',
    'To: ' + to,
    'Subject: =?UTF-8?B?' + Buffer.from(subject).toString('base64') + '?=',
    '',
    '--' + boundary,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(html).toString('base64'),
    '--' + boundary + '--',
  ].join('\r\n')
  return Buffer.from(raw).toString('base64url')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { to, subject, html } = req.body
  if (!to || !subject || !html) return res.status(400).json({ error: 'Missing fields' })

  try {
    const token = await getGmailAccessToken()
    const body = makeEmailBody({ to, subject, html })
    const r = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: body })
    })
    const data = await r.json()
    if (!r.ok) return res.status(500).json({ error: data.error?.message || 'Gmail error' })
    return res.status(200).json({ ok: true, messageId: data.id })
  } catch(e) {
    return res.status(500).json({ error: e.message })
  }
}
