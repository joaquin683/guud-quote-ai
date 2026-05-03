import { supabase } from '../../lib/supabase'

export default async function handler(req, res) {
  const tests = {}

  // Test 1: Can we read from proyectos?
  try {
    const { data, error } = await supabase.from('proyectos').select('*').limit(3)
    tests.read = { ok: !error, count: data?.length, error: error?.message, sample: data?.[0] }
  } catch(e) { tests.read = { ok: false, error: e.message } }

  // Test 2: Try minimal insert
  try {
    const { data, error } = await supabase
      .from('proyectos')
      .insert([{ nombre_proyecto: '__diag_test__', estado: 'cotizado' }])
      .select()
      .single()
    tests.insert = { ok: !error, id: data?.id, error: error?.message, hint: error?.hint, details: error?.details }
    // Clean up
    if (data?.id) await supabase.from('proyectos').delete().eq('id', data.id)
  } catch(e) { tests.insert = { ok: false, error: e.message } }

  res.status(200).json(tests)
}
