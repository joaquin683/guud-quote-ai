import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
const SERVICIOS = [
  { servicio: 'Branding Esencial', categoria: 'Branding', precio_min: 800000, precio_max: 1200000, descripcion: 'Naming, logo, paleta de color, tipografía', orden: 1 },
  { servicio: 'Branding Completo', categoria: 'Branding', precio_min: 1500000, precio_max: 2500000, descripcion: 'Identidad visual completa + manual de marca', orden: 2 },
  { servicio: 'Rebranding', categoria: 'Branding', precio_min: 1200000, precio_max: 2000000, descripcion: 'Renovación de identidad existente', orden: 3 },
  { servicio: 'Landing Page', categoria: 'Web', precio_min: 600000, precio_max: 1000000, descripcion: '1 página de alta conversión, responsive', orden: 1 },
  { servicio: 'Sitio Web Corporativo', categoria: 'Web', precio_min: 1200000, precio_max: 2500000, descripcion: '5-10 páginas, CMS, diseño a medida', orden: 2 },
  { servicio: 'E-commerce', categoria: 'Web', precio_min: 2000000, precio_max: 4000000, descripcion: 'Tienda online con pasarela de pago', orden: 3 },
  { servicio: 'App Web / Dashboard', categoria: 'Web', precio_min: 3000000, precio_max: 8000000, descripcion: 'Aplicación web a medida con backend', orden: 4 },
  { servicio: 'Campaña Digital Básica', categoria: 'Campaña', precio_min: 500000, precio_max: 900000, descripcion: 'Concepto creativo + 3 piezas principales', orden: 1 },
  { servicio: 'Campaña 360', categoria: 'Campaña', precio_min: 1500000, precio_max: 3000000, descripcion: 'Concepto + adaptaciones todos los canales', orden: 2 },
  { servicio: 'Lanzamiento de Producto', categoria: 'Campaña', precio_min: 2000000, precio_max: 4500000, descripcion: 'Estrategia + campaña + activación', orden: 3 },
  { servicio: 'Pack Redes Sociales', categoria: 'Contenido', precio_min: 350000, precio_max: 600000, descripcion: '12 posts mensuales + stories + copy', orden: 1 },
  { servicio: 'Producción Video / Reels', categoria: 'Contenido', precio_min: 250000, precio_max: 500000, descripcion: 'Guión + producción + edición por pieza', orden: 2 },
  { servicio: 'Fotografía Comercial', categoria: 'Contenido', precio_min: 400000, precio_max: 800000, descripcion: 'Sesión + edición + entrega de archivos', orden: 3 },
  { servicio: 'Consultoría Estratégica', categoria: 'Estrategia', precio_min: 300000, precio_max: 600000, descripcion: 'Diagnóstico + plan de acción por sesión', orden: 1 },
  { servicio: 'Plan de Marketing Digital', categoria: 'Estrategia', precio_min: 800000, precio_max: 1500000, descripcion: 'Estrategia 6 meses + roadmap + KPIs', orden: 2 },
  { servicio: 'Gestión Meta Ads', categoria: 'Ads', precio_min: 350000, precio_max: 600000, descripcion: 'Setup + gestión + reportes (sin pauta)', orden: 1 },
  { servicio: 'Gestión Google Ads', categoria: 'Ads', precio_min: 400000, precio_max: 700000, descripcion: 'Setup + gestión + optimización (sin pauta)', orden: 2 },
  { servicio: 'Setup Campañas', categoria: 'Ads', precio_min: 200000, precio_max: 400000, descripcion: 'Configuración inicial en cualquier plataforma', orden: 3 },
  { servicio: 'Activación de Marca', categoria: 'BTL', precio_min: 800000, precio_max: 2000000, descripcion: 'Concepto + producción + ejecución evento', orden: 1 },
  { servicio: 'Material Punto de Venta', categoria: 'BTL', precio_min: 300000, precio_max: 700000, descripcion: 'Diseño de piezas físicas para retail', orden: 2 },
  { servicio: 'Campaña Guerrilla', categoria: 'Guerrilla', precio_min: 600000, precio_max: 1500000, descripcion: 'Acción de alto impacto en espacio público', orden: 1 },
  { servicio: 'Viral Marketing', categoria: 'Guerrilla', precio_min: 500000, precio_max: 1200000, descripcion: 'Concepto + producción de contenido viral', orden: 2 },
]
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const { data: existing } = await supabase.from('tarifario').select('id').limit(1)
  if (existing && existing.length > 0) return res.status(200).json({ message: 'Ya inicializado', count: existing.length })
  const { data, error } = await supabase.from('tarifario').insert(SERVICIOS.map(s=>({...s,activo:true}))).select()
  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json({ message: 'OK', count: data.length })
}