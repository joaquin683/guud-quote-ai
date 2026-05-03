export default async function handler(req, res) {
  const results = {}
  
  // Check env vars are present
  results.hasEmail = !!process.env.GOOGLE_CLIENT_EMAIL
  results.hasKey = !!process.env.GOOGLE_PRIVATE_KEY
  results.hasCalId = !!process.env.GOOGLE_CALENDAR_ID
  results.calId = process.env.GOOGLE_CALENDAR_ID
  results.email = process.env.GOOGLE_CLIENT_EMAIL
  results.keyStart = process.env.GOOGLE_PRIVATE_KEY?.substring(0, 40)
  
  // Try Google auth
  try {
    const { google } = await import('googleapis')
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    })
    const calendar = google.calendar({ version: 'v3', auth })
    const { data } = await calendar.calendarList.list()
    results.gcalOk = true
    results.calendars = data.items?.map(c => ({ id: c.id, summary: c.summary }))
  } catch(e) {
    results.gcalOk = false
    results.gcalError = e.message
  }
  
  res.status(200).json(results)
}
