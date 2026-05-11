import { useState, useEffect } from 'react'
import Head from 'next/head'

const fmt = n => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)
const fmtDate = d => new Date(d).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const ESTADOS = { cotizado: { label: 'Cotizado', color: '#E8FF00', bg: 'rgba(232,255,0,0.1)' }, meeting_scheduled: { label: 'Reunión agendada', color: '#4ade80', bg: 'rgba(74,222,128,0.1)' } }
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
    <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 16, padding: '40px 36px', width: 320, textAlign: 'center' }}>
        <a href="/" style={{ display: 'block', textDecoration: 'none', marginBottom: 16 }}>
          <img src="/logo.gif" alt="GÜÜD Company" style={{ width: 52, height: 52, borderRadius: '50%', display: 'block', margin: '0 auto 10px', border: '1px solid rgba(232,255,0,0.2)' }} />
          <div style={{ fontSize: 13, fontWeight: 600, color: '#F2F0E8', textAlign: 'center', letterSpacing: '0.05em' }}>GÜÜD Company</div>
          <div style={{ fontSize: 10, color: '#484644', textAlign: 'center', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 2 }}>Global Creative HÜB</div>
        </a>
        <div style={{ fontSize: 11, color: '#484644', marginBottom: 20, textAlign: 'center', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Acceso admin</div>

        <input
          type="password"
          value={pin}
          onChange={e => { setPin(e.target.value); setPinError(false) }}
          onKeyDown={e => e.key === 'Enter' && handlePin()}
          placeholder="contraseña"
          autoFocus
          style={{ width: '100%', background: '#0D0D0D', border: pinError ? '1px solid #E24B4A' : '1px solid #1f1f1f', borderRadius: 8, padding: '12px 16px', color: '#F2F0E8', fontSize: 18, textAlign: 'center', letterSpacing: 8, outline: 'none', marginBottom: 8 }}
        />
        {pinError && <div style={{ fontSize: 12, color: '#E24B4A', marginBottom: 8 }}>PIN incorrecto</div>}
        <button
          onClick={handlePin}
          style={{ width: '100%', background: '#E8FF00', border: 'none', borderRadius: 8, padding: '12px', fontWeight: 700, fontSize: 14, cursor: 'pointer', color: '#0A0A0A', marginTop: 8 }}
        >Entrar</button>
      </div>
    </div>
  )

  const [data, setData] = useState(null)
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroAgente, setFiltroAgente] = useState('')
  const [busqueda, setBusqueda] = useState('')

  const load = () => {
    const params = new URLSearchParams()
    if (filtroEstado) params.set('estado', filtroEstado)
    if (filtroAgente) params.set('agente', filtroAgente)
    fetch('/api/admin?' + params).then(r => r.json()).then(setData)
  }

  useEffect(() => { load() }, [filtroEstado, filtroAgente])

  const proyectos = (data?.proyectos || []).filter(p =>
    !busqueda || (p.nombre_contacto||'-' + ' ' + p.email_contacto||'-' + ' ' + (p.nombre_proyecto||'')).toLowerCase().includes(busqueda.toLowerCase())
  )

  const S = {
    page: { minHeight: '100vh', background: '#080808', color: '#EDEBE5', fontFamily: 'DM Sans, sans-serif', padding: '0 0 60px' },
    hdr: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 32px', borderBottom: '0.5px solid rgba(255,255,255,0.08)' },
    logo: { fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 18 },
    back: { fontSize: 13, color: 'rgba(255,255,255,0.4)', textDecoration: 'none' },
    body: { maxWidth: 1100, margin: '0 auto', padding: '32px 24px' },
    metrics: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 32 },
    metCard: { background: '#0F0F0F', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '16px 18px' },
    metVal: { fontSize: 28, fontWeight: 700, fontFamily: 'Unbounded, sans-serif', color: '#E8FF00' },
    metLbl: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '.06em' },
    filters: { display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' },
    inp: { background: '#111', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '8px 12px', color: '#EDEBE5', fontSize: 13, outline: 'none', flex: 1, minWidth: 200 },
    sel: { background: '#111', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '8px 12px', color: '#EDEBE5', fontSize: 13, outline: 'none' },
    refreshBtn: { background: 'none', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '8px 14px', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { textAlign: 'left', fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: '.1em', textTransform: 'uppercase', padding: '8px 12px', borderBottom: '0.5px solid rgba(255,255,255,0.08)' },
    td: { padding: '12px 12px', borderBottom: '0.5px solid rgba(255,255,255,0.05)', fontSize: 13, verticalAlign: 'top' },
    empty: { textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.3)', fontSize: 14 },
  }
  const badge = estado => ({ fontSize: 10, padding: '3px 8px', borderRadius: 10, background: (ESTADOS[estado]||{bg:'rgba(255,255,255,0.08)'}).bg, color: (ESTADOS[estado]||{color:'#888'}).color, fontWeight: 600 })

  return (
    <>
      <Head><title>Admin · GÜÜD Quote AI</title><link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@700;900&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet" /></Head>
      <div style={S.page}>
        <header style={S.hdr}>
          <div style={S.logo}>GÜ<span style={{color:'#E8FF00'}}>Ü</span>D Admin</div>
          <a href="/" style={S.back}>← Volver a la app</a>
        </header>
        <div style={S.body}>
          {data && (
            <div style={S.metrics}>
              <div style={S.metCard}><div style={S.metVal}>{data.metrics.total}</div><div style={S.metLbl}>Total leads</div></div>
              <div style={S.metCard}><div style={S.metVal}>{data.metrics.cotizados}</div><div style={S.metLbl}>Cotizados</div></div>
              <div style={S.metCard}><div style={S.metVal}>{data.metrics.agendados}</div><div style={S.metLbl}>Reuniones agendadas</div></div>
              <div style={S.metCard}><div style={{...S.metVal, fontSize: data.metrics.avgPrecio ? 18 : 28}}>{data.metrics.avgPrecio ? fmt(data.metrics.avgPrecio) : '-'}</div><div style={S.metLbl}>Ticket promedio</div></div>
            </div>
          )}
          <div style={S.filters}>
            <input style={S.inp} placeholder="Buscar cliente, email o proyecto…" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
            <select style={S.sel} value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
              <option value="">Todos los estados</option>
              <option value="cotizado">Cotizados</option>
              <option value="meeting_scheduled">Con reunión</option>
            </select>
            <select style={S.sel} value={filtroAgente} onChange={e => setFiltroAgente(e.target.value)}>
              <option value="">Todos los servicios</option>
              <option value="branding">Branding</option>
              <option value="web">Web</option>
              <option value="campana">Campaña</option>
              <option value="contenido">Contenido</option>
              <option value="estrategia">Estrategia</option>
            </select>
            <button style={S.refreshBtn} onClick={load}>↻ Actualizar</button>
          </div>
          {!data ? (
            <div style={S.empty}>Cargando leads…</div>
          ) : proyectos.length === 0 ? (
            <div style={S.empty}>No hay leads que coincidan.</div>
          ) : (
            <table style={S.table}>
              <thead><tr>{['Cliente','Email','Proyecto','Servicio','Precio ref.','Estado','Fecha'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>
                {proyectos.map((p,i) => (
                  <tr key={i} style={{background: i%2===0?'transparent':'rgba(255,255,255,0.015)'}}>
                    <td style={S.td}>{p.nombre_contacto||'-'||'-'}</td>
                    <td style={{...S.td,color:'rgba(255,255,255,0.45)'}}>{p.email_contacto||'-'||'-'}</td>
                    <td style={S.td}>{p.nombre_proyecto||'-'}</td>
                    <td style={{...S.td,textTransform:'capitalize',color:'rgba(255,255,255,0.5)'}}>{p.agente_usado||'-'}</td>
                    <td style={S.td}>{p.precio_estimado_min?fmt(p.precio_estimado_min):'-'}</td>
                    <td style={S.td}><span style={badge(p.estado)}>{(ESTADOS[p.estado]||{label:p.estado||'?'}).label}</span></td>
                    <td style={{...S.td,color:'rgba(255,255,255,0.35)',fontSize:11}}>{p.creado_en?fmtDate(p.creado_en):'-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}
