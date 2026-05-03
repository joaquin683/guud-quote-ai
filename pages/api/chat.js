import Anthropic from '@anthropic-ai/sdk'
import { getServicios, getTalentos, guardarProyecto } from '../../lib/supabase'
import { buildAgentPrompt } from '../../lib/agentes'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const { agente, historial, lang } = req.body

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
    }

    const finalReply = quote ? null : reply.replace(/{[\s\S]*?QUOTE[\s\S]*?}/g, '').trim() || reply.trim()
    res.status(200).json({ reply: finalReply, quote })

  } catch (e) {
    console.error('Chat error:', e)
    res.status(500).json({ error: e.message })
  }
}
