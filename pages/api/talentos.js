import { getTalentos } from '../../lib/supabase'
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  try {
    const talentos = await getTalentos()
    res.status(200).json({ talentos })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
