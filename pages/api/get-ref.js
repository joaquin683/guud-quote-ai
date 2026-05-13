export default function handler(req, res) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const ref = url.replace('https://','').replace('.supabase.co','')
  res.json({ ref, url_prefix: url.slice(0,40) })
}