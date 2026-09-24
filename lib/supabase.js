import { createClient } from '@supabase/supabase-js'
import tarifario from '../data/tarifario.json'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

// Trae todos los servicios activos
export async function getServicios() {
  return (Array.isArray(tarifario) ? tarifario : [])
    .filter(s => s.activo)
    .map(s => ({
      nombre: s.nombre,
      agente: (s.categoria || '').toLowerCase(),
      categoria: s.categoria,
      descripcion: s.descripcion,
      precio_min: s.precio_min,
      precio_max: s.precio_max,
      tiempo: s.tiempo,
      activo: s.activo,
    }))
}

// Trae talentos disponibles, opcionalmente filtrados por skill
export async function getTalentos(skills = []) {
  let query = supabase
    .from('talentos')
    .select('*')
    .eq('activo', true)
    .gt('disponibilidad_horas', 0)
    .order('disponibilidad_horas', { ascending: false })

  if (skills.length > 0) {
    query = query.overlaps('skills', skills)
  }

  try {
    const { data, error } = await query
    if (error) {
      console.error('getTalentos: Supabase no disponible, sigo sin talentos:', error.message || error)
      return []
    }
    return data || []
  } catch (e) {
    console.error('getTalentos: Supabase no disponible, sigo sin talentos:', e.message || e)
    return []
  }
}

// Guarda un lead/cotización nueva
export async function guardarProyecto(proyecto) {
  const { data, error } = await supabase
    .from('proyectos')
    .insert([proyecto])
    .select()
  if (error) {
    console.error('guardarProyecto: no se pudo guardar en Supabase:', error.message || error)
    return null
  }
  return data?.[0] || null
}
