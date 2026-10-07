import crypto from 'crypto'
import { supabase } from './supabase'

// Rate limit persistente (Supabase). El de memoria no servia en Vercel:
// cada request puede caer en una instancia distinta y el conteo partia de cero.
// Requiere la funcion SQL check_rate_limit (ver sql/rate_limits.sql).
// Si Supabase falla, cae a un limite en memoria para no botar el cotizador.

const memoria = new Map()

export function getIp(req) {
  const fwd = String(req.headers['x-forwarded-for'] || '')
  return fwd.split(',')[0].trim() || req.headers['x-real-ip'] || (req.socket && req.socket.remoteAddress) || 'unknown'
}

function clave(scope, ip) {
  // Guardamos un hash, nunca la IP en claro
  const sal = process.env.RATE_LIMIT_SALT || 'guud-rl'
  return scope + ':' + crypto.createHash('sha256').update(ip + sal).digest('hex').slice(0, 32)
}

function enMemoria(k, max, ventanaSeg) {
  const ahora = Date.now()
  const lista = (memoria.get(k) || []).filter(t => ahora - t < ventanaSeg * 1000)
  if (lista.length >= max) { memoria.set(k, lista); return false }
  lista.push(ahora)
  memoria.set(k, lista)
  if (memoria.size > 5000) memoria.delete(memoria.keys().next().value)
  return true
}

// Devuelve true si la request puede pasar
export async function permitir(req, scope, max, ventanaSeg) {
  const k = clave(scope, getIp(req))
  try {
    const { data, error } = await supabase.rpc('check_rate_limit', { p_clave: k, p_max: max, p_ventana_seg: ventanaSeg })
    if (error) return enMemoria(k, max, ventanaSeg)
    return data !== false
  } catch (e) {
    return enMemoria(k, max, ventanaSeg)
  }
}
