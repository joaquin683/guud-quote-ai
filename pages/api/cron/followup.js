import { supabase } from '../../lib/supabase'

export default async function handler(req, res) {
  // Security: only allow Vercel cron or internal calls
  const auth = req.headers.authorization
  if (auth !== 'Bearer ' + process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    // Find leads cotizados more than 24h ago without meeting scheduled
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: leads } = await supabase
      .from('proyectos')
      .select('*')
      .eq('estado', 'cotizado')
      .lt('created_at', cutoff)
      .is('followup_sent', null)
      .not('email_cliente', 'is', null)

    if (!leads || leads.length === 0) {
      return res.status(200).json({ ok: true, sent: 0 })
    }

    // Send follow-up via Resend (or Slack)
    const slackUrl = process.env.SLACK_WEBHOOK_URL
    let sent = 0

    for (const lead of leads) {
      try {
        // Slack notification
        if (slackUrl) {
          await fetch(slackUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: [`*Follow-up pendiente (24h)*`,
                `*Cliente:* ${lead.nombre_cliente} (${lead.email_cliente})`,
                `*Proyecto:* ${lead.nombre_proyecto || '-'}`,
                `Cotizó hace más de 24h y no agendó reunión.`
              ].join('\n')
            })
          })
        }

        // Mark followup_sent
        await supabase
          .from('proyectos')
          .update({ followup_sent: new Date().toISOString() })
          .eq('id', lead.id)

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
