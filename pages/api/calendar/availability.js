import { google } from 'googleapis'

const TIMEZONE = 'America/Santiago'
const DURATION = 30 // minutes
const WORK_START = 10 // 10am
const WORK_END = 18   // 6pm

function getAuth() {
  return new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
  })
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  try {
    const { date } = req.query // YYYY-MM-DD
    if (!date) return res.status(400).json({ error: 'date required' })

    const auth = getAuth()
    const calendar = google.calendar({ version: 'v3', auth })

    // Get start/end of requested day in Santiago time
    const dayStart = new Date(`${date}T${String(WORK_START).padStart(2,'0')}:00:00-03:00`)
    const dayEnd   = new Date(`${date}T${String(WORK_END).padStart(2,'0')}:00:00-03:00`)

    // Fetch existing events
    const { data } = await calendar.events.list({
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      timeMin: dayStart.toISOString(),
      timeMax: dayEnd.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    })

    const busy = (data.items || []).map(e => ({
      start: new Date(e.start.dateTime || e.start.date),
      end:   new Date(e.end.dateTime   || e.end.date),
    }))

    // Generate all slots
    const slots = []
    let current = new Date(dayStart)
    while (current < dayEnd) {
      const slotEnd = new Date(current.getTime() + DURATION * 60000)
      const isBusy = busy.some(b => current < b.end && slotEnd > b.start)
      if (!isBusy) {
        slots.push({
          time: current.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', timeZone: TIMEZONE }),
          iso: current.toISOString(),
        })
      }
      current = slotEnd
    }

    res.status(200).json({ slots })
  } catch (e) {
    console.error('availability error:', e.message)
    // Fallback: return static slots if Google API fails
    const fallbackSlots = ['10:00','10:30','11:00','11:30','14:00','14:30','15:00','15:30','16:00','16:30']
    const slots = fallbackSlots.map(t => ({ time: t, iso: req.query.date + 'T' + t + ':00-03:00' }))
    res.status(200).json({ slots, fallback: true })
  }
}
