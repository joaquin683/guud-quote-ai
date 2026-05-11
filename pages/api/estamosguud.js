export default async function handler(req, res) {
  const start = Date.now()

  // Check Supabase
  let supabase = false
  try {
    const r = await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/servicios?select=id&limit=1', {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      }
    })
    supabase = r.ok
  } catch (_) {}

  // Check Anthropic
  let anthropic = false
  try {
    const r = await fetch('https://api.anthropic.com/v1/models', {
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      }
    })
    anthropic = r.ok
  } catch (_) {}

  const ms = Date.now() - start
  const all = supabase && anthropic

  res.status(all ? 200 : 503).json({
    status: all ? 'estamosguud' : 'hayproblemas',
    latency_ms: ms,
    services: {
      supabase,
      anthropic,
      calendar: !!process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
    },
    timestamp: new Date().toISOString(),
  })
}
