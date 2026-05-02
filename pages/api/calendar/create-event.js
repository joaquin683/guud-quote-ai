import { google } from 'googleapis'
import { supabase } from '../../../lib/supabase'

function getAuth() {
  return new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/calendar.events'],
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const {
      nombre, email, empresa, telefono,
      slot_iso, proyecto_id,
      proyecto, servicio, entregables, precio, tiempo, asesoria
    } = req.body

    if (!nombre || !email || !slot_iso) {
      return res.status(400).json({ error: 'nombre, email y horario son requeridos' })
    }

    const auth = getAuth()
    const calendar = google.calendar({ version: 'v3', auth })

    const startTime = new Date(slot_iso)
    const endTime   = new Date(startTime.getTime() + 30 * 60000)

    const description = [
      'Cliente: ' + nombre,
      'Email: ' + email,
      empresa   ? 'Empresa: ' + empresa   : '',
      telefono  ? 'Teléfono: ' + telefono : '',
      '',
      '--- Cotización GÜÜD ---',
      proyecto  ? 'Proyecto: ' + proyecto  : '',
      servicio  ? 'Servicio: ' + servicio  : '',
      entregables ? 'Entregables: ' + entregables : '',
      precio    ? 'Precio referencial: ' + precio : '',
      tiempo    ? 'Tiempo estimado: ' + tiempo    : '',
      asesoria  ? '\nAsesoría GÜÜD:\n' + asesoria : '',
    ].filter(Boolean).join('\n')

    const event = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      conferenceDataVersion: 1,
      requestBody: {
        summary: 'Reunión GÜÜD · ' + (proyecto || 'Proyecto creativo'),
        description,
        start: { dateTime: startTime.toISOString(), timeZone: 'America/Santiago' },
        end:   { dateTime: endTime.toISOString(),   timeZone: 'America/Santiago' },
        attendees: [
          { email },
          { email: process.env.GUUD_EMAIL || 'contacto@guudcompany.cl' },
        ],
        conferenceData: {
          createRequest: { requestId: 'guud-' + Date.now(), conferenceSolutionKey: { type: 'hangoutsMeet' } }
        },
        guestsCanModifyEvent: false,
      },
    })

    const eventId  = event.data.id
    const meetLink = event.data.conferenceData?.entryPoints?.[0]?.uri || ''

    // Update Supabase if proyecto_id exists
    if (proyecto_id) {
      await supabase.from('proyectos').update({
        estado: 'meeting_scheduled',
        meeting_date: startTime.toISOString().split('T')[0],
        meeting_time: startTime.toISOString().split('T')[1].substring(0,5),
        calendar_event_id: eventId,
        client_email: email,
        client_name: nombre,
      }).eq('id', proyecto_id)
    }

    res.status(200).json({ success: true, eventId, meetLink })
  } catch (e) {
    console.error('create-event error:', e.message)
    res.status(500).json({ error: e.message })
  }
}
