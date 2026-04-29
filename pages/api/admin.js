import { supabase } from '../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  try {
    const { data: proyectos, error } = await supabase
      .from('proyectos')
      .select('*')
      .order('creado_en', { ascending: false })
      .limit(100)

    if (error) throw error
    res.status(200).json({ proyectos })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
