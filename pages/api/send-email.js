export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { to, subject, html } = req.body
  if (!to || !subject || !html) return res.status(400).json({ error: 'Missing fields' })

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + process.env.RESEND_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'GÜÜD Company <' + (process.env.GUUD_EMAIL || 'onboarding@resend.dev') + '>',
        to: [to],
        subject,
        html,
      })
    })
    const data = await r.json()
    if (!r.ok) return res.status(500).json({ error: data.message || 'Resend error' })
    return res.status(200).json({ ok: true, id: data.id })
  } catch(e) {
    return res.status(500).json({ error: e.message })
  }
}
