import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const SERVICIOS = [
  // Branding
  { servicio: 'Branding Esencial', categoria: 'Branding', precio_min: 800000, precio_max: 1200000, descripcion: 'Naming, logo, paleta de color, tipografía', orden: 1 },
  { servicio: 'Branding Completo', categoria: 'Branding', precio_min: 1500000, precio_max: 2500000, descripcion: 'Identidad visual completa + manual de marca', orden: 2 },
  { servicio: 'Rebranding', categoria: 'Branding', precio_min: 1200000, precio_max: 2000000, descripcion: 'Renovación de identidad existente', orden: 3 },
  // Web
  { servicio: 'Landing Page', categoria: 'Web', precio_min: 600000, precio_max: 1000000, descripcion: '1 página de alta conversión, responsive', orden: 1 },
  { servicio: 'Sitio Web Corporativo', categoria: 'Web', precio_min: 1200000, precio_max: 2500000, descripcion: '5-10 páginas, CMS, diseño a medida', orden: 2 },
  { servicio: 'E-commerce', categoria: 'Web', precio_min: 2000000, precio_max: 4000000, descripcion: 'Tienda online completa con pasarela de pago', orden: 3 },
  // Campaña
  { servicio: 'Key Visual + Concepto', categoria: 'Campaña', precio_min: 600000, precio_max: 1200000, descripcion: 'Concepto creativo + imagen principal de campaña', orden: 1 },
  { servicio: 'Campaña Digital Completa', categoria: 'Campaña', precio_min: 1500000, precio_max: 3000000, descripcion: 'Estrategia + piezas para todos los canales digitales', orden: 2 },
  { servicio: 'Lanzamiento de Marca', categoria: 'Campaña', precio_min: 2500000, precio_max: 5000000, descripcion: 'Campaña 360 para lanzamiento con activaciones', orden: 3 },
  // Contenido
  { servicio: 'Pack Redes Sociales', categoria: 'Contenido', precio_min: 300000, precio_max: 600000, descripcion: '12 piezas mensuales para RRSS', orden: 1 },
  { servicio: 'Gestión Mensual RRSS', categoria: 'Contenido', precio_min: 500000, precio_max: 900000, descripcion: 'Contenido + gestión de 2 plataformas', orden: 2 },
  { servicio: 'Producción Audiovisual', categoria: 'Contenido', precio_min: 800000, precio_max: 2000000, descripcion: 'Video corporativo o reel de marca', orden: 3 },
  // Estrategia
  { servicio: 'Consultoría de Marca', categoria: 'Estrategia', precio_min: 400000, precio_max: 800000, descripcion: 'Sesión estratégica + informe de posicionamiento', orden: 1 },
  { servicio: 'Plan Estratégico', categoria: 'Estrategia', precio_min: 1000000, precio_max: 2500000, descripcion: 'Estrategia de comunicación anual', orden: 2 },
  // BTL
  { servicio: 'Activación BTL', categoria: 'BTL', precio_min: 1500000, precio_max: 4000000, descripcion: 'Evento o activación de marca en punto de venta', orden: 1 },
  { servicio: 'Experiencia de Marca', categoria: 'BTL', precio_min: 3000000, precio_max: 8000000, descripcion: 'Experiencia inmersiva completa', orden: 2 },
  // Ads
  { servicio: 'Setup Campaña Ads', categoria: 'Ads', precio_min: 300000, precio_max: 500000, descripcion: 'Configuración + creatividades para Meta o Google Ads', orden: 1 },
  { servicio: 'Gestión Mensual Ads', categoria: 'Ads', precio_min: 400000, precio_max: 700000, descripcion: 'Optimización mensual de campañas activas', orden: 2 },
  // Guerrilla
  { servicio: 'Acción Guerrilla', categoria: 'Guerrilla', precio_min: 800000, precio_max: 2500000, descripcion: 'Acción creativa disruptiva en espacio urbano', orden: 1 },
  // Producto
  { servicio: 'MVP Digital', categoria: 'Producto', precio_min: 3000000, precio_max: 7000000, descripcion: 'Producto digital mínimo viable con diseño + dev', orden: 1 },
  { servicio: 'App Móvil', categoria: 'Producto', precio_min: 6000000, precio_max: 15000000, descripcion: 'Aplicación iOS/Android completa', orden: 2 },
]

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    // Intentar insertar los servicios (la tabla debe existir en Supabase)
    const { data, error } = await supabase
      .from('tarifario')
      .upsert(SERVICIOS, { onConflict: 'servicio' })
      .select()

    if (error) return res.status(500).json({ error: error.message, hint: 'Crear tabla manualmente en Supabase' })
    return res.status(200).json({ ok: true, inserted: data.length, servicios: data })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
