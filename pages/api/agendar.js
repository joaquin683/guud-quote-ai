import { supabase } from '../../lib/supabase'

async function notifySlack(data) {
  const url = process.env.SLACK_WEBHOOK_URL
  if (!url) return
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: [
          '*Nuevo lead → GÜÜD Quote AI*',
          data.nombre_cliente ? '*Cliente:* ' + data.nombre_cliente : '',
          data.email_cliente  ? '*Email:* '   + data.email_cliente  : '',
          data.agente_usado   ? '*Servicio:* ' + data.agente_usado  : '',
          data.nombre_proyecto ? '*Proyecto:* ' + data.nombre_proyecto : '',
          data.precio_estimado_min ? '*Precio ref:* $' + new Intl.NumberFormat('es-CL').format(data.precio_estimado_min) : '',
        ].filter(Boolean).join('\n')
      })
    })
  } catch(e) { console.error('Slack error:', e.message) }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const { nombre, email, servicio, proyecto, precio, agente } = req.body
    if (!nombre || !email) return res.status(400).json({ error: 'nombre y email requeridos' })

    const row = {
      nombre_proyecto:     proyecto  || null,
      descripcion_cliente: servicio  || null,
      agente_usado:        agente    || null,
      precio_estimado_min: precio    || null,
      estado:              'cotizado',
    }

    const { data, error } = await supabase
      .from('proyectos')
      .insert([row])
      .select()
      .single()

    if (error) {
      console.error('Supabase insert error:', error.message, error.details)
    }

    const id = data?.id || null

    // Notify Slack (fire and forget)
    notifySlack({ nombre_cliente: nombre, email_cliente: email, agente_usado: agente, nombre_proyecto: proyecto, precio_estimado_min: precio })

    res.status(200).json({ ok: true, id })
  } catch(e) {
    console.error('agendar error:', e.message)
    res.status(200).json({ ok: true, id: null })
  }
}
