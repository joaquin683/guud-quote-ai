import { google } from 'googleapis'

function getAuth() {
  return new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    scopes: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ],
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { nombre: n, email: e, slot_iso, proyecto, servicio, entregables, tiempo, asesoria, precio } = req.body
  if (!n || !e || !slot_iso) return res.status(400).json({ error: 'faltan campos' })

  let eventId = null
  let gcalError = null

  if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY && process.env.GOOGLE_CALENDAR_ID) {
    try {
      const auth = getAuth()
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
        requestBody: {
          summary: 'Reunion GUUD - ' + (proyecto || 'Proyecto'),
          description: desc,
          start: { dateTime: startTime.toISOString(), timeZone: 'America/Santiago' },
          end:   { dateTime: endTime.toISOString(),   timeZone: 'America/Santiago' },
          location: 'Google Meet (link por confirmar)',
        },
      })
      eventId = data.id || null
    } catch (err) {
      gcalError = err.message
      console.error('GCal error:', err.message)
    }
  }

  // meetLink is null — service accounts cannot create Meet links
  // The event is created in the calendar; Joaquin can add Meet manually or send link separately
  res.status(200).json({ success: true, eventId, meetLink: null, gcalError })
}
