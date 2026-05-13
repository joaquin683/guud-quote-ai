import Anthropic from '@anthropic-ai/sdk'
import { getServicios, getTalentos, guardarProyecto } from '../../lib/supabase'
import { buildAgentPrompt } from '../../lib/agentes'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const { agente, historial, lang, meetLink: reunionLink } = req.body

    const [servicios, talentos] = await Promise.all([getServicios(), getTalentos()])
    const langNames = { es: 'español', en: 'English', pt: 'português (brasileño)' }
    const langInstruction = lang && langNames[lang] ? `\n\nIDIOMA: Responde SIEMPRE en ${langNames[lang]}. No cambies de idioma aunque el usuario escriba en otro.` : ''
    const systemPrompt = buildAgentPrompt(agente, servicios, talentos, historial) + langInstruction

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2048,
      system: systemPrompt,
      messages: historial,
    })

    let reply = response.content[0].text.trim()
    reply = reply.replace(/```json/gi, '').replace(/```/gi, '').trim()

    let quote = null
    const quoteMatch = reply.match(/{[\s\S]*?"QUOTE"\s*:\s*true[\s\S]*?}/)
    if (quoteMatch) {
      try {
        quote = JSON.parse(quoteMatch[0])
        await guardarProyecto({
          nombre_proyecto: quote.proyecto,
          descripcion_cliente: historial[0]?.content || '',
          agente_usado: agente,
          precio_estimado_min: quote.min,
          precio_estimado_max: quote.max,
          estado: 'cotizado',
        })
      } catch (_) {}

      // Enviar emails de seguimiento (fire and forget)
      try {
        const fmt = n => new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(n||0)
        const guudEmail = process.env.GUUD_EMAIL
        const baseUrl = process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'https://guud-quote-ai.vercel.app'

        // Detectar email del cliente en el historial
        const allText = historial.map(m => m.content).join(' ')
        const emailMatch = allText.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/)
        const clientEmail = emailMatch ? emailMatch[0] : null

        // HTML del email al cliente
        const htmlCliente = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
          *{margin:0;padding:0;box-sizing:border-box}
          body{font-family:system-ui,sans-serif;background:#f5f5f5;padding:40px 20px}
          .card{background:#fff;max-width:560px;margin:0 auto;border-radius:12px;overflow:hidden}
          .header{background:#111;padding:28px 32px;display:flex;align-items:center;gap:12px}
          .logo{color:#E8FF00;font-size:20px;font-weight:700;letter-spacing:-.5px}
          .sub{color:rgba(255,255,255,.5);font-size:12px;margin-top:2px}
          .body{padding:32px}
          h1{font-size:20px;font-weight:700;margin-bottom:6px;color:#111}
          .servicio{font-size:13px;color:#888;margin-bottom:24px}
          .row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:14px}
          .label{color:#888}.val{font-weight:500;text-align:right;max-width:60%}
          .price-block{margin:24px 0;background:#111;border-radius:10px;padding:20px 24px}
          .price-label{font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.5);margin-bottom:6px}
          .price-val{font-size:28px;font-weight:700;color:#E8FF00}
          .note{font-size:11px;color:rgba(255,255,255,.4);margin-top:6px}
          .cta{display:block;text-align:center;background:#E8FF00;color:#000;font-weight:700;font-size:14px;padding:14px;border-radius:8px;text-decoration:none;margin-top:24px}
          .footer{padding:20px 32px;background:#fafafa;border-top:1px solid #f0f0f0;font-size:11px;color:#aaa;text-align:center}
        </style></head><body>
        <div class="card">
          <div class="header"><div><div class="logo">GÜÜD</div><div class="sub">Global Creative Hub</div></div></div>
          <div class="body">
            <h1>${quote.proyecto || 'Tu cotización'}</h1>
            <div class="servicio">${quote.servicio || ''}</div>
            <div class="row"><span class="label">Entregables</span><span class="val">${quote.entregables || ''}</span></div>
            <div class="row"><span class="label">Tiempo estimado</span><span class="val">${quote.tiempo || ''}</span></div>
            ${quote.recomendacion ? '<div class="row"><span class="label">Recomendación</span><span class="val">' + quote.recomendacion + '</span></div>' : ''}
            <div class="price-block">
              <div class="price-label">Precio referencial</div>
              <div class="price-val">Desde ${fmt(quote.min)}</div>
              <div class="note">El valor definitivo se confirma en la reunión de proyecto.</div>
            </div>
            <a href="${reunionLink || baseUrl}" class="cta">${reunionLink ? 'Confirmar reunión →' : 'Agendar reunión con GÜÜD →'}</a>
          </div>
          <div class="footer">GÜÜD Company · Global Creative Hub · ${baseUrl}</div>
        </div></body></html>`

        // HTML del email interno a GÜÜD
        const htmlInterno = `<h2>Nueva cotización — ${quote.proyecto}</h2>
        <p><strong>Servicio:</strong> ${quote.servicio}<br>
        <strong>Agente:</strong> ${agente}<br>
        <strong>Precio min:</strong> ${fmt(quote.min)}<br>
        <strong>Precio max:</strong> ${fmt(quote.max)}<br>
        ${clientEmail ? '<strong>Email cliente:</strong> ' + clientEmail + '<br>' : ''}
        <strong>Entregables:</strong> ${quote.entregables}</p>
        <p><a href="${baseUrl}/admin">Ver en panel admin →</a></p>`

        const emailCalls = []

        // Email al cliente si tenemos su email
        if (clientEmail) {
          emailCalls.push(fetch(baseUrl + '/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: clientEmail,
              subject: 'Tu cotización de ' + (quote.servicio || 'GÜÜD') + ' está lista',
              html: htmlCliente
            })
          }))
        }

        // Siempre notificar a GÜÜD internamente
        if (guudEmail) {
          emailCalls.push(fetch(baseUrl + '/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: guudEmail,
              subject: '[GÜÜD Lead] ' + (quote.proyecto || 'Nueva cotización') + ' — ' + fmt(quote.min),
              html: htmlInterno
            })
          }))
        }

        await Promise.allSettled(emailCalls)
      } catch (emailErr) {
        console.error('Email error:', emailErr)
      }
    }

    const finalReply = quote ? null : reply.replace(/{[\s\S]*?QUOTE[\s\S]*?}/g, '').trim() || reply.trim()
    res.status(200).json({ reply: finalReply, quote })

  } catch (e) {
    console.error('Chat error:', e)
    res.status(500).json({ error: e.message })
  }
}
