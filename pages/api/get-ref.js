export default function handler(req, res) {
  const { pin } = req.query
  if (pin !== 'estamosguud') return res.status(401).json({ error: 'unauthorized' })
  
  // Buscar connection strings de base de datos
  const dbUrl = process.env.POSTGRES_URL || 
                process.env.DATABASE_URL || 
                process.env.SUPABASE_DB_URL ||
                process.env.SUPABASE_POSTGRES_URL ||
                null
  
  // Listar nombres de todas las env vars disponibles
  const keys = Object.keys(process.env).filter(k => 
    !k.includes('PATH') && !k.includes('HOME') && !k.includes('USER')
  )
  
  res.json({ 
    dbUrl: dbUrl ? dbUrl.replace(/:([^@]+)@/, ':***@') : null,
    hasDbUrl: !!dbUrl,
    envKeys: keys
  })
}