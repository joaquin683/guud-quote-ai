import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'

const fmt = n => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)

export default function CotizacionShare() {
  const router = useRouter()
  const { id } = router.query
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id) return
    fetch('/api/proyecto?id=' + id)
      .then(r => r.ok ? r.json() : Promise.reject('not found'))
      .then(setData)
      .catch(() => setError(true))
  }, [id])

  const S = {
    page: { minHeight: '100vh', background: '#080808', color: '#EDEBE5', fontFamily: 'DM Sans, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '0 20px 60px' },
    hdr: { width: '100%', maxWidth: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 0', marginBottom: 32 },
    logo: { fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 18 },
    card: { width: '100%', maxWidth: 600, border: '0.5px solid rgba(232,255,0,0.2)', borderRadius: 18, overflow: 'hidden', background: '#0E0E0E' },
    tag: { fontSize: 9, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#E8FF00', fontFamily: 'Unbounded, sans-serif', padding: '14px 16px 0', display: 'block' },
    title: { fontFamily: 'Unbounded, sans-serif', fontWeight: 700, fontSize: 17, padding: '8px 16px 14px', borderBottom: '0.5px solid rgba(255,255,255,0.07)', lineHeight: 1.3 },
    row: { display: 'flex', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.05)', fontSize: 13 },
    rowLabel: { color: 'rgba(255,255,255,0.45)' },
    advisory: { padding: '12px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.07)' },
    advisoryLabel: { fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6, display: 'block' },
    advisoryText: { fontSize: 13, color: '#EDEBE5', lineHeight: 1.65 },
    priceRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.07)' },
    price: { fontSize: 24, fontWeight: 700, fontFamily: 'Unbounded, sans-serif', color: '#E8FF00' },
    cta: { padding: '14px 16px' },
    ctaBtn: { display: 'block', textAlign: 'center', background: '#E8FF00', color: '#080808', borderRadius: 10, padding: '13px', fontFamily: 'Unbounded, sans-serif', fontWeight: 700, fontSize: 13, textDecoration: 'none', width: '100%' },
    meta: { fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 20 },
    error: { textAlign: 'center', padding: '80px 0', color: 'rgba(255,255,255,0.4)', fontSize: 15 },
  }

  return (
    <>
      <Head>
        <title>{data ? (data.nombre_proyecto || 'Cotización') + ' · GÜÜD Quote AI' : 'GÜÜD Quote AI'}</title>
        <link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@700;900&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div style={S.page}>
        <div style={S.hdr}>
          <div style={S.logo}>GÜ<span style={{color:'#E8FF00'}}>Ü</span>D Quote AI</div>
          <a href="/" style={{fontSize: 13, color: 'rgba(255,255,255,0.4)', textDecoration: 'none'}}>Cotizar un proyecto</a>
        </div>

        {error && <div style={S.error}>Cotización no encontrada.</div>}
        {!data && !error && <div style={S.error}>Cargando…</div>}

        {data && (
          <>
            <div style={S.card}>
              <span style={S.tag}>Estimación · GÜÜD Company</span>
              <div style={S.title}>{data.nombre_proyecto || 'Proyecto creativo'}</div>

              {data.descripcion_cliente && (
                <div style={S.row}><span style={S.rowLabel}>Servicio</span><span style={{textTransform:'capitalize'}}>{data.agente_usado||data.descripcion_cliente}</span></div>
              )}
              {data.entregables && (
                <div style={{...S.row, flexDirection:'column', gap:4}}>
                  <span style={S.rowLabel}>Entregables</span>
                  <span>{data.entregables}</span>
                </div>
              )}
              {data.tiempo_estimado && (
                <div style={S.row}><span style={S.rowLabel}>Tiempo estimado</span><span>{data.tiempo_estimado}</span></div>
              )}

              {data.asesoria && (
                <div style={S.advisory}>
                  <span style={S.advisoryLabel}>Asesoría GÜÜD</span>
                  <div style={S.advisoryText}>{data.asesoria}</div>
                </div>
              )}

              <div style={S.priceRow}>
                <span style={{fontSize:12, color:'rgba(255,255,255,0.45)'}}>Precio referencial</span>
                <span style={S.price}>{data.precio_estimado_min ? fmt(data.precio_estimado_min) : '-'}</span>
              </div>

              <div style={S.cta}>
                <a href="/?agenda=1" style={S.ctaBtn}>Agendar reunión con GÜÜD</a>
              </div>
            </div>
            <div style={S.meta}>Cotización generada con GÜÜD Quote AI</div>
          </>
        )}
      </div>
    </>
  )
}
