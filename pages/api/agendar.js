import { supabase } from '../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const { proyecto_id, nombre, email, notas } = req.body

    const { error } = await supabase
      .from('proyectos')
      .update({
        reunion_agendada: true,
        nombre_contacto: nombre,
        email_contacto: email,
        notas: notas,
        estado: 'aceptado',
        actualizado_en: new Date().toISOString(),
      })
      .eq('id', proyecto_id)

    if (error) throw error
    res.status(200).json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
