export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const { nombre, email, slot_iso } = req.body || {}

    if (!nombre || !email) {
      return res.status(400).json({ error: 'nombre y email son requeridos' })
    }

    let eventId  = null
    let meetLink = null

    // Optional: Google Calendar (only if credentials set)
    if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY && slot_iso) {
      try {
        const { google } = await import('googleapis')
        const { nombre: n, email: e, empresa, telefono, proyecto, servicio, entregables, precio, tiempo, asesoria } = req.body
        const auth = new google.auth.JWT({
          email: process.env.GOOGLE_CLIENT_EMAIL,
          key:   process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          scopes: ['https://www.googleapis.com/auth/calendar.events'],
        })
        const calendar  = google.calendar({ version: 'v3', auth })
        const startTime = new Date(slot_iso)
        const endTime   = new Date(startTime.getTime() + 30 * 60000)
        const event = await calendar.events.insert({
          calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
          conferenceDataVersion: 1,
          requestBody: {
            summary: 'Reunión GÜÜD · ' + (proyecto || 'Proyecto creativo'),
            description: [
              'Cliente: ' + n, 'Email: ' + e,
              empresa   ? 'Empresa: '   + empresa   : '',
              telefono  ? 'Teléfono: '  + telefono  : '',
              proyecto  ? 'Proyecto: '  + proyecto  : '',
              servicio  ? 'Servicio: '  + servicio  : '',
              entregables ? 'Entregables: ' + entregables : '',
              precio    ? 'Precio: '    + precio    : '',
              tiempo    ? 'Tiempo: '    + tiempo    : '',
              asesoria  ? 'Asesoría:\n' + asesoria  : '',
            ].filter(Boolean).join('\n'),
            start: { dateTime: startTime.toISOString(), timeZone: 'America/Santiago' },
            end:   { dateTime: endTime.toISOString(),   timeZone: 'America/Santiago' },
            attendees: [
              { email: e },
              { email: process.env.GUUD_EMAIL || 'contacto@guudcompany.cl' },
            ],
            conferenceData: {
              createRequest: { requestId: 'guud-' + Date.now(), conferenceSolutionKey: { type: 'hangoutsMeet' } }
            },
          },
        })
        eventId  = event.data.id
        meetLink = event.data.conferenceData?.entryPoints?.[0]?.uri || null
      } catch (gcalErr) {
        console.error('GCal skipped:', gcalErr.message)
      }
    }

    // Optional: Supabase (only if proyecto_id and env set)
    if (req.body.proyecto_id && process.env.NEXT_PUBLIC_SUPABASE_URL) {
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
        await sb.from('proyectos').update({ estado: 'meeting_scheduled', client_email: email, client_name: nombre }).eq('id', req.body.proyecto_id)
      } catch (sbErr) {
        console.error('Supabase skipped:', sbErr.message)
      }
    }

    return res.status(200).json({ success: true, eventId, meetLink })

  } catch (e) {
    console.error('create-event fatal:', e.message)
    return res.status(200).json({ success: true, eventId: null, meetLink: null })
  }
}
