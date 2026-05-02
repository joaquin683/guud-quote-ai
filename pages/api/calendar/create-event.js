import { supabase } from '../../../lib/supabase'

async function createGoogleEvent(params) {
  if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    return { skipped: true }
  }
  try {
    const { google } = await import('googleapis')
    const { nombre, email, empresa, telefono, slot_iso, proyecto, servicio, entregables, precio, tiempo, asesoria } = params
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/calendar.events'],
    })
    const calendar = google.calendar({ version: 'v3', auth })
    const startTime = new Date(slot_iso)
    const endTime   = new Date(startTime.getTime() + 30 * 60000)
    const description = [
      'Cliente: ' + nombre, 'Email: ' + email,
      empresa ? 'Empresa: ' + empresa : '',
      telefono ? 'Teléfono: ' + telefono : '',
      '', '--- Cotización GÜÜD ---',
      proyecto ? 'Proyecto: ' + proyecto : '',
      servicio ? 'Servicio: ' + servicio : '',
      entregables ? 'Entregables: ' + entregables : '',
      precio ? 'Precio: ' + precio : '',
      tiempo ? 'Tiempo: ' + tiempo : '',
      asesoria ? '\nAsesoría:\n' + asesoria : '',
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
      },
    })
    return {
      eventId:  event.data.id,
      meetLink: event.data.conferenceData?.entryPoints?.[0]?.uri || '',
    }
  } catch (e) {
    console.error('Google Calendar error:', e.message)
    return { skipped: true }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const { nombre, email, empresa, telefono, slot_iso, proyecto_id, proyecto, servicio, entregables, precio, tiempo, asesoria } = req.body

    if (!nombre || !email) {
      return res.status(400).json({ error: 'nombre y email son requeridos' })
    }

    // Try Google Calendar — always skips gracefully if not configured
    const gcal = await createGoogleEvent({ nombre, email, empresa, telefono, slot_iso, proyecto, servicio, entregables, precio, tiempo, asesoria })

    // Try Supabase update — silently skip if columns don't exist
    if (proyecto_id) {
      try {
        await supabase.from('proyectos').update({
          estado: 'meeting_scheduled',
          client_email: email,
          client_name: nombre,
        }).eq('id', proyecto_id)
      } catch (_) {}
    }

    // Always return success
    res.status(200).json({
      success: true,
      eventId:  gcal.eventId  || null,
      meetLink: gcal.meetLink || null,
    })
  } catch (e) {
    console.error('create-event error:', e.message)
    res.status(500).json({ error: e.message })
  }
}
