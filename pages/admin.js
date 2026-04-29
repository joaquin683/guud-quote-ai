import { useState, useEffect } from 'react'
import Head from 'next/head'

const ESTADOS = {
  lead:      { label: 'Lead',       color: '#6EE7FF' },
  cotizado:  { label: 'Cotizado',   color: '#C8F135' },
  aceptado:  { label: 'Aceptado',   color: '#FFB86C' },
  en_curso:  { label: 'En curso',   color: '#BD93F9' },
  cerrado:   { label: 'Cerrado',    color: '#8F8D89' },
}

const fmt = n => n ? new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n) : '—'
const fmtDate = d => d ? new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'

export default function Admin() {
  const [tab, setTab]           = useState('leads')
  const [proyectos, setProyectos] = useState([])
  const [servicios, setServicios] = useState([])
  const [talentos, setTalentos]   = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [pRes, sRes, tRes] = await Promise.all([
        fetch('/api/admin'),
        fetch('/api/servicios'),
        fetch('/api/talentos'),
      ])
      const [p, s, t] = await Promise.all([pRes.json(), sRes.json(), tRes.json()])
      setProyectos(p.proyectos || [])
      setServicios(s.servicios || [])
      setTalentos(t.talentos || [])
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const totalCotizado = proyectos.filter(p => p.estado !== 'lead').length
  const totalAceptado = proyectos.filter(p => p.estado === 'aceptado' || p.estado === 'en_curso').length
  const valorPipeline = proyectos.reduce((acc, p) => acc + (p.precio_estimado_max || 0), 0)

  return (
    <>
      <Head><title>GÜÜD Admin — Dashboard</title></Head>
      <div style={A.wrap}>
        <div style={A.amb} />

        {/* Header */}
        <header style={A.hdr}>
          <div style={A.logo}>GÜ<span style={{ color: 'var(--acc)' }}>Ü</span>D <span style={{ opacity: .3 }}>|</span> <span style={{ color: 'var(--t2)', fontWeight: 400, fontSize: 14 }}>Admin</span></div>
          <div style={{ display: 'flex', gap: 8 }}>
            <a href="/" style={A.badgeBtn}>← App pública</a>
            <button style={A.badgeBtn} onClick={fetchAll}>↻ Actualizar</button>
          </div>
        </header>

        {/* Métricas */}
        <div style={A.metrics}>
          {[
            { label: 'Total leads', value: proyectos.length },
            { label: 'Cotizados',   value: totalCotizado },
            { label: 'Aceptados',   value: totalAceptado },
            { label: 'Pipeline máx', value: fmt(valorPipeline) },
          ].map(m => (
            <div key={m.label} style={A.metCard}>
              <div style={A.metVal}>{m.value}</div>
              <div style={A.metLbl}>{m.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={A.tabs}>
          {[['leads', 'Leads & Proyectos'], ['servicios', 'Servicios & Tarifas'], ['talentos', 'Equipo']].map(([key, label]) => (
            <button key={key} style={{ ...A.tab, ...(tab === key ? A.tabActive : {}) }} onClick={() => setTab(key)}>
              {label}
              {key === 'leads' && proyectos.length > 0 && (
                <span style={A.tabBadge}>{proyectos.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Contenido */}
        <div style={A.content}>
          {loading ? (
            <div style={{ textAlign: 'center', color: 'var(--t3)', padding: 40 }}>Cargando…</div>
          ) : tab === 'leads' ? (
            <LeadsTable proyectos={proyectos} />
          ) : tab === 'servicios' ? (
            <ServiciosTable servicios={servicios} />
          ) : (
            <TalentosTable talentos={talentos} />
          )}
        </div>
      </div>

      <style>{`
        @keyframes up { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </>
  )
}

function LeadsTable({ proyectos }) {
  if (proyectos.length === 0) return (
    <div style={{ textAlign: 'center', color: 'var(--t3)', padding: 60, fontSize: 14 }}>
      Aún no hay leads. Cuando un cliente cotice, aparecerán aquí automáticamente.
    </div>
  )
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={A.table}>
        <thead>
          <tr>
            {['Proyecto', 'Agente', 'Rango CLP', 'Estado', 'Contacto', 'Reunión', 'Fecha'].map(h => (
              <th key={h} style={A.th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {proyectos.map(p => {
            const est = ESTADOS[p.estado] || ESTADOS.lead
            return (
              <tr key={p.id} style={A.tr}>
                <td style={A.td}>
                  <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--t1)' }}>{p.nombre_proyecto || '—'}</div>
                  <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2, maxWidth: 200 }}>{p.descripcion_cliente?.substring(0, 60)}{p.descripcion_cliente?.length > 60 ? '…' : ''}</div>
                </td>
                <td style={{ ...A.td, fontSize: 12 }}>{p.agente_usado || '—'}</td>
                <td style={{ ...A.td, fontSize: 12, color: 'var(--acc)' }}>
                  {p.precio_estimado_min ? `${new Intl.NumberFormat('es-CL').format(p.precio_estimado_min)} – ${new Intl.NumberFormat('es-CL').format(p.precio_estimado_max)}` : '—'}
                </td>
                <td style={A.td}>
                  <span style={{ ...A.pill, borderColor: est.color + '44', color: est.color }}>{est.label}</span>
                </td>
                <td style={{ ...A.td, fontSize: 12 }}>
                  {p.nombre_contacto && <div style={{ color: 'var(--t1)' }}>{p.nombre_contacto}</div>}
                  {p.email_contacto && <div style={{ color: 'var(--t3)', fontSize: 11 }}>{p.email_contacto}</div>}
                  {!p.nombre_contacto && <span style={{ color: 'var(--t3)' }}>—</span>}
                </td>
                <td style={A.td}>
                  <span style={{ fontSize: 16 }}>{p.reunion_agendada ? '✓' : '·'}</span>
                </td>
                <td style={{ ...A.td, fontSize: 11, color: 'var(--t3)' }}>{fmtDate(p.creado_en)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function ServiciosTable({ servicios }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 12 }}>
        Para editar precios, ve a <strong style={{ color: 'var(--t2)' }}>supabase.com → Table Editor → servicios</strong> y edita directamente.
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={A.table}>
          <thead>
            <tr>
              {['Servicio', 'Agente', 'Precio mín', 'Precio máx', 'Tiempo', 'Activo'].map(h => (
                <th key={h} style={A.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {servicios.map(s => (
              <tr key={s.id} style={A.tr}>
                <td style={A.td}>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{s.nombre}</div>
                  <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>{s.descripcion}</div>
                </td>
                <td style={{ ...A.td, fontSize: 12 }}>{s.agente}</td>
                <td style={{ ...A.td, fontSize: 12, color: 'var(--acc)' }}>{new Intl.NumberFormat('es-CL').format(s.precio_min)}</td>
                <td style={{ ...A.td, fontSize: 12, color: 'var(--acc)' }}>{new Intl.NumberFormat('es-CL').format(s.precio_max)}</td>
                <td style={{ ...A.td, fontSize: 12 }}>{s.tiempo_estimado}</td>
                <td style={A.td}><span style={{ fontSize: 16 }}>{s.activo ? '✓' : '·'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TalentosTable({ talentos }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 12 }}>
        Para editar el equipo, ve a <strong style={{ color: 'var(--t2)' }}>supabase.com → Table Editor → talentos</strong>.
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={A.table}>
          <thead>
            <tr>
              {['Nombre', 'Rol', 'Skills', 'Horas disponibles', 'Tarifa/hora', 'Email'].map(h => (
                <th key={h} style={A.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {talentos.map(t => (
              <tr key={t.id} style={A.tr}>
                <td style={A.td}><div style={{ fontWeight: 500, fontSize: 13 }}>{t.nombre}</div></td>
                <td style={{ ...A.td, fontSize: 12, color: 'var(--t2)' }}>{t.rol}</td>
                <td style={A.td}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {t.skills?.map(s => (
                      <span key={s} style={{ ...A.pill, fontSize: 10, color: 'var(--acc)', borderColor: 'rgba(200,241,53,.2)' }}>{s}</span>
                    ))}
                  </div>
                </td>
                <td style={{ ...A.td, fontSize: 13 }}>
                  <span style={{ color: t.disponibilidad_horas > 20 ? 'var(--acc)' : 'var(--coral)' }}>{t.disponibilidad_horas}h</span>
                </td>
                <td style={{ ...A.td, fontSize: 12, color: 'var(--t2)' }}>{t.tarifa_hora ? new Intl.NumberFormat('es-CL').format(t.tarifa_hora) : '—'}</td>
                <td style={{ ...A.td, fontSize: 12, color: 'var(--t3)' }}>{t.email || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const A = {
  wrap: { minHeight: '100vh', maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 2, padding: '0 0 40px' },
  amb: { position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 600px 300px at 50% -80px, rgba(200,241,53,0.03), transparent)' },
  hdr: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '0.5px solid var(--b1)', marginBottom: 24 },
  logo: { fontFamily: 'Syne', fontWeight: 800, fontSize: 17 },
  badgeBtn: { fontSize: 11, color: 'var(--t3)', border: '0.5px solid var(--b2)', padding: '4px 11px', borderRadius: 20, background: 'none', cursor: 'pointer', fontFamily: 'DM Sans' },
  metrics: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, padding: '0 24px 24px' },
  metCard: { background: 'var(--bg2)', borderRadius: 12, border: '0.5px solid var(--b1)', padding: '14px 16px' },
  metVal: { fontFamily: 'Syne', fontWeight: 700, fontSize: 22, color: 'var(--t1)' },
  metLbl: { fontSize: 11, color: 'var(--t3)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '.06em' },
  tabs: { display: 'flex', gap: 0, padding: '0 24px', borderBottom: '0.5px solid var(--b1)', marginBottom: 20 },
  tab: { padding: '10px 16px', fontSize: 13, color: 'var(--t3)', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '2px solid transparent', transition: 'all .2s', display: 'flex', alignItems: 'center', gap: 7 },
  tabActive: { color: 'var(--t1)', borderBottomColor: 'var(--acc)' },
  tabBadge: { fontSize: 10, background: 'var(--bg3)', border: '0.5px solid var(--b2)', padding: '1px 6px', borderRadius: 10, color: 'var(--t2)' },
  content: { padding: '0 24px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '8px 12px', fontSize: 10.5, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.07em', borderBottom: '0.5px solid var(--b1)', fontWeight: 500 },
  tr: { borderBottom: '0.5px solid var(--b1)', transition: 'background .15s' },
  td: { padding: '12px 12px', verticalAlign: 'top', color: 'var(--t2)' },
  pill: { display: 'inline-block', padding: '2px 8px', borderRadius: 20, border: '0.5px solid', fontSize: 11 },
}
