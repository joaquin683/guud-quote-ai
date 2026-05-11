import { google } from 'googleapis'

function getOAuthClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
  )
  oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN })
  return oauth2Client
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { nombre: n, email: e, slot_iso, proyecto, servicio, entregables, tiempo, asesoria, precio } = req.body
  if (!n || !e || !slot_iso) return res.status(400).json({ error: 'faltan campos' })

  let eventId = null
  let meetLink = null
  let gcalError = null

  try {
    const auth = getOAuthClient()
    const calendar = google.calendar({ version: 'v3', auth })

    const startTime = new Date(slot_iso)
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000)

    const desc = [
      'Cliente: ' + n, 'Email: ' + e,
      proyecto    ? 'Proyecto: '    + proyecto    : '',
      servicio    ? 'Servicio: '    + servicio    : '',
      entregables ? 'Entregables: ' + entregables : '',
      precio      ? 'Precio: '      + precio      : '',
      tiempo      ? 'Tiempo: '      + tiempo      : '',
      asesoria    ? 'Asesoria:\n'  + asesoria    : '',
    ].filter(Boolean).join('\n')

    const { data } = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      conferenceDataVersion: 1,
      sendUpdates: 'all',
      requestBody: {
        summary: 'Reunion GUUD \u00b7 ' + (proyecto || 'Proyecto creativo'),
        description: desc,
        start: { dateTime: startTime.toISOString(), timeZone: 'America/Santiago' },
        end:   { dateTime: endTime.toISOString(),   timeZone: 'America/Santiago' },
        attendees: [
          { email: e },
          { email: process.env.GUUD_EMAIL || 'contacto@guudcompany.cl', displayName: 'GÜÜD Company' },
          { email: 'tomas@guudcompany.cl', displayName: 'Tomás · GÜÜD Company' },
          { email: 'joaquin@guudcompany.cl', displayName: 'Joaquín · GÜÜD Company' },
        ],
        organizer: {
          displayName: 'GÜÜD Company',
          email: process.env.GUUD_EMAIL || 'contacto@guudcompany.cl',
        },
        conferenceData: {
          createRequest: {
            requestId: 'guud-' + Date.now(),
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      },
    })

    eventId = data.id || null
    meetLink = data.conferenceData?.entryPoints?.find(ep => ep.entryPointType === 'video')?.uri || null

    // ─── Email de confirmación al cliente ────────────────────────────────
    try {
      const fecha = new Date(slot_iso).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Santiago' })
      const hora  = new Date(slot_iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Santiago' })
      const html = `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0A0A0A;color:#F2F0E8;padding:36px;border-radius:12px">
        <div style="font-size:20px;font-weight:700;margin-bottom:20px">GÜÜD Company</div>
        <h2 style="font-size:18px;margin:0 0 6px">¡Reunión confirmada!</h2>
        <p style="color:#888;font-size:14px;margin:0 0 24px">Hola ${n}, ya tienes tu reunión con el equipo creativo de GÜÜD.</p>
        <div style="background:#111;border:1px solid #1f1f1f;border-radius:10px;padding:18px 20px;margin-bottom:20px">
          ${proyecto ? `<div style="font-size:12px;color:#666;margin-bottom:3px">Proyecto</div><div style="font-weight:600;margin-bottom:14px">${proyecto}</div>` : ''}
          <div style="font-size:12px;color:#666;margin-bottom:3px">Fecha y hora</div>
          <div style="font-weight:600;margin-bottom:14px">${fecha} · ${hora}</div>
          ${meetLink ? `<a href="${meetLink}" style="display:inline-block;background:#E8FF00;color:#0A0A0A;font-weight:700;font-size:13px;padding:10px 18px;border-radius:8px;text-decoration:none">Unirse a Google Meet →</a>` : ''}
        </div>
        ${precio ? `<div style="background:#111;border:1px solid #1f1f1f;border-radius:10px;padding:14px 18px;margin-bottom:20px">
          <div style="font-size:11px;color:#666;margin-bottom:2px">Estimación referencial</div>
          <div style="font-size:20px;font-weight:700;color:#E8FF00">${precio}</div>
        </div>` : ''}
        <p style="font-size:12px;color:#444;margin-top:20px;border-top:1px solid #1a1a1a;padding-top:16px">GÜÜD Company · Global Creative HÜB · guudcompany.cl</p>
      </div>`

      const raw = Buffer.from([
        'Content-Type: text/html; charset=utf-8',
        'MIME-Version: 1.0',
        `To: ${e}`,
        `From: GÜÜD Company <${process.env.GUUD_EMAIL || 'hola@guudcompany.cl'}>`,
        `Subject: Reunión confirmada · GÜÜD Company · ${fecha}`,
        '', html
      ].join('\n')).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')

      const tok = (await getOAuthClient().getAccessToken()).token
      await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw })
      })
    } catch (emailErr) {
      console.error('Email (non-blocking):', emailErr.message)
    }

  } catch (err) {
    gcalError = err.message
    console.error('GCal OAuth error:', err.message)
  }

  res.status(200).json({ success: true, eventId, meetLink, gcalError })
}
