import { getServicios } from '../../lib/supabase'
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  try {
    const servicios = await getServicios()
    res.status(200).json({ servicios })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
