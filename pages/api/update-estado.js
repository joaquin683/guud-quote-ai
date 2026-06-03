import { supabase } from '../../lib/supabase'

const ESTADOS = ['cotizado', 'agendado', 'contactado', 'negociacion', 'cerrado', 'perdido']

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'metodo no permitido' })
  const { id, estado } = req.body || {}
  if (!id || !estado) return res.status(400).json({ ok: false, error: 'id y estado requeridos' })
  if (!ESTADOS.includes(estado)) return res.status(400).json({ ok: false, error: 'estado invalido' })
  try {
    const { data, error } = await supabase
      .from('proyectos')
      .update({ estado })
      .eq('id', id)
      .select()
    if (error) return res.status(500).json({ ok: false, error: error.message })
    return res.status(200).json({ ok: true, data })
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message || String(err) })
  }
}
