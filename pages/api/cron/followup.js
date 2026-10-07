import { supabase } from '../../../lib/supabase'

// Seguimiento automatico: 1 email a leads que cotizaron y no agendaron en 48 h.
// Corre 1 vez al dia via Vercel Cron (ver vercel.json). Cada lead recibe maximo 1 seguimiento.
// Prueba sin enviar nada: GET /api/cron/followup?dry=1 (solo devuelve conteos, sin datos personales)

const MARCA = '[seguimiento-48h]'
const SITIO = 'https://www.guudcompany.cl/'

const esc = (t) => String(t == null ? '' : t)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const clp = (n) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n || 0)

function rango(p) {
  if (!p.precio_estimado_min && !p.precio_estimado_max) return 'Depende de la idea'
  if (p.precio_estimado_max && p.precio_estimado_max !== p.precio_estimado_min) {
    return clp(p.precio_estimado_min) + ' – ' + clp(p.precio_estimado_max)
  }
  return clp(p.precio_estimado_min || p.precio_estimado_max)
}

function autorizado(req) {
  const secret = process.env.CRON_SECRET
  const pin = process.env.ADMIN_PIN || process.env.NEXT_PUBLIC_ADMIN_PIN
  if (pin && req.headers['x-admin-pin'] === pin) return true
  if (secret) return req.headers.authorization === 'Bearer ' + secret
  return String(req.headers['user-agent'] || '').includes('vercel-cron')
}

function htmlSeguimiento(p, guudEmail) {
  const proyecto = esc(p.nombre_proyecto || 'tu proyecto')
  const asunto = encodeURIComponent('Quiero avanzar con ' + (p.nombre_proyecto || 'mi proyecto'))
  return '<!DOCTYPE html><html><head><meta charset="utf-8"></head>' +
    '<body style="margin:0;padding:40px 16px;background:#f5f5f5;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#111">' +
    '<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden">' +
      '<div style="background:#111;padding:28px 32px">' +
        '<div style="color:#E8FF00;font-size:20px;font-weight:700;letter-spacing:-.5px">GÜÜD Company</div>' +
        '<div style="color:rgba(255,255,255,.5);font-size:12px;margin-top:2px">Seguimiento de tu cotización</div>' +
      '</div>' +
      '<div style="padding:32px">' +
        '<p style="font-size:15px;line-height:1.6;margin:0 0 16px">Hola,</p>' +
        '<p style="font-size:15px;line-height:1.6;margin:0 0 20px">Hace un par de días cotizaste con nosotros <strong>' + proyecto + '</strong>. Queríamos saber si te quedó alguna duda o si te gustaría ajustar el alcance antes de avanzar.</p>' +
        '<div style="background:#f7f7f2;border-left:3px solid #E8FF00;border-radius:8px;padding:16px 20px;margin:0 0 20px">' +
          '<div style="font-size:12px;color:#777;text-transform:uppercase;letter-spacing:.06em">Inversión estimada</div>' +
          '<div style="font-size:20px;font-weight:700;margin-top:4px">' + esc(rango(p)) + '</div>' +
        '</div>' +
        '<p style="font-size:15px;line-height:1.6;margin:0 0 24px">Una conversación de 20 minutos suele bastar para definir plazos, entregables y una propuesta final ajustada a tu presupuesto.</p>' +
        '<a href="mailto:' + esc(guudEmail) + '?subject=' + asunto + '" style="display:inline-block;background:#E8FF00;color:#080808;font-weight:700;font-size:14px;text-decoration:none;padding:12px 22px;border-radius:24px">Quiero coordinar una reunión</a>' +
        '<p style="font-size:13px;line-height:1.6;margin:24px 0 0;color:#555">También puedes responder directamente este correo o revisar nuestros proyectos en <a href="' + SITIO + '" style="color:#111">guudcompany.cl</a>.</p>' +
      '</div>' +
      '<div style="padding:18px 32px;border-top:1px solid #eee;font-size:12px;color:#999;line-height:1.5">Equipo GÜÜD Company · Santiago, Chile<br>Este es el único recordatorio que te enviaremos sobre esta cotización.</div>' +
    '</div></body></html>'
}

async function enviar({ to, subject, html, replyTo }) {
  const from = 'GÜÜD Company <' + (process.env.GUUD_EMAIL || 'onboarding@resend.dev') + '>'
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
  })
  return r.ok
}

export default async function handler(req, res) {
  const dry = req.query.dry === '1'
  if (!dry && !autorizado(req)) return res.status(401).json({ error: 'No autorizado' })

  const ahora = Date.now()
  const desde = new Date(ahora - 7 * 24 * 3600 * 1000).toISOString()
  const hasta = new Date(ahora - 48 * 3600 * 1000).toISOString()

  const { data, error } = await supabase
    .from('proyectos')
    .select('id, nombre_proyecto, email_contacto, precio_estimado_min, precio_estimado_max, estado, reunion_agendada, notas, creado_en')
    .eq('estado', 'cotizado')
    .not('email_contacto', 'is', null)
    .gte('creado_en', desde)
    .lte('creado_en', hasta)

  if (error) return res.status(500).json({ error: error.message || 'Supabase error' })

  const pendientes = (data || []).filter(p => p.reunion_agendada !== true && !String(p.notas || '').includes(MARCA))

  // Modo prueba: solo conteos, sin datos personales ni envios
  if (dry) {
    return res.status(200).json({ ok: true, dry: true, candidatos: (data || []).length, pendientes: pendientes.length })
  }

  if (!process.env.RESEND_API_KEY) return res.status(500).json({ error: 'RESEND_API_KEY no configurada' })

  const guudEmail = process.env.GUUD_EMAIL || ''
  const enviados = []
  for (const p of pendientes) {
    try {
      const ok = await enviar({
        to: p.email_contacto,
        subject: 'Tu cotización de ' + (p.nombre_proyecto || 'tu proyecto') + ' sigue disponible',
        html: htmlSeguimiento(p, guudEmail),
        replyTo: guudEmail || undefined,
      })
      if (!ok) continue
      const nota = MARCA + ' enviado ' + new Date().toISOString().slice(0, 10)
      await supabase.from('proyectos').update({ notas: p.notas ? p.notas + '\n' + nota : nota }).eq('id', p.id)
      enviados.push(p)
    } catch (e) {
      console.error('followup error', p.id, e.message || e)
    }
  }

  if (enviados.length && guudEmail) {
    const filas = enviados.map(p => '<li>' + esc(p.nombre_proyecto || 'Sin nombre') + ' — ' + esc(p.email_contacto) + ' (' + esc(rango(p)) + ')</li>').join('')
    try {
      await enviar({
        to: guudEmail,
        subject: '[GÜÜD] Seguimientos enviados hoy: ' + enviados.length,
        html: '<p>Se envió el recordatorio de 48 h a estos leads que cotizaron y no agendaron:</p><ul>' + filas + '</ul><p>Si responden, la respuesta llega directo a este correo.</p>',
      })
    } catch (_) {}
  }

  return res.status(200).json({ ok: true, enviados: enviados.length })
}
