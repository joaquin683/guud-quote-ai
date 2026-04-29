import Anthropic from '@anthropic-ai/sdk'
import { getServicios, getTalentos } from '../../lib/supabase'
import { buildOrchestratorPrompt } from '../../lib/agentes'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const { mensaje } = req.body
    const servicios = await getServicios()

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 256,
      system: buildOrchestratorPrompt(servicios),
      messages: [{ role: 'user', content: mensaje }],
    })

    const text = response.content[0].text.trim()
    const json = JSON.parse(text.match(/\{[\s\S]*\}/)[0])
    res.status(200).json(json)
  } catch (e) {
    console.error('Orquestador error:', e)
    res.status(500).json({ error: e.message })
  }
}
