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
          data.nombre ? '*Cliente:* ' + data.nombre : '',
          data.email  ? '*Email:* '   + data.email  : '',
          data.agente ? '*Servicio:* ' + data.agente : '',
          data.proyecto ? '*Proyecto:* ' + data.proyecto : '',
          data.precio ? '*Precio ref:* $' + new Intl.NumberFormat('es-CL').format(data.precio) : '',
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

    const { data, error } = await supabase
      .from('proyectos')
      .insert([{
        nombre_proyecto:     proyecto || null,
        descripcion_cliente: servicio || null,
        agente_usado:        agente   || null,
        precio_estimado_min: precio   || null,
        nombre_contacto:     nombre,
        email_contacto:      email,
        estado:              'cotizado',
      }])
      .select()
      .single()

    if (error) console.error('Supabase insert error:', error.message)

    notifySlack({ nombre, email, agente, proyecto, precio })
    res.status(200).json({ ok: true, id: data?.id || null })
  } catch(e) {
    console.error('agendar error:', e.message)
    res.status(200).json({ ok: true, id: null })
  }
}
