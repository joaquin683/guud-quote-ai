import { useState, useRef, useEffect } from 'react'
import Head from 'next/head'

const fmt = n => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)

const AGENT_LABELS = {
  branding:   { label: 'Especialista Branding', color: '#C8F135' },
  web:        { label: 'Especialista Web',       color: '#6EE7FF' },
  campana:    { label: 'Especialista Campaña',   color: '#FFB86C' },
  contenido:  { label: 'Especialista Contenido', color: '#FF79C6' },
  estrategia: { label: 'Consultor Estratégico',  color: '#BD93F9' },
}

const INITIAL_CHIPS = [
  'Necesito una campaña de lanzamiento',
  'Quiero rediseñar mi packaging',
  'Necesito identidad visual completa',
  'Quiero una web o e-commerce',
  'Contenido para redes con IA',
  'Quiero una estrategia creativa',
]

export default function Home() {
  const [fase, setFase]           = useState('inicio')   // inicio | orquestando | chat | cotizado | confirmado
  const [agente, setAgente]       = useState(null)
  const [historial, setHistorial] = useState([])
  const [mensajes, setMensajes]   = useState([])
  const [input, setInput]         = useState('')
  const [cargando, setCargando]   = useState(false)
  const [quote, setQuote]         = useState(null)
  const [proyectoId, setProyectoId] = useState(null)
  const [micActivo, setMicActivo] = useState(false)
  const [mini, setMini]           = useState(false)
  const [waveActive, setWaveActive] = useState(false)
  const [agendando, setAgendando] = useState(false)
  const [contacto, setContacto]   = useState({ nombre: '', email: '' })

  const chatRef   = useRef(null)
  const inputRef  = useRef(null)
  const canvasRef = useRef(null)
  const rafRef    = useRef(null)
  const wtRef     = useRef(0)

  // Canvas wave animation
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const draw = () => {
      const w = canvas.width, h = canvas.height
      ctx.clearRect(0, 0, w, h)
      const cfg = [
        { a: waveActive ? 13 : 3,   f: 0.09, p: 0,            op: 0.6,  lw: 1.5 },
        { a: waveActive ? 8  : 2,   f: 0.11, p: Math.PI * .4, op: 0.28, lw: 1   },
        { a: waveActive ? 5  : 1,   f: 0.14, p: Math.PI * 1.3,op: 0.15, lw: 0.7 },
      ]
      cfg.forEach(c => {
        ctx.beginPath()
        ctx.strokeStyle = `rgba(200,241,53,${c.op})`
        ctx.lineWidth = c.lw
        for (let x = 0; x <= w; x += 1.5) {
          const y = h / 2 + Math.sin(x * c.f + wtRef.current + c.p) * c.a
          x < 1 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        }
        ctx.stroke()
      })
      wtRef.current += waveActive ? 0.065 : 0.014
      rafRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(rafRef.current)
  }, [waveActive])

  useEffect(() => {
    chatRef.current?.scrollTo({ top: 9999, behavior: 'smooth' })
  }, [mensajes, cargando])

  const addMsg = (texto, rol, extra = null) => {
    setMensajes(prev => [...prev, { texto, rol, extra, id: Date.now() }])
  }

  const enviar = async (texto) => {
    const msg = texto || input.trim()
    if (!msg || cargando) return
    setInput('')
    if (inputRef.current) { inputRef.current.style.height = 'auto' }
    setMini(true)
    addMsg(msg, 'user')

    if (fase === 'inicio') {
      // Paso 1: orquestar
      setCargando(true)
      setWaveActive(true)
      setFase('orquestando')
      try {
        const res = await fetch('/api/orquestar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mensaje: msg }),
        })
        const data = await res.json()
        const agenteDetectado = data.agente || 'estrategia'
        setAgente(agenteDetectado)

        const nuevoHistorial = [{ role: 'user', content: msg }]
        setHistorial(nuevoHistorial)

        // Paso 2: primer mensaje del agente especializado
        const res2 = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agente: agenteDetectado, historial: nuevoHistorial }),
        })
        const data2 = await res2.json()
        if (data2.quote) {
          setQuote(data2.quote)
          setFase('cotizado')
          addMsg(null, 'ai', { type: 'quote', quote: data2.quote })
        } else {
          addMsg(data2.reply, 'ai')
          setHistorial(prev => [...prev, { role: 'assistant', content: data2.reply }])
          setFase('chat')
        }
      } catch (e) {
        addMsg('Hubo un error de conexión. Recarga la página e intenta de nuevo.', 'ai')
        setFase('inicio')
      }
      setCargando(false)
      setWaveActive(false)
    } else {
      // Conversación en curso con el agente
      const nuevoHistorial = [...historial, { role: 'user', content: msg }]
      setHistorial(nuevoHistorial)
      setCargando(true)
      setWaveActive(true)
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agente, historial: nuevoHistorial }),
        })
        const data = await res.json()
        if (data.quote) {
          setQuote(data.quote)
          setFase('cotizado')
          addMsg(null, 'ai', { type: 'quote', quote: data.quote })
        } else {
          addMsg(data.reply, 'ai')
          setHistorial(prev => [...prev, { role: 'assistant', content: data.reply }])
        }
      } catch (e) {
        addMsg('Error de conexión. Intenta de nuevo.', 'ai')
      }
      setCargando(false)
      setWaveActive(false)
    }
  }

  const aceptarCotizacion = () => {
    setAgendando(true)
  }

  const confirmarReunion = async () => {
    if (!contacto.nombre || !contacto.email) return
    setCargando(true)
    try {
      if (proyectoId) {
        await fetch('/api/agendar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ proyecto_id: proyectoId, ...contacto }),
        })
      }
    } catch (_) {}
    addMsg(null, 'ai', { type: 'confirmado', contacto })
    setFase('confirmado')
    setAgendando(false)
    setCargando(false)
  }

  const ajustarAlcance = () => {
    const msg = 'Quiero ajustar el alcance del proyecto.'
    addMsg(msg, 'user')
    const nuevoHistorial = [...historial, { role: 'user', content: msg }]
    setHistorial(nuevoHistorial)
    setFase('chat')
    setCargando(true)
    setWaveActive(true)
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agente, historial: nuevoHistorial }),
    }).then(r => r.json()).then(data => {
      addMsg(data.reply, 'ai')
      setHistorial(prev => [...prev, { role: 'assistant', content: data.reply }])
      setCargando(false)
      setWaveActive(false)
    })
  }

  const toggleMic = () => {
    setMicActivo(true)
    setTimeout(() => {
      const muestras = [
        'Necesito una campaña de lanzamiento para mi nueva marca',
        'Quiero rediseñar el packaging de mis productos',
        'Necesito identidad visual completa para mi startup',
        'Quiero una web con e-commerce para mi tienda',
      ]
      setInput(muestras[Math.floor(Math.random() * muestras.length)])
      setMicActivo(false)
      inputRef.current?.focus()
    }, 1800)
  }

  const agenteInfo = agente ? AGENT_LABELS[agente] : null

  return (
    <>
      <Head>
        <title>GÜÜD Quote AI — Cotiza tu proyecto creativo</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div style={S.app}>
        {/* Ambient */}
        <div style={S.amb} />

        {/* Header */}
        <header style={S.hdr}>
          <div style={S.logo}>
            GÜ<span style={{ color: 'var(--acc)' }}>Ü</span>D
            <span style={{ opacity: .25, margin: '0 7px' }}>|</span>
            Quote <span style={{ color: 'var(--t3)', fontSize: 12, fontWeight: 400, fontFamily: "'DM Sans'" }}>AI</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {agenteInfo && (
              <div style={{ ...S.badge, borderColor: agenteInfo.color + '44', color: agenteInfo.color, fontSize: 10 }}>
                {agenteInfo.label}
              </div>
            )}
            <a href="/admin" style={{ ...S.badge, color: 'var(--t3)' }}>Admin →</a>
          </div>
        </header>

        {/* Hero / Orb */}
        <div style={{ ...S.hero, ...(mini ? S.heroMini : {}) }}>
          <div style={{ ...S.orbWrap, ...(mini ? S.orbMini : {}) }}>
            <div style={S.ring1} />
            <div style={S.ring2} />
            <div style={{ ...S.orb, ...(waveActive ? S.orbLive : {}) }}>
              <canvas ref={canvasRef} width={86} height={86} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
            </div>
          </div>
          {!mini && <div style={S.heroTitle}>Cotiza tu próximo proyecto creativo</div>}
          {!mini && <div style={S.heroSub}>Cuéntanos qué necesitas y nuestra IA te entrega una estimación inmediata.</div>}
          {mini && <div style={{ ...S.heroTitle, fontSize: 14, marginTop: 7 }}>GÜÜD Quote AI</div>}
        </div>

        {/* Chat */}
        <div ref={chatRef} style={S.chat}>
          {mensajes.map(m => (
            <div key={m.id} style={{ ...S.row, ...(m.rol === 'user' ? S.rowUser : {}) }}>
              <div style={{ ...S.av, ...(m.rol === 'ai' ? S.avAi : S.avU) }}>
                {m.rol === 'ai' ? 'GÜ' : 'TÚ'}
              </div>
              {m.extra?.type === 'quote' ? (
                <QuoteCard quote={m.extra.quote} onAceptar={aceptarCotizacion} onAjustar={ajustarAlcance} />
              ) : m.extra?.type === 'confirmado' ? (
                <ConfirmCard contacto={m.extra.contacto} />
              ) : (
                <div style={{ ...S.bub, ...(m.rol === 'user' ? S.bubUser : S.bubAi) }}>
                  {m.texto}
                </div>
              )}
            </div>
          ))}

          {cargando && (
            <div style={S.row}>
              <div style={{ ...S.av, ...S.avAi }}>GÜ</div>
              <div style={{ ...S.bub, ...S.bubAi, padding: 0 }}>
                <div style={S.dots}>
                  <span style={{ ...S.dot, animationDelay: '0s' }} />
                  <span style={{ ...S.dot, animationDelay: '.18s' }} />
                  <span style={{ ...S.dot, animationDelay: '.36s' }} />
                </div>
              </div>
            </div>
          )}

          {/* Modal agendar reunión */}
          {agendando && (
            <div style={S.row}>
              <div style={{ ...S.av, ...S.avAi }}>GÜ</div>
              <div style={{ ...S.agendarCard }}>
                <div style={{ fontSize: 11, color: 'var(--acc)', fontFamily: 'Syne', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                  Agendar reunión con Joaquín Labbe
                </div>
                <input
                  style={S.formInput}
                  placeholder="Tu nombre"
                  value={contacto.nombre}
                  onChange={e => setContacto(p => ({ ...p, nombre: e.target.value }))}
                />
                <input
                  style={{ ...S.formInput, marginTop: 8 }}
                  placeholder="Tu email"
                  type="email"
                  value={contacto.email}
                  onChange={e => setContacto(p => ({ ...p, email: e.target.value }))}
                />
                <button
                  style={{ ...S.btnP, width: '100%', marginTop: 12 }}
                  onClick={confirmarReunion}
                  disabled={!contacto.nombre || !contacto.email || cargando}
                >
                  Confirmar reunión →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Chips iniciales */}
        {fase === 'inicio' && (
          <div style={S.chips}>
            {INITIAL_CHIPS.map((c, i) => (
              <button key={i} style={S.chip} onClick={() => enviar(c)}>{c}</button>
            ))}
          </div>
        )}

        {/* Input */}
        {fase !== 'confirmado' && (
          <div style={S.inputArea}>
            <div style={S.inputBox}>
              <textarea
                ref={inputRef}
                style={S.textarea}
                placeholder="Ej: Necesito una campaña para lanzar una marca…"
                rows={1}
                value={input}
                onChange={e => {
                  setInput(e.target.value)
                  e.target.style.height = 'auto'
                  e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px'
                }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() } }}
              />
              <button
                style={{ ...S.icoBtn, ...S.mic, ...(micActivo ? S.micOn : {}) }}
                onClick={toggleMic}
                title="Voz (simulado)"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>
                </svg>
              </button>
              <button
                style={{ ...S.icoBtn, ...S.snd, ...(!input.trim() || cargando ? S.sndDis : {}) }}
                onClick={() => enviar()}
                disabled={!input.trim() || cargando}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes dot { 0%,80%,100%{transform:scale(1);opacity:.3} 40%{transform:scale(1.35);opacity:1} }
        @keyframes up { from{opacity:0;transform:translateY(7px)} to{opacity:1;transform:translateY(0)} }
        @keyframes mpulse { 0%,100%{box-shadow:0 0 0 0 rgba(200,241,53,.25)} 50%{box-shadow:0 0 0 5px transparent} }
      `}</style>
    </>
  )
}

function QuoteCard({ quote, onAceptar, onAjustar }) {
  const fmt = n => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)
  return (
    <div style={{ flex: 1, minWidth: 0, animation: 'up .35s ease' }}>
      <div style={S.qcard}>
        <div style={S.qhdr}>
          <div style={S.qtag}>Estimación · GÜÜD Company</div>
          <div style={S.qname}>{quote.proyecto}</div>
          <div style={{ fontSize: 11.5, color: 'var(--t2)' }}>{quote.servicio}</div>
        </div>
        <div style={{ padding: '12px 16px' }}>
          {[
            ['Entregables', quote.entregables],
            ['Tiempo estimado', quote.tiempo],
            ['Equipo sugerido', quote.talentos_sugeridos?.join(', ')],
            ['Director Creativo', 'Joaquín Labbe'],
          ].filter(([, v]) => v).map(([k, v]) => (
            <div key={k} style={S.qrow}>
              <span style={{ color: 'var(--t2)', flexShrink: 0, marginRight: 12 }}>{k}</span>
              <span style={{ color: 'var(--t1)', fontWeight: 500, textAlign: 'right', fontSize: 12, lineHeight: 1.4 }}>{v}</span>
            </div>
          ))}
          {quote.recomendacion && (
            <div style={S.qrow}>
              <span style={{ color: 'var(--t2)', flexShrink: 0, marginRight: 12 }}>GÜÜD dice</span>
              <span style={{ color: 'var(--acc)', fontStyle: 'italic', fontSize: 12, textAlign: 'right' }}>"{quote.recomendacion}"</span>
            </div>
          )}
        </div>
        <div style={S.qprice}>
          <span style={{ fontSize: 11, color: 'var(--t2)' }}>Rango estimado (CLP)</span>
          <span style={S.qpval}>{fmt(quote.min)} – {fmt(quote.max)}</span>
        </div>
        <div style={{ padding: '12px 16px', display: 'flex', gap: 9 }}>
          <button style={S.btnP} onClick={onAceptar}>Aceptar estimación</button>
          <button style={S.btnS} onClick={onAjustar}>Ajustar alcance</button>
        </div>
      </div>
    </div>
  )
}

function ConfirmCard({ contacto }) {
  return (
    <div style={{ flex: 1, minWidth: 0, animation: 'up .35s ease' }}>
      <div style={S.ccard}>
        <div style={S.cicon}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--acc)" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16, marginBottom: 5 }}>¡Reunión confirmada!</div>
        <div style={{ fontSize: 12.5, color: 'var(--t2)', lineHeight: 1.55 }}>
          {contacto.nombre}, Joaquín te contactará a <strong style={{ color: 'var(--t1)' }}>{contacto.email}</strong> en las próximas horas.
        </div>
        <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--bg3)', borderRadius: 9, border: '0.5px solid var(--b1)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#18183a', border: '0.5px solid var(--acc3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne', fontWeight: 800, fontSize: 12, color: 'var(--acc)', flexShrink: 0 }}>JL</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Joaquín Labbe</div>
            <div style={{ fontSize: 11, color: 'var(--t2)', marginTop: 1 }}>Director Creativo Ejecutivo · GÜÜD Company</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Estilos como objetos JS
const S = {
  app: { display: 'flex', flexDirection: 'column', height: '100vh', maxWidth: 720, margin: '0 auto', position: 'relative', zIndex: 2 },
  amb: { position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 600px 300px at 50% -80px, rgba(200,241,53,0.04), transparent)' },
  hdr: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px', borderBottom: '0.5px solid var(--b1)', flexShrink: 0 },
  logo: { fontFamily: 'Syne', fontWeight: 800, fontSize: 17, letterSpacing: '.01em' },
  badge: { fontSize: 10, color: 'var(--t3)', border: '0.5px solid var(--b2)', padding: '3px 10px', borderRadius: 20, letterSpacing: '.06em', textTransform: 'uppercase', fontFamily: 'Syne' },
  hero: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '22px 0 12px', flexShrink: 0, transition: 'all .45s' },
  heroMini: { padding: '8px 0 5px' },
  heroTitle: { fontFamily: 'Syne', fontWeight: 700, fontSize: 21, marginTop: 14, textAlign: 'center' },
  heroSub: { fontSize: 13, color: 'var(--t2)', textAlign: 'center', marginTop: 6, maxWidth: 320, lineHeight: 1.55 },
  orbWrap: { width: 86, height: 86, position: 'relative', transition: 'all .45s' },
  orbMini: { width: 46, height: 46 },
  ring1: { position: 'absolute', inset: -8, borderRadius: '50%', border: '0.5px solid rgba(200,241,53,0.13)', animation: 'spin 10s linear infinite' },
  ring2: { position: 'absolute', inset: -15, borderRadius: '50%', border: '0.5px solid rgba(200,241,53,0.06)', animation: 'spin 15s linear infinite reverse' },
  orb: { position: 'absolute', inset: 0, borderRadius: '50%', background: '#0f0f13', border: '0.5px solid rgba(200,241,53,0.2)', overflow: 'hidden', transition: 'border-color .3s, box-shadow .3s' },
  orbLive: { borderColor: 'rgba(200,241,53,0.5)', boxShadow: '0 0 24px rgba(200,241,53,0.1)' },
  chat: { flex: 1, overflowY: 'auto', padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 11 },
  row: { display: 'flex', gap: 10, animation: 'up .28s ease' },
  rowUser: { flexDirection: 'row-reverse' },
  av: { width: 27, height: 27, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7.5, fontWeight: 800, fontFamily: 'Syne', marginTop: 2 },
  avAi: { background: '#0f0f13', border: '0.5px solid rgba(200,241,53,0.25)', color: 'var(--acc)' },
  avU: { background: 'var(--bg3)', border: '0.5px solid var(--b2)', color: 'var(--t2)' },
  bub: { maxWidth: '84%', padding: '11px 14px', borderRadius: 14, fontSize: 13.5, lineHeight: 1.65, color: 'var(--t1)' },
  bubAi: { background: '#131317', border: '0.5px solid var(--b1)', borderTopLeftRadius: 3 },
  bubUser: { background: '#1c1c22', border: '0.5px solid var(--b2)', borderTopRightRadius: 3 },
  dots: { display: 'flex', gap: 4, padding: '13px 14px' },
  dot: { width: 5, height: 5, borderRadius: '50%', background: 'var(--acc)', opacity: .3, display: 'inline-block', animation: 'dot 1.1s ease-in-out infinite' },
  chips: { padding: '0 20px 9px', display: 'flex', flexWrap: 'wrap', gap: 7, flexShrink: 0 },
  chip: { padding: '7px 14px', borderRadius: 20, border: '0.5px solid var(--b2)', background: 'var(--bg2)', fontSize: 12, color: 'var(--t2)', cursor: 'pointer', transition: 'all .18s', fontFamily: 'DM Sans' },
  inputArea: { padding: '10px 20px 22px', flexShrink: 0 },
  inputBox: { display: 'flex', alignItems: 'flex-end', gap: 9, background: 'var(--bg3)', border: '0.5px solid var(--b2)', borderRadius: 20, padding: '10px 11px 10px 17px' },
  textarea: { flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--t1)', fontFamily: 'DM Sans', fontSize: 14, lineHeight: 1.5, resize: 'none', maxHeight: 96, minHeight: 22, padding: '1px 0' },
  icoBtn: { width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .2s' },
  mic: { background: 'none', border: '0.5px solid var(--b2)', color: 'var(--t3)' },
  micOn: { background: 'rgba(200,241,53,0.1)', borderColor: 'rgba(200,241,53,0.35)', color: 'var(--acc)', animation: 'mpulse 1s ease-in-out infinite' },
  snd: { background: 'var(--acc)', border: 'none', color: '#0a0a0b' },
  sndDis: { background: 'var(--bg3)', color: 'var(--t3)', cursor: 'not-allowed' },
  // Quote card
  qcard: { border: '0.5px solid rgba(200,241,53,.22)', borderRadius: 16, overflow: 'hidden', background: '#0e0e12' },
  qhdr: { padding: '15px 17px 11px', borderBottom: '0.5px solid var(--b1)' },
  qtag: { fontSize: 9.5, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--acc)', fontFamily: 'Syne', marginBottom: 5 },
  qname: { fontFamily: 'Syne', fontWeight: 700, fontSize: 16, color: 'var(--t1)', marginBottom: 3, lineHeight: 1.3 },
  qrow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '6px 0', borderBottom: '0.5px solid var(--b1)', fontSize: 12.5 },
  qprice: { padding: '13px 17px', borderTop: '0.5px solid var(--b1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  qpval: { fontFamily: 'Syne', fontWeight: 800, fontSize: 20, color: 'var(--acc)' },
  btnP: { flex: 1, padding: 11, background: 'var(--acc)', color: '#0a0a0b', border: 'none', borderRadius: 10, fontFamily: 'Syne', fontWeight: 700, fontSize: 12.5, cursor: 'pointer' },
  btnS: { flex: 1, padding: 11, background: 'none', color: 'var(--t2)', border: '0.5px solid var(--b2)', borderRadius: 10, fontSize: 12.5, cursor: 'pointer', fontFamily: 'DM Sans' },
  // Confirm card
  ccard: { border: '0.5px solid rgba(200,241,53,.28)', borderRadius: 16, padding: '20px 17px', textAlign: 'center', background: 'rgba(200,241,53,.03)' },
  cicon: { width: 42, height: 42, borderRadius: '50%', background: 'rgba(200,241,53,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 11px' },
  // Agendar form
  agendarCard: { flex: 1, border: '0.5px solid rgba(200,241,53,.22)', borderRadius: 16, padding: '16px 17px', background: '#0e0e12', minWidth: 0 },
  formInput: { width: '100%', background: 'var(--bg3)', border: '0.5px solid var(--b2)', borderRadius: 10, padding: '10px 13px', fontSize: 13, color: 'var(--t1)', outline: 'none', fontFamily: 'DM Sans' },
}
