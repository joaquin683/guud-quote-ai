import { useState, useRef, useEffect } from 'react'
import Head from 'next/head'

const fmt = n => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)

const AGENT_LABELS = {
  branding:   { label: 'Especialista Branding',  color: '#E8FF00' },
  web:        { label: 'Especialista Web',        color: '#E8FF00' },
  campana:    { label: 'Especialista Campaña',    color: '#E8FF00' },
  contenido:  { label: 'Especialista Contenido',  color: '#E8FF00' },
  estrategia: { label: 'Consultor Estratégico',   color: '#E8FF00' },
}

const INITIAL_CHIPS = [
  'Quiero lanzar una marca desde cero',
  'Necesito renovar mi identidad visual',
  'Quiero una web que venda',
  'Necesito contenido para mis redes',
  'Quiero una campaña que impacte',
  'No sé por dónde empezar',
]

const WELCOME_MSG = '¡Hola! Soy la IA creativa de GÜÜD Company. Estoy aquí para ayudarte a cotizar tu próximo proyecto y conectarte con el mejor talento creativo. ¿Qué tienes en mente?'

export default function Home() {
  const [fase, setFase]             = useState('inicio')
  const [agente, setAgente]         = useState(null)
  const [historial, setHistorial]   = useState([])
  const [mensajes, setMensajes]     = useState([])
  const [input, setInput]           = useState('')
  const [cargando, setCargando]     = useState(false)
  const [micActivo, setMicActivo]   = useState(false)
  const [mini, setMini]             = useState(false)
  const [waveActive, setWaveActive] = useState(false)
  const [agendando, setAgendando]   = useState(false)
  const [contacto, setContacto]     = useState({ nombre: '', email: '' })
  const [proyectoId, setProyectoId] = useState(null)
  const [welcomeDone, setWelcomeDone] = useState(false)

  const chatRef   = useRef(null)
  const inputRef  = useRef(null)
  const canvasRef = useRef(null)
  const rafRef    = useRef(null)
  const wtRef     = useRef(0)

  // Mensaje de bienvenida automático
  useEffect(() => {
    if (welcomeDone) return
    setWelcomeDone(true)
    setWaveActive(true)
    const timer = setTimeout(() => {
      setMensajes([{ texto: WELCOME_MSG, rol: 'ai', extra: null, id: 'welcome' }])
      setWaveActive(false)
    }, 1200)
    return () => clearTimeout(timer)
  }, [])

  // Canvas wave
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const draw = () => {
      const w = canvas.width, h = canvas.height
      ctx.clearRect(0, 0, w, h)
      const lines = [
        { a: waveActive ? 14 : 3,  f: 0.09, p: 0,             op: 0.7,  lw: 2   },
        { a: waveActive ? 9  : 2,  f: 0.11, p: Math.PI * .4,  op: 0.35, lw: 1.2 },
        { a: waveActive ? 5  : 1,  f: 0.14, p: Math.PI * 1.3, op: 0.18, lw: 0.8 },
      ]
      lines.forEach(l => {
        ctx.beginPath()
        ctx.strokeStyle = `rgba(232,255,0,${l.op})`
        ctx.lineWidth = l.lw
        for (let x = 0; x <= w; x += 1.5) {
          const y = h / 2 + Math.sin(x * l.f + wtRef.current + l.p) * l.a
          x < 1 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        }
        ctx.stroke()
      })
      wtRef.current += waveActive ? 0.07 : 0.015
      rafRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(rafRef.current)
  }, [waveActive])

  useEffect(() => {
    chatRef.current?.scrollTo({ top: 9999, behavior: 'smooth' })
  }, [mensajes, cargando])

  const addMsg = (texto, rol, extra = null) =>
    setMensajes(prev => [...prev, { texto, rol, extra, id: Date.now() + Math.random() }])

  const enviar = async (texto) => {
    const msg = texto || input.trim()
    if (!msg || cargando) return
    setInput('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
    setMini(true)
    addMsg(msg, 'user')

    if (fase === 'inicio') {
      setCargando(true); setWaveActive(true); setFase('orquestando')
      try {
        const r1 = await fetch('/api/orquestar', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mensaje: msg }),
        })
        const d1 = await r1.json()
        const ag = d1.agente || 'estrategia'
        setAgente(ag)
        const hist = [{ role: 'user', content: msg }]
        setHistorial(hist)
        const r2 = await fetch('/api/chat', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agente: ag, historial: hist }),
        })
        const d2 = await r2.json()
        if (d2.quote) {
          setFase('cotizado')
          addMsg(null, 'ai', { type: 'quote', quote: d2.quote })
        } else {
          addMsg(d2.reply, 'ai')
          setHistorial(p => [...p, { role: 'assistant', content: d2.reply }])
          setFase('chat')
        }
      } catch (e) {
        addMsg('Error de conexión. Recarga e intenta de nuevo.', 'ai')
        setFase('inicio')
      }
      setCargando(false); setWaveActive(false)
    } else {
      const hist = [...historial, { role: 'user', content: msg }]
      setHistorial(hist); setCargando(true); setWaveActive(true)
      try {
        const r = await fetch('/api/chat', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agente, historial: hist }),
        })
        const d = await r.json()
        if (d.quote) {
          setFase('cotizado')
          addMsg(null, 'ai', { type: 'quote', quote: d.quote })
        } else {
          addMsg(d.reply, 'ai')
          setHistorial(p => [...p, { role: 'assistant', content: d.reply }])
        }
      } catch (e) { addMsg('Error de conexión.', 'ai') }
      setCargando(false); setWaveActive(false)
    }
  }

  const aceptarCotizacion = () => setAgendando(true)

  const confirmarReunion = async () => {
    if (!contacto.nombre || !contacto.email) return
    setCargando(true)
    try {
      if (proyectoId) await fetch('/api/agendar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proyecto_id: proyectoId, ...contacto }),
      })
    } catch (_) {}
    addMsg(null, 'ai', { type: 'confirmado', contacto })
    setFase('confirmado'); setAgendando(false); setCargando(false)
  }

  const ajustarAlcance = () => {
    const msg = 'Quiero ajustar el alcance del proyecto.'
    addMsg(msg, 'user')
    const hist = [...historial, { role: 'user', content: msg }]
    setHistorial(hist); setFase('chat'); setCargando(true); setWaveActive(true)
    fetch('/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agente, historial: hist })
    }).then(r => r.json()).then(d => {
      addMsg(d.reply, 'ai')
      setHistorial(p => [...p, { role: 'assistant', content: d.reply }])
      setCargando(false); setWaveActive(false)
    })
  }

  const toggleMic = () => {
    setMicActivo(true)
    setTimeout(() => {
      const s = [
        'I need a brand identity for my new startup',
        'Necesito una campaña de lanzamiento para mi nueva marca',
        'Preciso de uma identidade visual completa',
        'Je veux redesigner mon packaging',
      ]
      setInput(s[Math.floor(Math.random() * s.length)])
      setMicActivo(false)
      inputRef.current?.focus()
    }, 1800)
  }

  const agenteInfo = agente ? AGENT_LABELS[agente] : null

  return (
    <>
      <Head>
        <title>GÜÜD Quote AI — Global Creative HÜB</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Cotiza tu próximo proyecto creativo con IA. GÜÜD Company — Global Creative HÜB." />
      </Head>

      <div style={S.app}>
        <div style={S.amb} />

        {/* HEADER */}
        <header style={S.hdr}>
          <div style={S.logoWrap}>
            <img
              src="/logo.gif"
              alt="GÜÜD"
              style={S.logoImg}
              onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
            />
            <div style={{ display: 'none', flexDirection: 'column', gap: 1 }}>
              <div style={S.logoText}>GÜÜD</div>
              <div style={S.logoSub}>Global Creative HÜB</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {agenteInfo && (
              <div style={{ ...S.badge, borderColor: 'rgba(232,255,0,0.3)', color: 'var(--acc)', background: 'rgba(232,255,0,0.06)' }}>
                {agenteInfo.label}
              </div>
            )}
            <a href="/admin" style={S.badge}>Admin →</a>
          </div>
        </header>

        {/* HERO */}
        <div style={{ ...S.hero, ...(mini ? S.heroMini : {}) }}>
          <div style={{ ...S.orbWrap, ...(mini ? S.orbMini : {}) }}>
            <div style={S.ring1} />
            <div style={S.ring2} />
            <div style={{ ...S.orb, ...(waveActive ? S.orbLive : {}) }}>
              <canvas ref={canvasRef} width={92} height={92} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
            </div>
          </div>
          {!mini && <div style={S.heroTitle}>Tu próxima gran idea empieza aquí</div>}
          {!mini && <div style={S.heroSub}>La IA creativa de GÜÜD te ayuda a cotizar y conectar con el mejor talento.</div>}
          {mini && <div style={S.miniTitle}>GÜÜD Quote AI</div>}
        </div>

        {/* CHAT */}
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
                  {[0, .18, .36].map((d, i) => <span key={i} style={{ ...S.dot, animationDelay: `${d}s` }} />)}
                </div>
              </div>
            </div>
          )}

          {agendando && (
            <div style={S.row}>
              <div style={{ ...S.av, ...S.avAi }}>GÜ</div>
              <div style={S.agendarCard}>
                <div style={S.agendarTitle}>Agendar reunión · Joaquín Labbe</div>
                <input style={S.formInput} placeholder="Tu nombre" value={contacto.nombre} onChange={e => setContacto(p => ({ ...p, nombre: e.target.value }))} />
                <input style={{ ...S.formInput, marginTop: 8 }} placeholder="Tu email" type="email" value={contacto.email} onChange={e => setContacto(p => ({ ...p, email: e.target.value }))} />
                <button style={{ ...S.btnP, width: '100%', marginTop: 12 }} onClick={confirmarReunion} disabled={!contacto.nombre || !contacto.email || cargando}>
                  Confirmar reunión →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* CHIPS */}
        {fase === 'inicio' && (
          <div style={S.chips}>
            {INITIAL_CHIPS.map((c, i) => (
              <button key={i} style={S.chip} onClick={() => enviar(c)}>{c}</button>
            ))}
          </div>
        )}

        {/* INPUT */}
        {fase !== 'confirmado' && (
          <div style={S.inputArea}>
            <div style={S.inputBox}>
              <textarea
                ref={inputRef}
                style={S.textarea}
                placeholder="Write in any language · Escribe en cualquier idioma…"
                rows={1}
                value={input}
                onChange={e => {
                  setInput(e.target.value)
                  e.target.style.height = 'auto'
                  e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px'
                }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() } }}
              />
              <button style={{ ...S.icoBtn, ...S.mic, ...(micActivo ? S.micOn : {}) }} onClick={toggleMic} title="Voice (simulated)">
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
            <div style={S.inputFooter}>GÜÜD Company · Global Creative HÜB · Available in all languages</div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes dot { 0%,80%,100%{transform:scale(1);opacity:.3} 40%{transform:scale(1.4);opacity:1} }
        @keyframes up { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes mpulse { 0%,100%{box-shadow:0 0 0 0 rgba(232,255,0,.2)} 50%{box-shadow:0 0 0 6px transparent} }
        @keyframes orbglow { 0%,100%{box-shadow:0 0 20px rgba(232,255,0,.1)} 50%{box-shadow:0 0 35px rgba(232,255,0,.2)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }

        .chip:hover { border-color: rgba(232,255,0,0.35) !important; color: #E8FF00 !important; background: rgba(232,255,0,0.06) !important; }
        .btn-p:hover { opacity: 0.88; transform: translateY(-1px); }
        .btn-s:hover { border-color: rgba(232,255,0,0.3); color: #E8FF00; }
        textarea::placeholder { color: #484644; }
        textarea:focus { outline: none; }

        @media (max-width: 600px) {
          .guud-app { max-width: 100vw !important; }
          .guud-hdr { padding: 12px 16px !important; }
          .guud-hero-title { font-size: 17px !important; }
          .guud-chat { padding: 12px 14px !important; }
          .guud-chips { padding: 0 14px 8px !important; }
          .guud-input-area { padding: 8px 14px 16px !important; }
          .guud-bub { max-width: 90% !important; font-size: 13px !important; }
          .guud-orb { width: 72px !important; height: 72px !important; }
          .guud-hero { padding: 16px 0 8px !important; }
        }
      `}</style>
    </>
  )
}

function QuoteCard({ quote, onAceptar, onAjustar }) {
  return (
    <div style={{ flex: 1, minWidth: 0, animation: 'up .35s ease' }}>
      <div style={S.qcard}>
        <div style={S.qhdr}>
          <div style={S.qtag}>Estimación · GÜÜD Company</div>
          <div style={S.qname}>{quote.proyecto}</div>
          <div style={{ fontSize: 11.5, color: 'var(--t2)', marginTop: 2 }}>{quote.servicio}</div>
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
          <button className="btn-p" style={S.btnP} onClick={onAceptar}>Aceptar estimación</button>
          <button className="btn-s" style={S.btnS} onClick={onAjustar}>Ajustar alcance</button>
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
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#080808" strokeWidth="3">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <div style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
          ¡Reunión confirmada!
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--t2)', lineHeight: 1.55 }}>
          {contacto.nombre}, Joaquín te contactará a{' '}
          <strong style={{ color: 'var(--t1)' }}>{contacto.email}</strong>{' '}
          en las próximas horas.
        </div>
        <div style={S.jlCard}>
          <div style={S.jlAvatar}>JL</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Joaquín Labbe</div>
            <div style={{ fontSize: 11, color: 'var(--t2)', marginTop: 1 }}>Director Creativo Ejecutivo · GÜÜD Company</div>
          </div>
        </div>
      </div>
    </div>
  )
}

const S = {
  app: { display: 'flex', flexDirection: 'column', height: '100svh', maxWidth: 720, margin: '0 auto', position: 'relative', zIndex: 2 },
  amb: { position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 500px 250px at 50% -60px, rgba(232,255,0,0.04), transparent)' },

  hdr: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 22px', borderBottom: '0.5px solid var(--b1)', flexShrink: 0 },
  logoWrap: { display: 'flex', alignItems: 'center' },
  logoImg: { height: 36, width: 'auto', objectFit: 'contain', filter: 'invert(1)' },
  logoText: { fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 20, letterSpacing: '0.04em', color: 'var(--t1)', lineHeight: 1 },
  logoSub: { fontSize: 9, color: 'var(--t3)', letterSpacing: '0.12em', textTransform: 'uppercase' },
  badge: { fontSize: 10, color: 'var(--t3)', border: '0.5px solid var(--b2)', padding: '3px 10px', borderRadius: 20, letterSpacing: '.06em', textTransform: 'uppercase', background: 'none', cursor: 'pointer' },

  hero: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '22px 0 10px', flexShrink: 0, transition: 'all .4s cubic-bezier(.4,0,.2,1)' },
  heroMini: { padding: '7px 0 4px' },
  heroTitle: { fontFamily: 'Unbounded, sans-serif', fontWeight: 700, fontSize: 19, marginTop: 16, textAlign: 'center', letterSpacing: '-0.01em', lineHeight: 1.25, padding: '0 20px' },
  heroSub: { fontSize: 13, color: 'var(--t2)', textAlign: 'center', marginTop: 7, maxWidth: 300, lineHeight: 1.6, padding: '0 20px' },
  miniTitle: { fontFamily: 'Unbounded, sans-serif', fontWeight: 700, fontSize: 12, marginTop: 7, letterSpacing: '0.02em' },

  orbWrap: { width: 92, height: 92, position: 'relative', transition: 'all .4s cubic-bezier(.4,0,.2,1)' },
  orbMini: { width: 42, height: 42 },
  ring1: { position: 'absolute', inset: -9, borderRadius: '50%', border: '0.5px solid rgba(232,255,0,0.15)', animation: 'spin 10s linear infinite' },
  ring2: { position: 'absolute', inset: -17, borderRadius: '50%', border: '0.5px solid rgba(232,255,0,0.06)', animation: 'spin 16s linear infinite reverse' },
  orb: { position: 'absolute', inset: 0, borderRadius: '50%', background: '#0C0C0C', border: '1px solid rgba(232,255,0,0.2)', overflow: 'hidden', transition: 'all .3s' },
  orbLive: { borderColor: 'rgba(232,255,0,0.6)', animation: 'orbglow 2s ease-in-out infinite' },

  chat: { flex: 1, overflowY: 'auto', padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 11, WebkitOverflowScrolling: 'touch' },
  row: { display: 'flex', gap: 10, animation: 'up .28s ease' },
  rowUser: { flexDirection: 'row-reverse' },
  av: { width: 28, height: 28, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 900, fontFamily: 'Unbounded, sans-serif', marginTop: 2 },
  avAi: { background: '#0C0C0C', border: '1px solid rgba(232,255,0,0.3)', color: 'var(--acc)' },
  avU: { background: 'var(--bg3)', border: '0.5px solid var(--b2)', color: 'var(--t2)' },
  bub: { maxWidth: '84%', padding: '11px 14px', borderRadius: 14, fontSize: 13.5, lineHeight: 1.65, color: 'var(--t1)' },
  bubAi: { background: '#111', border: '0.5px solid var(--b1)', borderTopLeftRadius: 3 },
  bubUser: { background: '#181818', border: '0.5px solid var(--b2)', borderTopRightRadius: 3 },
  dots: { display: 'flex', gap: 4, padding: '13px 14px' },
  dot: { width: 5, height: 5, borderRadius: '50%', background: 'var(--acc)', opacity: .3, display: 'inline-block', animation: 'dot 1.1s ease-in-out infinite' },

  chips: { padding: '0 20px 8px', display: 'flex', flexWrap: 'wrap', gap: 6, flexShrink: 0 },
  chip: { padding: '7px 13px', borderRadius: 20, border: '0.5px solid var(--b2)', background: 'var(--bg2)', fontSize: 12, color: 'var(--t2)', cursor: 'pointer', transition: 'all .15s', fontFamily: 'DM Sans, sans-serif' },

  inputArea: { padding: '8px 20px 18px', flexShrink: 0 },
  inputBox: { display: 'flex', alignItems: 'flex-end', gap: 8, background: 'var(--bg3)', border: '0.5px solid var(--b2)', borderRadius: 22, padding: '10px 10px 10px 16px' },
  textarea: { flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--t1)', fontFamily: 'DM Sans, sans-serif', fontSize: 14, lineHeight: 1.5, resize: 'none', maxHeight: 96, minHeight: 22, padding: '1px 0' },
  inputFooter: { textAlign: 'center', fontSize: 10, color: 'var(--t3)', marginTop: 7, letterSpacing: '0.04em' },
  icoBtn: { width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .2s', border: 'none' },
  mic: { background: 'none', border: '0.5px solid var(--b2)', color: 'var(--t3)' },
  micOn: { background: 'rgba(232,255,0,0.1)', borderColor: 'rgba(232,255,0,0.3)', color: 'var(--acc)', animation: 'mpulse 1s ease-in-out infinite' },
  snd: { background: 'var(--acc)', color: '#080808' },
  sndDis: { background: 'var(--bg3)', color: 'var(--t3)', cursor: 'not-allowed' },

  qcard: { border: '0.5px solid rgba(232,255,0,.2)', borderRadius: 16, overflow: 'hidden', background: '#0E0E0E', width: '100%' },
  qhdr: { padding: '14px 16px 10px', borderBottom: '0.5px solid var(--b1)' },
  qtag: { fontSize: 9, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--acc)', fontFamily: 'Unbounded, sans-serif', marginBottom: 5 },
  qname: { fontFamily: 'Unbounded, sans-serif', fontWeight: 700, fontSize: 14, color: 'var(--t1)', marginBottom: 3, lineHeight: 1.3 },
  qrow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '6px 0', borderBottom: '0.5px solid var(--b1)', fontSize: 12.5 },
  qprice: { padding: '12px 16px', borderTop: '0.5px solid rgba(232,255,0,.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(232,255,0,.03)' },
  qpval: { fontFamily: 'Unbounded, sans-serif', fontWeight: 800, fontSize: 17, color: 'var(--acc)' },
  btnP: { flex: 1, padding: '11px 14px', background: 'var(--acc)', color: '#080808', border: 'none', borderRadius: 10, fontFamily: 'Unbounded, sans-serif', fontWeight: 700, fontSize: 11, cursor: 'pointer', letterSpacing: '0.02em', transition: 'all .2s' },
  btnS: { flex: 1, padding: '11px 14px', background: 'none', color: 'var(--t2)', border: '0.5px solid var(--b2)', borderRadius: 10, fontSize: 12, cursor: 'pointer', transition: 'all .2s' },

  ccard: { border: '1px solid rgba(232,255,0,.3)', borderRadius: 16, padding: '20px 16px', textAlign: 'center', background: 'rgba(232,255,0,.03)', width: '100%' },
  cicon: { width: 44, height: 44, borderRadius: '50%', background: 'var(--acc)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' },
  jlCard: { marginTop: 12, padding: '10px 12px', background: 'var(--bg3)', borderRadius: 10, border: '0.5px solid var(--b2)', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' },
  jlAvatar: { width: 38, height: 38, borderRadius: '50%', background: '#111', border: '1.5px solid var(--acc)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 11, color: 'var(--acc)', flexShrink: 0 },

  agendarCard: { flex: 1, border: '0.5px solid rgba(232,255,0,.2)', borderRadius: 16, padding: '15px 16px', background: '#0E0E0E', minWidth: 0 },
  agendarTitle: { fontSize: 10, color: 'var(--acc)', fontFamily: 'Unbounded, sans-serif', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 12 },
  formInput: { width: '100%', background: 'var(--bg3)', border: '0.5px solid var(--b2)', borderRadius: 10, padding: '10px 13px', fontSize: 13, color: 'var(--t1)', outline: 'none' },
}
