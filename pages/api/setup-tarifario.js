import { createClient } from '@supabase/supabase-js'

const SERVICIOS = [
  { servicio: 'Branding Esencial', categoria: 'Branding', precio_min: 800000, precio_max: 1200000, descripcion: 'Naming, logo, paleta de color, tipografia', orden: 1 },
  { servicio: 'Branding Completo', categoria: 'Branding', precio_min: 1500000, precio_max: 2500000, descripcion: 'Identidad visual completa + manual de marca', orden: 2 },
  { servicio: 'Rebranding', categoria: 'Branding', precio_min: 1200000, precio_max: 2000000, descripcion: 'Renovacion de identidad existente', orden: 3 },
  { servicio: 'Landing Page', categoria: 'Web', precio_min: 600000, precio_max: 1000000, descripcion: '1 pagina de alta conversion, responsive', orden: 1 },
  { servicio: 'Sitio Web Corporativo', categoria: 'Web', precio_min: 1200000, precio_max: 2500000, descripcion: '5-10 paginas, CMS, diseno a medida', orden: 2 },
  { servicio: 'E-commerce', categoria: 'Web', precio_min: 2000000, precio_max: 4000000, descripcion: 'Tienda online con pasarela de pago', orden: 3 },
  { servicio: 'Key Visual + Concepto', categoria: 'Campana', precio_min: 600000, precio_max: 1200000, descripcion: 'Concepto creativo + imagen principal', orden: 1 },
  { servicio: 'Campana Digital Completa', categoria: 'Campana', precio_min: 1500000, precio_max: 3000000, descripcion: 'Estrategia + piezas para todos los canales', orden: 2 },
  { servicio: 'Lanzamiento de Marca', categoria: 'Campana', precio_min: 2500000, precio_max: 5000000, descripcion: 'Campana 360 con activaciones', orden: 3 },
  { servicio: 'Pack Redes Sociales', categoria: 'Contenido', precio_min: 300000, precio_max: 600000, descripcion: '12 piezas mensuales para RRSS', orden: 1 },
  { servicio: 'Gestion Mensual RRSS', categoria: 'Contenido', precio_min: 500000, precio_max: 900000, descripcion: 'Contenido + gestion de 2 plataformas', orden: 2 },
  { servicio: 'Produccion Audiovisual', categoria: 'Contenido', precio_min: 800000, precio_max: 2000000, descripcion: 'Video corporativo o reel de marca', orden: 3 },
  { servicio: 'Consultoria de Marca', categoria: 'Estrategia', precio_min: 400000, precio_max: 800000, descripcion: 'Sesion estrategica + informe', orden: 1 },
  { servicio: 'Plan Estrategico', categoria: 'Estrategia', precio_min: 1000000, precio_max: 2500000, descripcion: 'Estrategia de comunicacion anual', orden: 2 },
  { servicio: 'Activacion BTL', categoria: 'BTL', precio_min: 1500000, precio_max: 4000000, descripcion: 'Evento o activacion de marca', orden: 1 },
  { servicio: 'Experiencia de Marca', categoria: 'BTL', precio_min: 3000000, precio_max: 8000000, descripcion: 'Experiencia inmersiva completa', orden: 2 },
  { servicio: 'Setup Campana Ads', categoria: 'Ads', precio_min: 300000, precio_max: 500000, descripcion: 'Config + creatividades Meta/Google Ads', orden: 1 },
  { servicio: 'Gestion Mensual Ads', categoria: 'Ads', precio_min: 400000, precio_max: 700000, descripcion: 'Optimizacion mensual de campanas', orden: 2 },
  { servicio: 'Accion Guerrilla', categoria: 'Guerrilla', precio_min: 800000, precio_max: 2500000, descripcion: 'Accion creativa disruptiva en espacio urbano', orden: 1 },
  { servicio: 'MVP Digital', categoria: 'Producto', precio_min: 3000000, precio_max: 7000000, descripcion: 'Producto digital minimo viable', orden: 1 },
  { servicio: 'App Movil', categoria: 'Producto', precio_min: 6000000, precio_max: 15000000, descripcion: 'Aplicacion iOS/Android completa', orden: 2 },
]

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || anonKey

  // Intentar crear la tabla via SQL usando el service key o anon key
  // La Supabase SQL API solo acepta service key para DDL
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const sqlCreate = 'CREATE TABLE IF NOT EXISTS public.tarifario (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, servicio text UNIQUE NOT NULL, categoria text NOT NULL, precio_min integer NOT NULL DEFAULT 0, precio_max integer NOT NULL DEFAULT 0, descripcion text DEFAULT \'\', activo boolean DEFAULT true, orden integer DEFAULT 0, updated_at timestamptz DEFAULT now()); ALTER TABLE public.tarifario ENABLE ROW LEVEL SECURITY; DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename=\'tarifario\' AND policyname=\'Allow all\') THEN CREATE POLICY \"Allow all\" ON public.tarifario FOR ALL USING (true); END IF; END $$;'

    const sqlRes = await fetch(supabaseUrl + '/rest/v1/rpc/exec_sql', {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': 'Bearer ' + serviceKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql: sqlCreate })
    })
    // Si falla el rpc, intentar via Management API
    if (!sqlRes.ok) {
      const projectRef = supabaseUrl.replace('https://','').replace('.supabase.co','')
      await fetch('https://api.supabase.com/v1/projects/' + projectRef + '/database/query', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + serviceKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: sqlCreate })
      })
    }
  }

  // Ahora intentar el upsert con el cliente
  const supabase = createClient(supabaseUrl, serviceKey)
  const { data, error } = await supabase.from('tarifario').upsert(SERVICIOS, { onConflict: 'servicio' }).select()

  if (error) {
    if (error.message && error.message.includes('does not exist')) {
      return res.status(500).json({
        error: 'Tabla tarifario no existe',
        sql: 'CREATE TABLE IF NOT EXISTS public.tarifario (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, servicio text UNIQUE NOT NULL, categoria text NOT NULL, precio_min integer NOT NULL DEFAULT 0, precio_max integer NOT NULL DEFAULT 0, descripcion text DEFAULT \'\', activo boolean DEFAULT true, orden integer DEFAULT 0, updated_at timestamptz DEFAULT now()); ALTER TABLE public.tarifario ENABLE ROW LEVEL SECURITY; CREATE POLICY "Allow all" ON public.tarifario FOR ALL USING (true);',
        instruccion: 'Ejecuta el SQL en Supabase > SQL Editor > Nueva query'
      })
    }
    return res.status(500).json({ error: error.message })
  }
  return res.status(200).json({ ok: true, rows: data.length })
}