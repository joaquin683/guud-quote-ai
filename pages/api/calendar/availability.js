import { google } from 'googleapis'

const TIMEZONE = 'America/Santiago'
const DURATION = 30
const WORK_START = 10
const WORK_END = 18

function getAuth() {
  return new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
  })
}

function generateSlots(date, busyPeriods) {
  const slots = []
  const dayStart = new Date(`${date}T${String(WORK_START).padStart(2,'0')}:00:00-03:00`)
  const dayEnd   = new Date(`${date}T${String(WORK_END).padStart(2,'0')}:00:00-03:00`)
  let current = new Date(dayStart)

  while (current < dayEnd) {
    const slotEnd = new Date(current.getTime() + DURATION * 60000)
    const iso = current.toISOString()
    const time = current.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TIMEZONE })

    // Check if slot overlaps with any busy period
    const isBusy = busyPeriods.some(b =>
      current < b.end && slotEnd > b.start
    )

    if (!isBusy) slots.push({ time, iso })
    current = new Date(current.getTime() + DURATION * 60000)
  }
  return slots
}

export default async function handler(req, res) {
  const { date } = req.query
  if (!date) return res.status(400).json({ error: 'date required' })

  // If no credentials, return all slots as available (no fallback blocking)
  if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    return res.status(200).json({ slots: generateSlots(date, []), fallback: true })
  }

  try {
    const auth = getAuth()
    const calendar = google.calendar({ version: 'v3', auth })

    const dayStart = new Date(`${date}T${String(WORK_START).padStart(2,'0')}:00:00-03:00`)
    const dayEnd   = new Date(`${date}T${String(WORK_END).padStart(2,'0')}:00:00-03:00`)

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

    const slots = generateSlots(date, busy)
    res.status(200).json({ slots, gcal: true })

  } catch (e) {
    console.error('availability error:', e.message)
    // On error, show all slots available rather than blocking them all
    res.status(200).json({ slots: generateSlots(date, []), fallback: true })
  }
}
