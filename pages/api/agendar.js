import { supabase } from '../../lib/supabase'

async function notifySlack({ nombre, email, empresa, servicio, precio, proyecto }) {
  const url = process.env.SLACK_WEBHOOK_URL
  if (!url) return
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: [`*Nuevo lead en GÜÜD Quote AI*`,
          `*Cliente:* ${nombre} (${email})`,
          empresa ? `*Empresa:* ${empresa}` : '',
          `*Servicio:* ${servicio || 'No especificado'}`,
          `*Proyecto:* ${proyecto || '-'}`,
          precio ? `*Precio ref:* ${precio}` : '',
        ].filter(Boolean).join('\n')
      })
    })
  } catch(e) { console.error('Slack notify error:', e.message) }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  try {
    const { nombre, email, empresa, telefono, servicio, proyecto, entregables, precio, tiempo, asesoria, agente } = req.body
    if (!nombre || !email) return res.status(400).json({ error: 'nombre y email requeridos' })

    const { data, error } = await supabase.from('proyectos').insert([{
      nombre_cliente: nombre,
      email_cliente: email,
      empresa: empresa || null,
      telefono: telefono || null,
      nombre_proyecto: proyecto || null,
      descripcion_cliente: servicio || null,
      agente_usado: agente || null,
      precio_estimado_min: precio || null,
      estado: 'cotizado',
      entregables: entregables || null,
      tiempo_estimado: tiempo || null,
    }]).select().single()

    if (error) console.error('Supabase insert error:', error.message)

    // Notify Slack async (fire and forget)
    notifySlack({ nombre, email, empresa, servicio, precio, proyecto })

    res.status(200).json({ ok: true, id: data?.id || null })
  } catch(e) {
    console.error('agendar error:', e.message)
    res.status(200).json({ ok: true })
  }
}
