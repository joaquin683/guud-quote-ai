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
          { email: process.env.GUUD_EMAIL || 'contacto@guudcompany.cl' },
        ],
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

  } catch (err) {
    gcalError = err.message
    console.error('GCal OAuth error:', err.message)
  }

  res.status(200).json({ success: true, eventId, meetLink, gcalError })
}
