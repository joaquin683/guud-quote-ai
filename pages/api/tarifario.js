import fs from 'fs'
import path from 'path'

const DATA_FILE = path.join(process.cwd(), 'data', 'tarifario.json')

function readData() {
  try {
    const txt = fs.readFileSync(DATA_FILE, 'utf-8')
    return JSON.parse(txt)
  } catch(e) {
    return []
  }
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const data = readData()
    return res.status(200).json(data)
  }

  if (req.method === 'PUT') {
    const { id, precio_min, precio_max, descripcion, activo } = req.body
    if (!id) return res.status(400).json({ error: 'id requerido' })
    
    const data = readData()
    const idx = data.findIndex(s => s.id === id)
    if (idx === -1) return res.status(404).json({ error: 'Servicio no encontrado' })
    
    data[idx] = { ...data[idx], precio_min, precio_max, descripcion, activo }
    
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2))
      return res.status(200).json(data[idx])
    } catch(e) {
      return res.status(500).json({ error: e.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}