import { supabase } from '../../lib/supabase'

const fmt = (n) => {
  if (n === null || n === undefined || n === '') return 'A convenir'
  const num = Number(n)
  if (isNaN(num)) return String(n)
  return '$' + num.toLocaleString('es-CL')
}

const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const {
    email,
    agente,
    servicio,
    precio_min,
    precio_max,
    asesoria,
    entregables,
    tiempo,
    proyecto_id,
  } = req.body || {}

  // El email del lead es obligatorio para esta notificación
  if (!email) return res.status(400).json({ error: 'email requerido' })

  // 1) Guardar/enriquecer el lead en Supabase con su email (aunque no agende)
  try {
    const lead = {
      email_contacto: email,
      agente_usado: agente || null,
      nombre_proyecto: servicio || null,
      precio_estimado_min: precio_min ?? null,
      precio_estimado_max: precio_max ?? null,
      estado: 'cotizado',
    }
    if (proyecto_id) {
      await supabase.from('proyectos').update(lead).eq('id', proyecto_id)
    } else {
      await supabase.from('proyectos').insert([lead])
    }
  } catch (dbErr) {
    console.error('notify-quote supabase error:', dbErr.message)
  }

  // 2) Mail de aviso al equipo (Joaquín + copia a Tomás)
  const destino = process.env.GUUD_EMAIL || 'joaquin@guudcompany.cl'
  const copia = process.env.GUUD_CC_EMAIL || 'tomas@guudcompany.cl'

  const precioStr = (precio_min || precio_max)
    ? (precio_max && precio_max !== precio_min
        ? fmt(precio_min) + ' – ' + fmt(precio_max)
        : 'Desde ' + fmt(precio_min || precio_max))
    : 'A convenir'

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#fff;border-radius:14px;overflow:hidden">
    <div style="padding:22px 26px;border-bottom:1px solid #222">
      <div style="font-weight:800;font-size:20px;letter-spacing:1px">GÜÜD<span style="color:#d6ff3f">.</span></div>
      <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:2px">Global Creative Hüb</div>
    </div>
    <div style="padding:26px">
      <div style="display:inline-block;background:#d6ff3f;color:#000;font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;text-transform:uppercase;letter-spacing:1px">Nuevo lead · cotizó</div>
      <h1 style="font-size:22px;margin:16px 0 4px">Alguien cotizó en el chat</h1>
      <p style="color:#aaa;margin:0 0 20px;font-size:14px">Este lead generó una cotización. Hacele seguimiento por mail.</p>

      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:8px 0;color:#888;width:130px">Email del lead</td><td style="padding:8px 0;font-weight:700"><a href="mailto:${esc(email)}" style="color:#d6ff3f;text-decoration:none">${esc(email)}</a></td></tr>
        <tr><td style="padding:8px 0;color:#888">Servicio</td><td style="padding:8px 0">${esc(servicio || '—')}</td></tr>
        <tr><td style="padding:8px 0;color:#888">Agente</td><td style="padding:8px 0;text-transform:capitalize">${esc(agente || '—')}</td></tr>
        <tr><td style="padding:8px 0;color:#888">Precio referencial</td><td style="padding:8px 0;font-weight:700;color:#d6ff3f">${esc(precioStr)}</td></tr>
        ${tiempo ? `<tr><td style="padding:8px 0;color:#888">Tiempo estimado</td><td style="padding:8px 0">${esc(tiempo)}</td></tr>` : ''}
        ${entregables ? `<tr><td style="padding:8px 0;color:#888;vertical-align:top">Entregables</td><td style="padding:8px 0">${esc(entregables)}</td></tr>` : ''}
      </table>

      ${asesoria ? `
      <div style="margin-top:22px;padding-top:18px;border-top:1px solid #222">
        <div style="font-size:11px;color:#d6ff3f;text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:8px">Asesoría GÜÜD entregada</div>
        <p style="color:#ccc;font-size:13px;line-height:1.6;margin:0">${esc(asesoria)}</p>
      </div>` : ''}

      <div style="margin-top:24px">
        <a href="mailto:${esc(email)}?subject=Tu%20cotización%20con%20GÜÜD" style="display:inline-block;background:#d6ff3f;color:#000;font-weight:700;padding:12px 22px;border-radius:30px;text-decoration:none;font-size:14px">Responder al lead</a>
      </div>
    </div>
    <div style="padding:16px 26px;border-top:1px solid #222;color:#666;font-size:11px">GÜÜD Quote AI · notificación automática de cotización</div>
  </div>`

  try {
    const baseUrl = process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'https://guud-quote-ai.vercel.app'
    const r = await fetch(baseUrl + '/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: destino,
        cc: copia,
        subject: '🔥 Nuevo lead cotizó: ' + (servicio || agente || 'proyecto') + ' (' + precioStr + ')',
        html,
      }),
    })
    const data = await r.json()
    if (!r.ok) return res.status(200).json({ ok: false, mail: false, error: data.error })
    return res.status(200).json({ ok: true, mail: true })
  } catch (e) {
    return res.status(200).json({ ok: false, mail: false, error: e.message })
  }
}
