export default async function handler(req, res) {
  const REPO = 'joaquin683/guud-quote-ai'
  const FILE = 'data/tarifario.json'
  const TOKEN = process.env.GITHUB_TOKEN
  const headers = { 'Authorization': 'token ' + TOKEN, 'Content-Type': 'application/json' }

  // Función helper para leer el archivo de GitHub
  async function readFile() {
    const r = await fetch('https://api.github.com/repos/' + REPO + '/contents/' + FILE, { headers })
    const meta = await r.json()
    if (!meta.content) throw new Error('No content')
    const bin = Buffer.from(meta.content.replace(/\n/g,''), 'base64').toString('utf-8')
    return { data: JSON.parse(bin), sha: meta.sha }
  }

  if (req.method === 'GET') {
    try {
      const { data } = await readFile()
      return res.status(200).json(data)
    } catch(e) {
      return res.status(500).json({ error: e.message })
    }
  }

  if (req.method === 'PUT') {
    if (!TOKEN) return res.status(500).json({ error: 'GITHUB_TOKEN not set' })
    const { id, precio_min, precio_max, descripcion, activo } = req.body
    if (!id) return res.status(400).json({ error: 'id requerido' })

    try {
      const { data, sha } = await readFile()
      const idx = data.findIndex(s => s.id === String(id))
      if (idx === -1) return res.status(404).json({ error: 'Servicio no encontrado' })

      data[idx] = { ...data[idx], precio_min, precio_max, descripcion, activo }

      const newContent = Buffer.from(JSON.stringify(data, null, 2)).toString('base64')
      const r = await fetch('https://api.github.com/repos/' + REPO + '/contents/' + FILE, {
        method: 'PUT', headers,
        body: JSON.stringify({ message: 'update: tarifario ' + data[idx].servicio, content: newContent, sha })
      })
      const result = await r.json()
      if (!result.commit) return res.status(500).json({ error: JSON.stringify(result).slice(0,100) })
      return res.status(200).json(data[idx])
    } catch(e) {
      return res.status(500).json({ error: e.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}