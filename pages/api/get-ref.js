export default function handler(req, res) {
  const { pin } = req.query
  if (pin !== 'estamosguud') return res.status(401).json({ error: 'unauthorized' })
  res.json({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    service: process.env.SUPABASE_SERVICE_ROLE_KEY || 'NOT_SET'
  })
}