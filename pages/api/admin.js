import { supabase } from '../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  try {
    const { estado, agente, limit = 500, search } = req.query

    // Get total metrics from ALL records (no limit)
    let metricsQuery = supabase.from('proyectos').select('estado, reunion_agendada, precio_estimado_min')
    if (estado) metricsQuery = metricsQuery.eq('estado', estado)
    if (agente) metricsQuery = metricsQuery.eq('agente_usado', agente)
    const { data: allData } = await metricsQuery

    const total = allData?.length || 0
    const cotizados = allData?.filter(p => p.estado === 'cotizado').length || 0
    const agendados = allData?.filter(p => p.reunion_agendada === true).length || 0
    const prices = allData?.filter(p => p.precio_estimado_min) || []
    const avgPrecio = prices.length ? Math.round(prices.reduce((a, p) => a + p.precio_estimado_min, 0) / prices.length) : 0

    // Get paginated records for display
    let query = supabase
      .from('proyectos')
      .select('*')
      .order('creado_en', { ascending: false })
      .limit(parseInt(limit))
    if (estado) query = query.eq('estado', estado)
    if (agente) query = query.eq('agente_usado', agente)
    if (search) query = query.or('nombre_proyecto.ilike.%' + search + '%,nombre_contacto.ilike.%' + search + '%,email_contacto.ilike.%' + search + '%')

    const { data, error } = await query
    if (error) throw error

    res.status(200).json({
      proyectos: data || [],
      metrics: { total, cotizados, agendados, avgPrecio }
    })
  } catch(e) {
    console.error('admin error:', e.message)
    res.status(200).json({ proyectos: [], metrics: { total: 0, cotizados: 0, agendados: 0, avgPrecio: 0 } })
  }
}
