import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'

const fmt = n => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)
const fmtDate = d => new Date(d).toLocaleString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const ESTADOS = {
  cotizado:    { label: 'Cotizado',       color: '#E8FF00', bg: 'rgba(232,255,0,0.12)' },
  contactado:  { label: 'Contactado',     color: '#5DCAA5', bg: 'rgba(93,202,165,0.12)' },
  negociacion: { label: 'En negociación', color: '#EF9F27', bg: 'rgba(239,159,39,0.12)' },
  cerrado:     { label: 'Cerrado',        color: '#1D9E75', bg: 'rgba(29,158,117,0.12)' },
  perdido:     { label: 'Perdido',        color: '#E24B4A', bg: 'rgba(226,75,74,0.12)' },
}
const isAgendado = p => p.reunion_agendada === true

export default function Admin() {
  const [authed, setAuthed] = useState(false)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState(false)

  const handlePin = () => {
    if (pin === (process.env.NEXT_PUBLIC_ADMIN_PIN || 'estamosguud')) {
      setAuthed(true)
      setPinError(false)
    } else {
      setPinError(true)
      setPin('')
    }
  }

  if (!authed) return (
    <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 16, padding: '40px 36px', width: 320, textAlign: 'center' }}>
        <Link href="/" style={{ display: 'block', textDecoration: 'none', marginBottom: 16 }}>
          <img src="/logo.gif" alt="GÜÜD" style={{ width: 52, height: 52, borderRadius: '50%', display: 'block', margin: '0 auto 10px', border: '1px solid rgba(232,255,0,0.2)' }} />
          <div style={{ fontSize: 13, fontWeight: 600, color: '#F2F0E8', textAlign: 'center', letterSpacing: '0.05em' }}>GÜÜD Company</div>
          <div style={{ fontSize: 10, color: '#484644', textAlign: 'center', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 2 }}>Global Creative HÜB</div>
        </Link>
        <div style={{ fontSize: 11, color: '#484644', marginBottom: 20, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Acceso admin</div>
        <input
          type="password"
          value={pin}
          onChange={e => { setPin(e.target.value); setPinError(false) }}
          onKeyDown={e => e.key === 'Enter' && handlePin()}
          placeholder="contraseña"
          autoFocus
          style={{ width: '100%', background: '#0D0D0D', border: pinError ? '1px solid #E24B4A' : '1px solid #1f1f1f', borderRadius: 8, padding: '10px 14px', color: '#F2F0E8', fontSize: 14, outline: 'none', letterSpacing: '0.1em', textAlign: 'center', fontFamily: 'inherit', boxSizing: 'border-box' }}
        />
        {pinError && <div style={{ fontSize: 12, color: '#E24B4A', marginTop: 8 }}>Contraseña incorrecta</div>}
        <button
          onClick={handlePin}
          style={{ width: '100%', background: '#E8FF00', border: 'none', borderRadius: 8, padding: '12px', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginTop: 16, fontFamily: 'inherit' }}
        >Entrar</button>
      </div>
    </div>
  )

  return <AdminPanel onLogout={() => setAuthed(false)} />
}

