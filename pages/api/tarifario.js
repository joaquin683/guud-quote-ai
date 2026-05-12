import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('tarifario')
      .select('*')
      .order('categoria', { ascending: true })
      .order('orden', { ascending: true })
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  if (req.method === 'PUT') {
    const { id, precio_min, precio_max, descripcion, activo } = req.body
    const { data, error } = await supabase
      .from('tarifario')
      .update({ precio_min, precio_max, descripcion, activo, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data[0])
  }

  if (req.method === 'POST') {
    const { servicio, categoria, precio_min, precio_max, descripcion, orden } = req.body
    const { data, error } = await supabase
      .from('tarifario')
      .insert([{ servicio, categoria, precio_min, precio_max, descripcion, orden: orden || 99, activo: true }])
      .select()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data[0])
  }

  res.status(405).json({ error: 'Method not allowed' })
}
