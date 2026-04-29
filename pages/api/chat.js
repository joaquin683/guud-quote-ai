import Anthropic from '@anthropic-ai/sdk'
import { getServicios, getTalentos, guardarProyecto } from '../../lib/supabase'
import { buildAgentPrompt } from '../../lib/agentes'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const { agente, historial, guardar } = req.body

    const [servicios, talentos] = await Promise.all([getServicios(), getTalentos()])
    const systemPrompt = buildAgentPrompt(agente, servicios, talentos, historial)

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: historial,
    })

    const reply = response.content[0].text.trim()

    // Detectar si es una cotización y guardarla en Supabase
    let quote = null
    const match = reply.match(/\{[\s\S]*"QUOTE"\s*:\s*true[\s\S]*\}/)
    if (match) {
      try {
        quote = JSON.parse(match[0])
        // Guardar el lead automáticamente en la base de datos
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

    res.status(200).json({ reply, quote })
  } catch (e) {
    console.error('Chat error:', e)
    res.status(500).json({ error: e.message })
  }
}
