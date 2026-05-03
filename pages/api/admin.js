import { supabase } from '../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  try {
    const { estado, agente, limit = 50 } = req.query

    let query = supabase
      .from('proyectos')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit))

    if (estado) query = query.eq('estado', estado)
    if (agente) query = query.eq('agente_usado', agente)

    const { data, error } = await query
    if (error) throw error

    // Metrics
    const total = data.length
    const cotizados = data.filter(p => p.estado === 'cotizado').length
    const agendados = data.filter(p => p.estado === 'meeting_scheduled').length
    const avgPrecio = data.filter(p => p.precio_estimado_min).reduce((acc, p) => acc + (p.precio_estimado_min || 0), 0) / (data.filter(p => p.precio_estimado_min).length || 1)

    res.status(200).json({
      proyectos: data || [],
      metrics: { total, cotizados, agendados, avgPrecio: Math.round(avgPrecio) }
    })
  } catch(e) {
    console.error('admin error:', e.message)
    res.status(200).json({ proyectos: [], metrics: { total: 0, cotizados: 0, agendados: 0, avgPrecio: 0 } })
  }
}