function AdminPanel({ onLogout }) {
  const [data, setData] = useState(null)
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroAgente, setFiltroAgente] = useState('')
  const [busqueda, setBusqueda] = useState('')

  const load = () => {
    const p = new URLSearchParams()
    if (filtroEstado) p.set('estado', filtroEstado)
    if (filtroAgente) p.set('agente', filtroAgente)
    fetch('/api/admin?' + p.toString()).then(r => r.json()).then(setData)
  }

  useEffect(() => { load() }, [filtroEstado, filtroAgente])

  const proyectos = (data?.proyectos || []).filter(p =>
    !busqueda || (p.nombre_proyecto || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (p.nombre_contacto || '').toLowerCase().includes(busqueda.toLowerCase())
  )

  const badge = (estado) => {
    const e = ESTADOS[estado] || { label: estado, color: '#888', bg: 'rgba(136,136,136,0.1)' }
    return <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: e.bg, color: e.color, fontWeight: 600 }}>{e.label}</span>
  }


  const actualizarEstado = async (id, nuevoEstado) => {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
    const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    try {
      await fetch(SUPABASE_URL + '/rest/v1/proyectos?id=eq.' + id, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': 'Bearer ' + SUPABASE_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ estado: nuevoEstado })
      })
      setProyectos(prev => prev.map(p => p.id === id ? { ...p, estado: nuevoEstado } : p))
    } catch(err) { console.error('Error actualizando estado:', err) }
  }
  return (
    <div style={{ minHeight: '100vh', background: '#080808', color: '#F2F0E8', fontFamily: 'system-ui, sans-serif' }}>
      <Head><title>Admin · GÜÜD</title></Head>

      <div style={{ borderBottom: '1px solid #1a1a1a', padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo.gif" alt="GÜÜD" style={{ width: 32, height: 32, borderRadius: '50%' }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#F2F0E8' }}>GÜÜD Company</div>
            <div style={{ fontSize: 10, color: '#484644', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Global Creative HÜB</div>
          </div>
        </Link>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#484644' }}>Panel Admin</span>
          <a href="/tarifario" style={{ fontSize: 12, color: '#888', textDecoration: 'none',
            padding: '5px 12px', borderRadius: 8, border: '0.5px solid rgba(255,255,255,0.15)' }}
          >Tarifario →</a>
          <button onClick={onLogout} style={{ fontSize: 12, color: '#484644', background: 'none', border: '1px solid #2a2a2a', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>Salir</button>
        </div>
      </div>

      <div style={{ padding: '24px 32px' }}>
        {data?.metricas && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Total cotizaciones', val: data.metricas.total },
              { label: 'Reuniones agendadas', val: data.metricas.agendadas },
              { label: 'Precio promedio', val: data.metricas.precio_promedio ? fmt(data.metricas.precio_promedio) : '—' },
              { label: 'Esta semana', val: data.metricas.esta_semana },
            ].map(m => (
              <div key={m.label} style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 10, padding: '16px 18px' }}>
                <div style={{ fontSize: 11, color: '#484644', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{m.label}</div>
                <div style={{ fontSize: 22, fontWeight: 600, color: '#F2F0E8' }}>{m.val ?? '—'}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <input
            placeholder="Buscar proyecto o contacto…"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            style={{ flex: 1, minWidth: 200, background: '#111', border: '1px solid #1f1f1f', borderRadius: 8, padding: '8px 14px', color: '#F2F0E8', fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
          />
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 8, padding: '8px 12px', color: '#F2F0E8', fontSize: 13, fontFamily: 'inherit' }}>
            <option value="">Todos los estados</option>
            {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={filtroAgente} onChange={e => setFiltroAgente(e.target.value)} style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 8, padding: '8px 12px', color: '#F2F0E8', fontSize: 13, fontFamily: 'inherit' }}>
            <option value="">Todos los agentes</option>
            {['branding','web','campana','contenido','estrategia','btl','ads','guerrilla','producto'].map(a => <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>)}
          </select>
          <button onClick={load} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, padding: '8px 16px', color: '#F2F0E8', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>↻ Actualizar</button>
        </div>

        {!data ? (
          <div style={{ textAlign: 'center', color: '#484644', padding: 60 }}>Cargando…</div>
        ) : proyectos.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#484644', padding: 60 }}>No hay cotizaciones todavía</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {proyectos.map(p => (
              <div key={p.id} style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 10, padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#F2F0E8', marginBottom: 4 }}>{p.nombre_proyecto || '(sin nombre)'}</div>
                    <div style={{ fontSize: 12, color: '#484644', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {p.nombre_contacto && <span>👤 {p.nombre_contacto}</span>}
                      {p.email_contacto && <span>✉ {p.email_contacto}</span>}
                      {p.agente_usado && <span>🤖 {p.agente_usado}</span>}
                      {p.creado_en && <span>🕐 {fmtDate(p.creado_en)}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                    {isAgendado(p) && <span style={{ fontSize: 11, color: '#4ade80' }}>📅 Reunión</span>}
                    {badge(p.estado)}
                    {p.precio_estimado_min && <span style={{ fontSize: 14, fontWeight: 600, color: '#E8FF00' }}>{fmt(p.precio_estimado_min)}</span>}
                  </div>
                </div>
                {p.descripcion_cliente && (
                  <div style={{ marginTop: 10, fontSize: 12, color: '#484644', borderTop: '1px solid #1a1a1a', paddingTop: 10 }}>{p.descripcion_cliente}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
