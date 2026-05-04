export default async function handler(req, res) {
  const results = {}
  results.hasEmail = !!process.env.GOOGLE_CLIENT_EMAIL
  results.hasKey = !!process.env.GOOGLE_PRIVATE_KEY
  results.hasCalId = !!process.env.GOOGLE_CALENDAR_ID
  results.calId = process.env.GOOGLE_CALENDAR_ID
  results.email = process.env.GOOGLE_CLIENT_EMAIL
  results.keyStart = process.env.GOOGLE_PRIVATE_KEY?.substring(0, 40)

  try {
    const { google } = await import('googleapis')
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.events'],
    })
    const calendar = google.calendar({ version: 'v3', auth })

    // Test 1: list calendars
    try {
      const { data } = await calendar.calendarList.list()
      results.calendars = data.items?.map(c => ({ id: c.id, summary: c.summary }))
    } catch(e) { results.calListError = e.message }

    // Test 2: try inserting a test event
    try {
      const start = new Date(Date.now() + 7*24*60*60*1000)
      const end = new Date(start.getTime() + 30*60*1000)
      const { data } = await calendar.events.insert({
        calendarId: process.env.GOOGLE_CALENDAR_ID,
        sendUpdates: 'all',
        requestBody: {
          summary: 'DIAG TEST - borrar',
          start: { dateTime: start.toISOString(), timeZone: 'America/Santiago' },
          end:   { dateTime: end.toISOString(),   timeZone: 'America/Santiago' },
          attendees: [{ email: process.env.GOOGLE_CLIENT_EMAIL }],
        }
      })
      results.insertOk = true
      results.eventId = data.id
      // Clean up
      await calendar.events.delete({ calendarId: process.env.GOOGLE_CALENDAR_ID, eventId: data.id })
    } catch(e) {
      results.insertOk = false
      results.insertError = e.message
      results.insertCode = e.code
    }

  } catch(e) {
    results.gcalOk = false
    results.gcalError = e.message
  }

  res.status(200).json(results)
}
