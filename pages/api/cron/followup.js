import { supabase } from '../../../lib/supabase'

export default async function handler(req, res) {
  const auth = req.headers.authorization
  if (auth !== 'Bearer ' + process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: leads } = await supabase
      .from('proyectos')
      .select('id, nombre_cliente, email_cliente, nombre_proyecto, agente_usado, precio_estimado_min')
      .eq('estado', 'cotizado')
      .lt('created_at', cutoff)

    if (!leads || leads.length === 0) {
      return res.status(200).json({ ok: true, sent: 0 })
    }

    const slackUrl = process.env.SLACK_WEBHOOK_URL
    let sent = 0

    for (const lead of leads) {
      try {
        if (slackUrl) {
          await fetch(slackUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: [
                '*Follow-up pendiente (24h)*',
                lead.nombre_cliente ? '*Cliente:* ' + lead.nombre_cliente : '',
                lead.email_cliente  ? '*Email:* '   + lead.email_cliente  : '',
                lead.nombre_proyecto ? '*Proyecto:* ' + lead.nombre_proyecto : '',
                'Cotizó hace más de 24h y no agendó reunión.',
              ].filter(Boolean).join('\n')
            })
          })
        }
        sent++
      } catch(e) {
        console.error('followup error for', lead.id, e.message)
      }
    }

    res.status(200).json({ ok: true, sent })
  } catch(e) {
    console.error('cron error:', e.message)
    res.status(500).json({ error: e.message })
  }
}
