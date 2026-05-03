import { supabase } from '../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const { id } = req.query
  if (!id) return res.status(400).json({ error: 'id requerido' })
  try {
    const { data, error } = await supabase.from('proyectos').select('*').eq('id', id).single()
    if (error || !data) return res.status(404).json({ error: 'No encontrado' })
    res.status(200).json(data)
  } catch(e) {
    res.status(500).json({ error: e.message })
  }
}
