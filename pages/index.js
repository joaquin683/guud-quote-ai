import { useState, useRef, useEffect } from 'react'
import Head from 'next/head'
import { getT } from '../lib/translations'
import { analytics } from '../lib/analytics'

const fmt = n => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)

const AGENT_LABELS = {
  branding:   { label: 'Especialista Branding',  color: '#E8FF00' },
  web:        { label: 'Especialista Web',        color: '#E8FF00' },
  campana:    { label: 'Especialista Campaña',    color: '#E8FF00' },
  contenido:  { label: 'Especialista Contenido',  color: '#E8FF00' },
  estrategia: { label: 'Consultor Estratégico',   color: '#E8FF00' },
  btl:        { label: 'Especialista BTL',           color: '#E8FF00' },
  ads:        { label: 'Especialista Ads',           color: '#E8FF00' },
  guerrilla:  { label: 'Creativo Guerrilla',         color: '#E8FF00' },
  producto:   { label: 'Desarrollo de Producto',     color: '#E8FF00' },
}

const INITIAL_CHIPS = [
  'Crear mi marca',
  'Necesito una web',
  'Lanzar una campaña',
  'Contenido para mis redes',
  'No sé por dónde empezar',
  'Activar mi marca',
  'Pautar en redes',
  'Algo diferente',
  'Desarrollar una app',
]

// AGENT_CHIPS moved to INITIAL_CHIPS


// Detección de intención en tiempo real
const INTENT_MAP = [
  { label: 'Branding',    keys: ['marca', 'brand', 'logo', 'identidad', 'naming', 'nombre', 'rebranding', 'rediseño'] },
  { label: 'Web',         keys: ['web', 'landing', 'ecommerce', 'página', 'sitio', 'tienda', 'pág', 'wordpress', 'shopify'] },
  { label: 'Campaña', keys: ['campaña', 'lanzamiento', 'ads', 'publicidad', 'anuncio', 'key visual', 'kv', 'pauta'] },
  { label: 'Contenido',   keys: ['redes', 'contenido', 'social', 'posts', 'instagram', 'tiktok', 'reels', 'stories'] },
  { label: 'Estrategia',  keys: ['estrategia', 'consultoría', 'posicionamiento', 'plan', 'consultoria', 'asesoría'] },
]

function detectIntent(text) {
  if (!text || text.trim().length < 3) return null
  const lower = text.toLowerCase()
  const found = INTENT_MAP.filter(cat =>
    cat.keys.some(k => lower.includes(k))
  ).map(cat => cat.label)
  return found.length > 0 ? found.join(' / ') : null
}

const WELCOME_MSG = '¡Hola! ¿Listo para cotizar tu próximo proyecto creativo en segundos?'

export default function Home() {
  const [fase, setFase]             = useState('inicio')
  const [agente, setAgente]         = useState(null)
  const [historial, setHistorial]   = useState([])
  const [mensajes, setMensajes]     = useState([])
  const [input, setInput]           = useState('')
  const [cargando, setCargando]     = useState(false)
  const [micActivo, setMicActivo]   = useState(false)
  const [mini, setMini]             = useState(false)
  const [hasStartedChat, setHasStartedChat] = useState(false)

  // Language
  const [lang, setLang] = useState(() => {
    if (typeof window === 'undefined') return 'es'
    const saved = localStorage.getItem('guud_language')
    if (saved && ['es','en','pt'].includes(saved)) return saved
    const browser = navigator.language?.substring(0,2) || 'es'
    return ['es','en','pt'].includes(browser) ? browser : 'es'
  })
  const t = getT(lang)
  const changeLang = (l) => { setLang(l); localStorage.setItem('guud_language', l) }
  // Refocus when not in chat
  useEffect(() => {
    if (!hasStartedChat) {
      const t = setTimeout(() => inputRef.current?.focus(), 150)
      return () => clearTimeout(t)
    }
  }, [hasStartedChat])
  const [waveActive, setWaveActive] = useState(false)
  const [agendando, setAgendando]   = useState(false)
  const [contacto, setContacto]     = useState({ nombre: '', email: '' })
  const [proyectoId, setProyectoId] = useState(null)
  const [welcomeDone, setWelcomeDone] = useState(false)
  const [intentDetected, setIntentDetected] = useState(null)

  const { voiceState, supported: voiceSupported, start: startVoice, stop: stopVoice, interim: voiceInterim } = useVoiceInput({
    autoSend: false,
    onInterim: (text) => { if (text) setInput(text) },
    onResult: (text) => {
      if (text && text.trim()) {
        setInput('')
        enviar(text.trim())
      }
    },
    onError: () => {},
  })

  const chatRef   = useRef(null)
  const inputRef  = useRef(null)
  const agendarRef = useRef(null)
  const canvasRef = useRef(null)
  const rafRef    = useRef(null)
  const wtRef     = useRef(0)

  // ─── resetSession ────────────────────────────────────────────────
  const resetSession = () => {
    setMensajes([])
    setHistorial([])
    if (voiceState === 'listening') stopVoice()
    setInput('')
    setFase('inicio')
    setAgente(null)
    setCargando(false)
    setWaveActive(false)
    setMicActivo(false)
    setAgendando(false)
    setContacto({ nombre: '', email: '' })
    setProyectoId(null)
    setHasStartedChat(false)
    setIntentDetected(null)
    setTimeout(() => inputRef.current?.focus(), 150)
  }

  // Autofocus input on mount
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 100)
    return () => clearTimeout(t)
  }, [])

  // Welcome message removed — clean start

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

  // ─── Refoco el input siempre que termina de cargar o llega un mensaje ──
  useEffect(() => {
    if (!cargando && inputRef.current) {
      // Timeout más largo para dejar que QuoteCard y scroll terminen
      setTimeout(() => {
        if (inputRef.current && document.activeElement !== inputRef.current) {
          inputRef.current.focus()
        }
      }, 150)
    }
  }, [cargando, mensajes])

  // Scroll to agendar card when it appears
  useEffect(() => {
    if (agendando) {
      setTimeout(() => {
        agendarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
    }
  }, [agendando])

  const addMsg = (texto, rol, extra = null) =>
    setMensajes(prev => [...prev, { texto, rol, extra, id: Date.now() + Math.random() }])

  const enviar = async (texto) => {
    const msg = texto || input.trim()
    if (!msg || cargando) return
    setInput('')
    if (voiceState === 'listening') stopVoice()
    if (inputRef.current) { inputRef.current.style.height = 'auto'; inputRef.current.focus() }
    setMini(true)
    setHasStartedChat(true); analytics.chatStarted(agente || 'pending')
    addMsg(msg, 'user')

    if (fase === 'inicio') {
      setCargando(true); setWaveActive(true); setFase('orquestando')
      try {
        const r1 = await fetch('/api/orquestar', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mensaje: msg }),
        })
        const d1 = await r1.json()
        // Si el orquestador detecta contenido inapropiado
        if (d1.agente === 'filtro') {
          addMsg('¿Te gustaría agregar algún otro detalle para llevar en consideración en el presupuesto?', 'ai')
          setFase('inicio')
          setCargando(false); setWaveActive(false)
          return
        }
        const ag = d1.agente || 'estrategia'
        setAgente(ag)
        const hist = [{ role: 'user', content: msg }]
        setHistorial(hist)
        const r2 = await fetch('/api/chat', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agente: ag, historial: hist, lang }),
        })
        const d2 = await r2.json()
        if (d2.quote) {
          analytics.quoteGenerated(agente, d2.quote.min, d2.quote.proyecto)
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
          body: JSON.stringify({ agente, historial: hist, lang }),
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

  const aceptarCotizacion = () => { analytics.quoteAccepted(agente, mensajes.findLast(m => m.extra?.type === 'quote')?.extra?.quote?.min); setAgendando(true) }

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

  const ajustarAlcance = async () => {
    analytics.quoteAdjusted(agente)
    const msg = 'Quiero ajustar el alcance del proyecto.'
    addMsg(msg, 'user')
    const hist = [...historial, { role: 'user', content: msg }]
    setHistorial(hist)
    setFase('chat')
    setCargando(true)
    setWaveActive(true)
    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agente, historial: hist })
      })
      const d = await r.json()
      if (d.quote) {
        setFase('cotizado')
        addMsg(null, 'ai', { type: 'quote', quote: d.quote })
      } else if (d.reply) {
        addMsg(d.reply, 'ai')
        setHistorial(p => [...p, { role: 'assistant', content: d.reply }])
      } else {
        addMsg('¿Qué entregables quieres modificar? Puedo ajustar el alcance y recalcular el precio.', 'ai')
      }
    } catch (e) {
      addMsg('Error de conexión. Intenta de nuevo.', 'ai')
    }
    setCargando(false)
    setWaveActive(false)
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
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1" />
        <meta name="description" content="¡Hola! ¿Listo para cotizar tu próximo proyecto creativo? GÜÜD Company — Global Creative HÜB." />
      </Head>

      <div style={S.app}>
        <div style={S.amb} />
        <header style={S.hdr}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }} onClick={e => { e.preventDefault(); resetSession(); }}>
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
          </a>
          {/* Lang selector — centered in header */}
          <div style={S.langSelector}>
            {['es','en','pt'].map(l => (
              <button key={l} onClick={() => changeLang(l)} style={{
                fontSize: 10, padding: '3px 10px', borderRadius: 20, border: 'none',
                background: lang === l ? '#E8FF00' : 'none',
                color: lang === l ? '#080808' : 'var(--t3)',
                cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                fontWeight: lang === l ? 700 : 400, letterSpacing: '.06em',
                transition: 'all .2s',
              }}>
                {l === 'es' ? 'ES' : l === 'en' ? 'EN' : 'PT'}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {agenteInfo && (
              <div style={{ ...S.badge, borderColor: 'rgba(0,0,0,0.2)', color: '#080808', background: 'rgba(0,0,0,0.1)' }}>
                {agenteInfo.label}
              </div>
            )}

          </div>
        </header>
        <div style={S.inner}>
        {!hasStartedChat && (
          <div style={S.heroCenter}>
            <div style={S.orbWrap}>
              <div style={S.ring1} />
              <div style={S.ring2} />
              <div style={S.ripple1} />
              <div style={S.ripple2} />
              <div style={S.ripple3} />
              <div style={S.ripple4} />
              <div style={S.orb}>
                <video key="orb-video" src="/orb.mp4" autoPlay loop muted playsInline
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              </div>
            </div>
            <div style={S.heroTitle}>{t.heroTitle}</div>
            {/* Input centered below title */}
            <div style={S.heroInputWrap}>
              <div style={S.inputBox} className="input-pulse">
                {!input && !voiceInterim && (
                  <div style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', pointerEvents: 'none', zIndex: 1, lineHeight: '1' }}>
                    <span className="fake-caret" style={{ marginRight: 4, marginLeft: 0, verticalAlign: 'middle' }} />
                    <span style={{ fontSize: 14, color: 'var(--t3)', lineHeight: '21px', display: 'block' }}>¿Qué te gustaría cotizar?</span>
                  </div>
                )}
                <textarea
                  ref={inputRef}
                  style={S.textarea}
                  placeholder=""
                  rows={1}
                  value={input}
                  onChange={e => {
                    setInput(e.target.value)
                    e.target.style.height = 'auto'
                    e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px'
                    setIntentDetected(detectIntent(e.target.value))
                  }}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !('ontouchstart' in window)) { e.preventDefault(); enviar() } }}
                />
                <VoiceButton voiceState={voiceState} onStart={startVoice} onStop={stopVoice} supported={voiceSupported} />
                <button
                  id="send-btn"
                  style={{ ...S.icoBtn, ...S.snd, ...(!input.trim() || cargando ? S.sndDis : {}) }}
                  onClick={() => enviar()}
                  disabled={!input.trim() || cargando}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, minHeight: 16 }}>
                <div style={{ fontSize: 11, color: '#E8FF00', letterSpacing: '0.04em', transition: 'all 0.3s ease', opacity: intentDetected ? 1 : 0.6 }}>
                  {intentDetected ? t.detectingPrefix + intentDetected : input.length > 2 ? t.detecting : ''}
                </div>

              </div>
            </div>
            {/* Chips centered */}
            <div style={S.chipsHero}>
              {t.chips.map((chip, i) => (
                <SuggestionChip key={i} label={chip} index={i} onClick={() => enviar(chip)} />
              ))}
            </div>
          </div>
        )}
                {hasStartedChat && <div ref={chatRef} style={S.chat}>
          {mensajes.map(m => (
            <div key={m.id} style={{ ...S.row, ...(m.rol === 'user' ? S.rowUser : {}) }}>
              {m.rol === 'ai' ? (
                <MiniOrb />
              ) : (
                <div style={{ ...S.av, ...S.avU }}>TÚ</div>
              )}
              {m.extra?.type === 'quote' ? (
                <QuoteCard quote={m.extra.quote} onAceptar={aceptarCotizacion} onAjustar={ajustarAlcance} t={t}
                onDownloadPDF={() => { analytics.quotePdfDownloaded(agente); downloadQuotePDF(m.extra.quote, proyectoId) }}
                onShare={proyectoId ? () => {
                const url = window.location.origin + '/cotizacion/' + proyectoId;
                if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => alert('Link copiado al portapapeles'));
                else alert(url);
              } : null} />
              ) : m.extra?.type === 'confirmado' ? (
                <ConfirmCard contacto={m.extra.contacto} meetLink={m.extra.meetLink} slotDate={m.extra.slotDate} slotTime={m.extra.slotTime} />
              ) : (
                <div style={{ ...S.bub, ...(m.rol === 'user' ? S.bubUser : S.bubAi) }}>
                  {m.texto}
                </div>
              )}
            </div>
          ))}

          {cargando && (
            <div style={S.row}>
              <MiniOrb />
              <div style={{ ...S.bub, ...S.bubAi, padding: 0 }}>
                <div style={S.dots}>
                  {[0, .18, .36].map((d, i) => <span key={i} style={{ ...S.dot, animationDelay: `${d}s` }} />)}
                </div>
              </div>
            </div>
          )}

          {agendando && (
            <div style={S.row}>
              <MiniOrb />
              <div ref={agendarRef} style={{ flex: 1, minWidth: 0, animation: 'up .3s ease' }}>
                <MeetingScheduler
                  quote={mensajes.findLast(m => m.extra?.type === 'quote')?.extra?.quote}
                  proyectoId={proyectoId}
                  t={t}
                  onReset={() => { setAgendando(false); resetSession(); }}
                  onConfirmed={({ nombre, email, meetLink }) => {
                    addMsg(null, 'ai', { type: 'confirmado', contacto: { nombre, email }, meetLink, slotDate, slotTime })
                    analytics.meetingScheduled(agente, mensajes.findLast(m => m.extra?.type === 'quote')?.extra?.quote?.min)
                    setFase('confirmado')
                    setAgendando(false)
                  }}
                />
              </div>
            </div>
          )}
        </div>

        }





        {fase !== 'confirmado' && hasStartedChat && (
          <div style={S.inputArea}>
            <div style={{ ...S.inputBox, position: 'relative' }} className="input-pulse">
              {!input && !voiceInterim && (
                <div style={{
                  position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
                  display: 'flex', alignItems: 'center', pointerEvents: 'none', zIndex: 1,
                }}>
                  <span className="fake-caret" style={{ marginRight: 4, marginLeft: 0 }} />
                  <span style={{ fontSize: 14, color: 'var(--t3)', lineHeight: 1.5 }}>¿Qué te gustaría cotizar?</span>
                </div>
              )}
              <textarea
                ref={inputRef}
                style={S.textarea}
                placeholder=""
                rows={1}
                value={input}
                onChange={e => {
                  setInput(e.target.value)
                  e.target.style.height = 'auto'
                  e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px'
                  setIntentDetected(detectIntent(e.target.value))
                }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !('ontouchstart' in window)) { e.preventDefault(); enviar() } }}
              />
              <VoiceButton voiceState={voiceState} onStart={startVoice} onStop={stopVoice} supported={voiceSupported} />
              <button
                style={{ ...S.icoBtn, ...S.snd, ...(!input.trim() || cargando ? S.sndDis : {}) }}
                id="send-btn"
                onClick={() => enviar()}
                disabled={!input.trim() || cargando}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, minHeight: 16 }}>
              <div style={{
                fontSize: 11,
                color: '#E8FF00',
                letterSpacing: '0.04em',
                transition: 'all 0.3s ease',
                opacity: intentDetected ? 1 : 0.6,
              }}>
                {intentDetected ? `Detectando: ${intentDetected}` : input.length > 2 ? 'Detectando tipo de proyecto…' : ''}
              </div>
  
            </div>
          </div>
        )}
        </div>
        {/* Footer */}
        <footer style={{
          textAlign: 'center',
          padding: '12px 20px',
          fontSize: 11,
          color: '#E8FF00',
          letterSpacing: '0.05em',
          flexShrink: 0,
        }}>
          {t.footer}
        </footer>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes dot { 0%,80%,100%{transform:scale(1);opacity:.3} 40%{transform:scale(1.4);opacity:1} }
        @keyframes up { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes mpulse { 0%,100%{box-shadow:0 0 0 0 rgba(232,255,0,.2)} 50%{box-shadow:0 0 0 6px transparent} }
        @keyframes caretPulse { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes successPop { 0%{transform:scale(0.5);opacity:0} 60%{transform:scale(1.08)} 80%{transform:scale(0.97)} 100%{transform:scale(1);opacity:1} }
        @keyframes successGlow { 0%{box-shadow:0 0 0 0 rgba(232,255,0,0)} 40%{box-shadow:0 0 0 12px rgba(232,255,0,0.25), 0 0 24px rgba(232,255,0,0.15)} 100%{box-shadow:0 0 0 0 rgba(232,255,0,0)} }
        @keyframes checkDraw { 0%{stroke-dashoffset:30} 100%{stroke-dashoffset:0} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes chipSweep { from{background-position:100% 0} to{background-position:-100% 0} }
        @keyframes chipIdleGlow {
          0%,100% { box-shadow: 0 0 0 0.5px rgba(232,255,0,0.15); }
          50%      { box-shadow: 0 0 0 0.5px rgba(232,255,0,0.4), 0 0 8px rgba(232,255,0,0.12); }
        }
        @keyframes rippleWave {
          0%   { transform: scale(0.85); opacity: 0.5; }
          70%  { transform: scale(1.5);  opacity: 0.12; }
          100% { transform: scale(1.7);  opacity: 0; }
        }
        @keyframes chipGlowPulse { 0%,100%{box-shadow:0 0 0 0.5px #E8FF00, 0 0 8px rgba(232,255,0,0.25)} 50%{box-shadow:0 0 0 0.5px #E8FF00, 0 0 14px rgba(232,255,0,0.4), 0 0 24px rgba(232,255,0,0.15)} }
        textarea { caret-color: transparent !important; }
        textarea::placeholder { color: transparent !important; }
        .fake-caret { display:inline-block; width:2px; height:14px; background:#E8FF00; border-radius:1px; animation:caretPulse 1s step-end infinite; vertical-align:middle; flex-shrink:0; }
        @keyframes orbglow { 0%,100%{box-shadow:0 0 20px rgba(232,255,0,.1)} 50%{box-shadow:0 0 35px rgba(232,255,0,.2)} }
        
        textarea::placeholder { color: #484644; }
        /* ─── Mobile / iOS ─── */
        @media (max-width: 768px) {
          .guud-app { max-width: 100vw !important; }
          .guud-hdr { padding: 10px 14px !important; }
          .hero-title-initial { font-size: 20px !important; line-height:1.25 !important; padding:0 16px !important; }
        }
        @media (max-width: 600px) {
          textarea, input, select { font-size: 16px !important; }
        }
        .bottom-input-area {
          padding-bottom: max(16px, env(safe-area-inset-bottom, 16px));
        }

        @keyframes guud-pulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(232,255,0,0), 0 0 12px rgba(232,255,0,0.15), inset 0 0 12px rgba(232,255,0,0.05);
            border-color: rgba(232,255,0,0.25);
          }
          50% {
            box-shadow: 0 0 0 4px rgba(232,255,0,0.08), 0 0 24px rgba(232,255,0,0.3), inset 0 0 20px rgba(232,255,0,0.08);
            border-color: rgba(232,255,0,0.7);
          }
        }
        .input-pulse {
          animation: guud-pulse 2.5s ease-in-out infinite;
          border: 1px solid rgba(232,255,0,0.25) !important;
          border-radius: 22px;
        }
      `}</style>
    </>
  )
}



// ─── useVoiceInput hook ───────────────────────────────────────────────
function useVoiceInput({ onResult, onError, onInterim, autoSend = false }) {
  const [voiceState, setVoiceState] = useState('idle')
  const [supported, setSupported] = useState(false)
  useEffect(() => { setSupported('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) }, [])
  const recogRef = useRef(null), finalRef = useRef(''), activeRef = useRef(false)
  const start = () => {
    if (!supported || activeRef.current) return
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const recog = new SR()
    recog.lang = 'es-ES'; recog.continuous = true; recog.interimResults = true; recog.maxAlternatives = 1
    finalRef.current = ''; activeRef.current = true; recogRef.current = recog
    recog.onstart = () => setVoiceState('listening')
    recog.onresult = (e) => {
      let interim = '', nf = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) nf += t; else interim += t
      }
      if (nf) finalRef.current += nf + ' '
      const full = (finalRef.current + interim).trim()
      if (typeof onInterim === 'function' && full) onInterim(full)
    }
    recog.onerror = (e) => { if (e.error !== 'no-speech') { if (onError) onError(e.error); setVoiceState('idle') } }
    recog.onend = () => {
      activeRef.current = false; setVoiceState('idle')
      const text = finalRef.current.trim(); finalRef.current = ''
      if (text && onResult) onResult(text, autoSend)
    }
    recog.start()
  }
  const stop = () => { if (recogRef.current) { recogRef.current.stop(); recogRef.current = null } activeRef.current = false }
  return { voiceState, supported, start, stop }
}
function VoiceBars() {
  const [h, setH] = useState([4,10,16,8])
  useEffect(() => {
    const id = setInterval(() => setH([
      4+Math.random()*14, 4+Math.random()*14,
      4+Math.random()*14, 4+Math.random()*14,
    ]), 130)
    return () => clearInterval(id)
  }, [])
  return (
    <span style={{ display:'flex', alignItems:'center', gap:3, height:20 }}>
      {h.map((v,i) => (
        <span key={i} style={{
          display:'block', width:3, borderRadius:2,
          background:'#E8FF00', height:v+'px',
          transition:'height .1s ease',
        }} />
      ))}
    </span>
  )
}

function VoiceButton({ voiceState, onStart, onStop, supported }) {
  const on = voiceState === 'listening'
  if (!supported) return null
  return (
    <button onClick={on ? onStop : onStart} title={on ? 'Detener' : 'Hablar'} style={{
      flexShrink:0, width:36, height:36, borderRadius:'50%',
      border: on ? '2px solid rgba(232,255,0,.75)' : '1.5px solid rgba(255,255,255,.12)',
      background: on ? 'rgba(232,255,0,.08)' : 'transparent',
      display:'flex', alignItems:'center', justifyContent:'center',
      cursor:'pointer', outline:'none',
      boxShadow: on ? '0 0 14px rgba(232,255,0,.2)' : 'none',
      transition:'all .2s',
    }}>
      {on ? <VoiceBars /> : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
          stroke="rgba(255,255,255,.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
          <line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
      )}
    </button>
  )
}

const VBS = {
  btn: { width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .2s', border: '0.5px solid var(--b2)', background: 'none', color: 'var(--t3)', cursor: 'pointer' },
  listening: { background: '#E8FF00', borderColor: '#E8FF00', color: '#080808', boxShadow: '0 0 0 4px rgba(232,255,0,0.15)' },
  error: { borderColor: 'rgba(255,107,107,0.5)', color: '#ff6b6b' },
  disabled: { cursor: 'not-allowed' },
}


// ─── MiniOrb — orb animado para avatar de chat ───────────────────────
function MiniOrb() {
  return (
    <div style={{
      width: 36, height: 36, borderRadius: '50%',
      position: 'relative', flexShrink: 0,
      overflow: 'visible',
    }}>
      {/* Ripple waves — 2 sutiles */}
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1px solid rgba(232,255,0,0.3)', animation: 'rippleWave 3s ease-out infinite', animationDelay: '0s', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1px solid rgba(232,255,0,0.18)', animation: 'rippleWave 3s ease-out infinite', animationDelay: '1s', pointerEvents: 'none' }} />
      {/* Orb core */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        overflow: 'hidden',
        border: '1px solid rgba(232,255,0,0.25)',
        background: '#080808',
      }}>
        <video
          src="/orb.mp4"
          autoPlay loop muted playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
        />
      </div>
    </div>
  )
}

function OrbCanvas({ state = 'idle' }) {
  const canvasRef = useRef(null)
  const rafRef = useRef(null)
  const tRef = useRef(0)
  const noiseRef = useRef([])
  const stateRef = useRef(state)

  useEffect(() => { stateRef.current = state }, [state])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width
    const H = canvas.height
    const cx = W / 2
    const cy = H / 2

    // Perlin-like noise using multiple sine waves with irrational frequencies
    const noise = (x, t, seed = 0) => {
      const f1 = 0.013, f2 = 0.021, f3 = 0.037, f4 = 0.053
      const t1 = 0.0071, t2 = 0.0113, t3 = 0.0197, t4 = 0.0317
      return (
        Math.sin(x * f1 + t * t1 + seed) * 0.38 +
        Math.sin(x * f2 + t * t2 + seed * 1.7) * 0.27 +
        Math.sin(x * f3 + t * t3 + seed * 2.3) * 0.19 +
        Math.sin(x * f4 + t * t4 + seed * 3.1) * 0.16
      )
    }

    const draw = () => {
      const s = stateRef.current
      tRef.current += s === 'processing' ? 1.4 : s === 'listening' ? 0.9 : 0.45

      const t = tRef.current
      ctx.clearRect(0, 0, W, H)

      // Background glow
      const bgGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.48)
      const glowAlpha = s === 'processing' ? 0.18 : s === 'listening' ? 0.12 : 0.07
      bgGlow.addColorStop(0, `rgba(200,255,30,${glowAlpha})`)
      bgGlow.addColorStop(0.6, `rgba(120,220,0,${glowAlpha * 0.4})`)
      bgGlow.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = bgGlow
      ctx.fillRect(0, 0, W, H)

      // Draw multiple fluid wave layers
      const layers = s === 'processing' ? 5 : s === 'listening' ? 4 : 3

      for (let layer = 0; layer < layers; layer++) {
        const seed = layer * 4.71
        const layerT = t + layer * 23.7
        const amp = s === 'processing'
          ? 18 + layer * 4 + Math.sin(t * 0.023 + seed) * 6
          : s === 'listening'
          ? 12 + layer * 3 + Math.sin(t * 0.017 + seed) * 4
          : 7 + layer * 2 + Math.sin(t * 0.011 + seed) * 2.5

        const yOffset = (layer - layers / 2) * (s === 'processing' ? 8 : s === 'listening' ? 5 : 3)
        const alpha = (1 - layer / layers) * (s === 'processing' ? 0.85 : s === 'listening' ? 0.7 : 0.55)

        ctx.beginPath()
        const pts = 120
        for (let i = 0; i <= pts; i++) {
          const x = (i / pts) * W
          const nx = noise(i * 2.5, layerT, seed)
          const nx2 = noise(i * 1.3, layerT * 0.7, seed + 10)
          const y = cy + yOffset + nx * amp + nx2 * amp * 0.4

          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }

        // Color shift by layer and state
        const hue = s === 'processing' ? 75 + layer * 8 : s === 'listening' ? 80 + layer * 6 : 85 + layer * 4
        const sat = s === 'processing' ? 100 : s === 'listening' ? 95 : 88
        const lum = s === 'processing' ? 60 + layer * 5 : 65 + layer * 3
        const lw = s === 'processing' ? 2.5 - layer * 0.3 : s === 'listening' ? 2 - layer * 0.25 : 1.5 - layer * 0.2

        ctx.strokeStyle = `hsla(${hue},${sat}%,${lum}%,${alpha})`
        ctx.lineWidth = Math.max(0.4, lw)
        ctx.shadowColor = `hsla(${hue},100%,70%,0.6)`
        ctx.shadowBlur = s === 'processing' ? 12 : s === 'listening' ? 8 : 4
        ctx.stroke()
      }

      // Core pulse — subtle breathing
      const pulse = 0.5 + Math.sin(t * 0.019) * 0.1 + Math.sin(t * 0.031) * 0.06
      const coreR = (s === 'processing' ? 8 : s === 'listening' ? 5 : 3) * pulse
      const coreGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 3)
      coreGlow.addColorStop(0, `rgba(220,255,80,${s === 'processing' ? 0.9 : 0.5})`)
      coreGlow.addColorStop(1, 'rgba(180,255,0,0)')
      ctx.fillStyle = coreGlow
      ctx.beginPath()
      ctx.arc(cx, cy, coreR * 3, 0, Math.PI * 2)
      ctx.fill()

      ctx.shadowBlur = 0
      rafRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={200}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    />
  )
}


// ─── getCredentialsUrl helper ─────────────────────────────────────────

// ─── SuggestionChip component ─────────────────────────────────────────
function SuggestionChip({ label, onClick, index = 0 }) {
  const [hovered, setHovered] = useState(false)
  const idleDelay = `${(index % 4) * 1.2}s`

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        padding: '7px 14px',
        borderRadius: 20,
        border: 'none',
        background: 'none',
        fontSize: 12,
        color: hovered ? '#E8FF00' : 'var(--t2)',
        cursor: 'pointer',
        fontFamily: 'DM Sans, sans-serif',
        transition: 'color .2s ease',
        outline: 'none',
        zIndex: 0,
        // Fake border via box-shadow — glow animado
        boxShadow: hovered
          ? '0 0 0 0.5px #E8FF00, 0 0 10px rgba(232,255,0,0.3), 0 0 20px rgba(232,255,0,0.12)'
          : '0 0 0 0.5px rgba(232,255,0,0.18)',
        animation: hovered ? 'none' : `chipIdleGlow 5s ease-in-out ${idleDelay} infinite`,
      }}
    >
      {/* Gradient sweep effect on hover */}
      {hovered && (
        <span style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 20,
          background: 'linear-gradient(90deg, transparent 0%, rgba(232,255,0,0.06) 50%, transparent 100%)',
          backgroundSize: '200% 100%',
          animation: 'chipSweep .6s ease forwards',
          pointerEvents: 'none',
          zIndex: -1,
        }} />
      )}
      {label}
    </button>
  )
}

function getCredentialsUrl(agente, industria = null) {
  const map = {
    branding:   'branding',
    web:        'web',
    campana:    'campana',
    contenido:  'contenido',
    estrategia: 'estrategia',
  }
  const servicio = map[agente] || null
  if (!servicio) return '/credenciales'
  const base = `/credenciales?servicio=${servicio}`
  return industria ? `${base}&industria=${encodeURIComponent(industria)}` : base
}

// ─── RelatedCredentialsBlock component ───────────────────────────────
function RelatedCredentialsBlock({ agente, projectType }) {
  const url = getCredentialsUrl(agente)
  const labels = {
    branding:   'branding e identidad visual',
    web:        'web y digital',
    campana:    'campaña creativa',
    contenido:  'contenido para redes',
    estrategia: 'estrategia creativa',
  }
  const label = labels[agente] || 'proyectos creativos'

  return (
    <div style={{
      borderTop: '0.5px solid var(--b1)',
      padding: '12px 16px 14px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
      flexWrap: 'wrap',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--t3)', fontFamily: 'Unbounded, sans-serif', marginBottom: 3 }}>
          Proyectos similares
        </div>
        <div style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.45 }}>
          Hemos trabajado desaïos similares de {label}. Revísa referencias antes de avanzar.
        </div>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          fontSize: 11.5,
          color: '#080808',
          border: '0.5px solid #E8FF00',
          borderRadius: 8,
          padding: '7px 13px',
          whiteSpace: 'nowrap',
          textDecoration: 'none',
          transition: 'all .18s',
          fontFamily: 'DM Sans, sans-serif',
          flexShrink: 0,
          background: '#E8FF00',
          fontWeight: 600,
        }}
        onMouseEnter={e => { e.target.style.background = '#d4f040'; e.target.style.borderColor = '#d4f040'; }}
        onMouseLeave={e => { e.target.style.background = '#E8FF00'; e.target.style.borderColor = '#E8FF00'; }}
      >
        Ver proyectos similares
      </a>
    </div>
  )
}

function QuoteCard({ quote, onAceptar, onAjustar, t, onShare, onDownloadPDF }) {
  return (
    <div style={{ flex: 1, minWidth: 0, animation: 'up .35s ease' }}>
      <div style={S.qcard}>
        <div style={S.qhdr}>
          <div style={S.qtag}>{t ? t.estimation : 'Estimación · GÜÜD Company'}</div>
          <div style={S.qname}>{quote.proyecto}</div>
          <div style={{ fontSize: 11.5, color: 'var(--t2)', marginTop: 2 }}>{quote.servicio}</div>
        </div>
        <div style={{ padding: '12px 16px' }}>
          {[
            [t ? t.deliverables : 'Entregables', quote.entregables],
            [t ? t.timeline : 'Tiempo estimado', quote.tiempo],
          ].filter(([, v]) => v).map(([k, v]) => (
            <div key={k} style={S.qrow}>
              <span style={{ color: 'var(--t2)', flexShrink: 0, marginRight: 12 }}>{k}</span>
              <span style={{ color: 'var(--t1)', fontWeight: 500, textAlign: 'right', fontSize: 12, lineHeight: 1.4 }}>{v}</span>
            </div>
          ))}
          {quote.recomendacion && (
            <div style={{ borderTop: '0.5px solid var(--b1)', marginTop: 4, paddingTop: 12, paddingBottom: 4 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--acc)', fontFamily: 'Unbounded, sans-serif', marginBottom: 8 }}>
                Asesoría GÜÜD
              </div>
              <div style={{ fontSize: 13, color: 'var(--t1)', lineHeight: 1.7, fontStyle: 'normal' }}>
                {quote.recomendacion}
              </div>
            </div>
          )}
        </div>
        <RelatedCredentialsBlock agente={quote.agente} projectType={quote.servicio} />
        <div style={S.qprice}>
          {quote.min === 0 && quote.max === 0 ? (
            <>
              <span style={{ fontSize: 11, color: 'var(--t2)' }}>Presupuesto</span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(232,255,0,0.08)', border: '1px solid rgba(232,255,0,0.3)',
                borderRadius: 8, padding: '4px 10px', marginTop: 4,
                fontSize: 12, fontWeight: 700, color: 'var(--acc)',
                letterSpacing: '0.02em'
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                </svg>
                Depende de la idea
              </span>
            </>
          ) : (
            <>
              <span style={{ fontSize: 11, color: 'var(--t2)' }}>{t ? t.priceLabel : 'Precio referencial'}</span>
              <span style={S.qpval}>{fmt(quote.min)}</span>
            </>
          )}
        </div>
        <div style={{ padding: '12px 16px', display: 'flex', gap: 9 }}>
          <button style={{...S.btnP, letterSpacing: '0.01em'}} onClick={onAceptar}>{'Agendar reunión con GÜÜD'}</button>
          <button style={S.btnS} onClick={onAjustar}>{t ? t.adjustBtn : 'Ajustar alcance'}</button>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button onClick={onShare || (() => {})} title="Copiar link" style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 10, border: '0.5px solid var(--b2)',
              background: 'none', color: 'var(--t2)', cursor: 'pointer', fontSize: 12,
              transition: 'all .15s', flex: 1, justifyContent: 'center',
              opacity: onShare ? 1 : 0.5,
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              Compartir
            </button>
            <button onClick={onDownloadPDF || (() => {})} title="Descargar PDF" style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 10, border: '0.5px solid var(--b2)',
              background: 'none', color: 'var(--t2)', cursor: 'pointer', fontSize: 12,
              transition: 'all .15s', flex: 1, justifyContent: 'center',
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Descargar PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}



// ─── playSuccessSound ─────────────────────────────────────────────────
function playSuccessSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45)
    gain.connect(ctx.destination)

    // Two-tone chime: base note + harmony
    [[880, 0, 0.3], [1108, 0.08, 0.35], [1320, 0.16, 0.3]].forEach(([freq, delay, dur]) => {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, ctx.currentTime + delay)
      osc.frequency.exponentialRampToValueAtTime(freq * 0.98, ctx.currentTime + delay + dur)
      osc.connect(gain)
      osc.start(ctx.currentTime + delay)
      osc.stop(ctx.currentTime + delay + dur)
    })
  } catch(e) { /* silently ignore if audio blocked */ }
}


// ─── downloadQuotePDF ─────────────────────────────────────────────────
function downloadQuotePDF(quote) {
  const fmt = n => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)
  const date = new Date().toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' })

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Cotización GÜÜD · ${quote.proyecto || 'Proyecto'}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;900&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:210mm;min-height:297mm;background:#080808;color:#EDEBE5;font-family:'Inter',system-ui,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}

  .page{width:210mm;min-height:297mm;background:#080808;display:flex;flex-direction:column}

  /* Header */
  .header{background:#0D0D0D;border-bottom:1px solid #1A1A1A;padding:28px 40px;display:flex;justify-content:space-between;align-items:center}
  .logo{font-size:22px;font-weight:900;letter-spacing:-.03em;color:#EDEBE5}
  .logo span{color:#E8FF00}
  .logo-sub{font-size:11px;font-weight:400;color:#4E4D4A;letter-spacing:.06em;text-transform:uppercase;margin-top:2px}
  .header-right{text-align:right}
  .doc-label{font-size:9px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:#4E4D4A;margin-bottom:4px}
  .doc-date{font-size:12px;color:#8F8D89}

  /* Hero */
  .hero{padding:40px 40px 32px;border-bottom:1px solid #1A1A1A}
  .tag{display:inline-flex;align-items:center;gap:6px;font-size:9px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#E8FF00;margin-bottom:14px}
  .tag::before{content:'';width:6px;height:6px;background:#E8FF00;border-radius:50%;display:inline-block}
  .project-title{font-size:26px;font-weight:700;line-height:1.2;color:#EDEBE5;margin-bottom:8px;letter-spacing:-.02em}
  .service-tag{display:inline-block;background:#141414;border:1px solid #242424;border-radius:20px;padding:5px 14px;font-size:11px;color:#8F8D89;font-weight:500}

  /* Body */
  .body{padding:32px 40px;flex:1}

  /* Info rows */
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:28px}
  .info-block{background:#0D0D0D;border:1px solid #1A1A1A;border-radius:12px;padding:16px 18px}
  .info-label{font-size:9px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#4E4D4A;margin-bottom:6px}
  .info-value{font-size:13px;color:#EDEBE5;font-weight:500;line-height:1.5}

  /* Advisory */
  .advisory{background:#0D0D0D;border:1px solid #1A1A1A;border-left:3px solid #E8FF00;border-radius:12px;padding:20px 22px;margin-bottom:28px}
  .advisory-label{font-size:9px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#E8FF00;margin-bottom:10px}
  .advisory-text{font-size:13px;color:#C0BEB8;line-height:1.75;font-weight:400}

  /* Price */
  .price-section{background:#111;border:1px solid #222;border-radius:16px;padding:24px 28px;display:flex;justify-content:space-between;align-items:center;margin-bottom:28px}
  .price-left{}
  .price-label{font-size:9px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:#4E4D4A;margin-bottom:6px}
  .price-note{font-size:11px;color:#4E4D4A;margin-top:4px}
  .price-value{font-size:36px;font-weight:900;color:#E8FF00;letter-spacing:-.02em;line-height:1}

  /* CTA */
  .cta{background:#E8FF00;border-radius:12px;padding:16px 28px;text-align:center;margin-bottom:28px}
  .cta-text{font-size:13px;font-weight:700;color:#080808;letter-spacing:.02em}
  .cta-url{font-size:11px;color:#3D4200;margin-top:3px;font-weight:500}

  /* Footer */
  .footer{border-top:1px solid #1A1A1A;padding:20px 40px;display:flex;justify-content:space-between;align-items:center;background:#0D0D0D}
  .footer-left{font-size:10px;color:#4E4D4A;line-height:1.6}
  .footer-right{font-size:10px;color:#4E4D4A;text-align:right}
  .footer-brand{font-size:12px;font-weight:700;color:#EDEBE5;margin-bottom:2px}

  @media print {
    html,body{width:210mm;min-height:297mm}
    .page{page-break-after:avoid}
  }
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div>
      <div class="logo">G<span>Ü</span>ÜD</div>
      <div class="logo-sub">Global Creative HÜB</div>
    </div>
    <div class="header-right">
      <div class="doc-label">Estimación de proyecto</div>
      <div class="doc-date">${date}</div>
    </div>
  </div>

  <!-- Hero -->
  <div class="hero">
    <div class="tag">Cotización GÜÜD</div>
    <div class="project-title">${quote.proyecto || 'Proyecto creativo'}</div>
    ${quote.servicio ? `<div class="service-tag">${quote.servicio}</div>` : ''}
  </div>

  <!-- Body -->
  <div class="body">

    <!-- Info Grid -->
    <div class="info-grid">
      ${quote.entregables ? `
      <div class="info-block" style="grid-column:1/-1">
        <div class="info-label">Entregables incluidos</div>
        <div class="info-value">${quote.entregables}</div>
      </div>` : ''}
      ${quote.tiempo ? `
      <div class="info-block">
        <div class="info-label">Tiempo estimado</div>
        <div class="info-value">${quote.tiempo}</div>
      </div>` : ''}
      ${quote.agente ? `
      <div class="info-block">
        <div class="info-label">Equipo asignado</div>
        <div class="info-value" style="text-transform:capitalize">${quote.agente}</div>
      </div>` : ''}
    </div>

    <!-- Advisory -->
    ${quote.recomendacion ? `
    <div class="advisory">
      <div class="advisory-label">Asesoría GÜÜD</div>
      <div class="advisory-text">${quote.recomendacion}</div>
    </div>` : ''}

    <!-- Price -->
    <div class="price-section">
      <div class="price-left">
        <div class="price-label">Precio referencial</div>
        <div class="price-note">Valor estimado · sujeto a scope final</div>
      </div>
      <div class="price-value">${fmt(quote.min)}</div>
    </div>

    <!-- CTA -->
    <div class="cta">
      <div class="cta-text">¿Listo para avanzar? Agenda tu reunión con GÜÜD</div>
      <div class="cta-url">guud-quote-ai.vercel.app</div>
    </div>

  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="footer-left">
      <div>Este documento es una estimación referencial y no constituye una propuesta formal.</div>
      <div>Los precios pueden variar según el alcance definitivo del proyecto.</div>
    </div>
    <div class="footer-right">
      <div class="footer-brand">GÜÜD Company</div>
      <div>hola@guudcompany.cl</div>
    </div>
  </div>

</div>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=900,height=1100');
  if (!w) { alert('Permite los popups para descargar el PDF'); return; }
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 800);
}

// ─── MeetingScheduler component ──────────────────────────────────────
function MeetingScheduler({ quote, proyectoId, onConfirmed, onReset, t: tProp }) {
  const soundPlayed = useRef(false)
  const tl = tProp || { scheduleTitle: 'Agenda una reunión con GÜÜD', scheduleSub: 'Elige un horario.', nameField: 'Tu nombre *', emailField: 'Tu email *', companyField: 'Empresa', phoneField: 'Teléfono', selectDay: 'Selecciona un día', selectTime: 'Horarios', confirmBtn: 'Confirmar reunión', confirming: 'Agendando…', successTitle: 'Reunión confirmada', successMsg: 'Tendrás una reunión', successEmail: 'Te enviamos la invitación a', successDetails: 'con todos los detalles.', successBye: 'Nos vemos.', meetBtn: 'Unirse a Google Meet', newQuote: 'Iniciar nueva cotización', errorMsg: 'No pudimos agendar.', retryBtn: 'Volver a intentar', loadingSlots: 'Cargando…', noSlots: 'Sin disponibilidad.' }
  const [step, setStep] = useState('idle') // idle | confirming | success | error
  const [form, setForm] = useState({ nombre: '', email: '', empresa: '', telefono: '' })
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const isValidEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())
  const isValidName  = v => v.trim().length >= 2
  const isValidPhone = v => !v || /^[+\d][\d\s\-().]{5,}$/.test(v.trim())
  const validate = f => {
    const e = {}
    if (!isValidName(f.nombre))    e.nombre   = 'Ingresa tu nombre (mín. 2 caracteres)'
    if (!isValidEmail(f.email))    e.email    = 'Ingresa un email válido (ej: juan@empresa.com)'
    if (!isValidPhone(f.telefono)) e.telefono = 'Teléfono inválido'
    return e
  }
  const canConfirm = isValidName(form.nombre) && isValidEmail(form.email) && isValidPhone(form.telefono)
  const [selectedDate, setSelectedDate] = useState('')
  const [slots, setSlots] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [meetLink, setMeetLink] = useState('')

  // All possible time slots 10:00-18:00 every 30min
  const ALL_TIMES = [
    '10:00','10:30','11:00','11:30','12:00','12:30',
    '13:00','13:30','14:00','14:30','15:00','15:30',
    '16:00','16:30','17:00','17:30'
  ]

  // Generate next 5 weekdays
  const weekdays = []
  const d0 = new Date()
  d0.setDate(d0.getDate() + 1)
  while (weekdays.length < 5) {
    if (d0.getDay() !== 0 && d0.getDay() !== 6) weekdays.push(d0.toISOString().split('T')[0])
    d0.setDate(d0.getDate() + 1)
  }

  const fetchSlots = async (date) => {
    setSelectedDate(date)
    setSelectedSlot(null)
    setLoadingSlots(true)
    try {
      const r = await fetch('/api/calendar/availability?date=' + date)
      const data = await r.json()
      // Build full slot list marking available vs booked
      const availTimes = new Set((data.slots || []).map(s => s.time))
      const full = ALL_TIMES.map(t => ({
        time: t,
        iso: date + 'T' + t + ':00-03:00',
        available: availTimes.size === 0 ? true : availTimes.has(t), // if no data, show all as available
      }))
      setSlots(full)
    } catch {
      // Fallback: show all as available
      setSlots(ALL_TIMES.map(t => ({ time: t, iso: date + 'T' + t + ':00-03:00', available: true })))
    }
    setLoadingSlots(false)
  }

  // Auto-select first weekday on mount
  useEffect(() => {
    if (weekdays.length > 0) fetchSlots(weekdays[0])
  }, [])

  const confirmar = async () => {
    const errs = validate(form)
    setTouched({ nombre: true, email: true, telefono: true })
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    setStep('confirming')
    
    const slotDate = selectedDate ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' }) : ''
    const slotTime = selectedSlot?.time || ''

    // Fire and forget — always show success regardless of API response
    try {
      fetch('/api/calendar/create-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          slot_iso: selectedSlot?.iso || '',
          proyecto_id: proyectoId,
          proyecto: quote?.proyecto,
          servicio: quote?.servicio,
          entregables: quote?.entregables,
          precio: quote?.min ? new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(quote.min) : '',
          tiempo: quote?.tiempo,
          asesoria: quote?.recomendacion,
        })
      }).then(r => r.json()).then(data => {
        if (data?.meetLink) setMeetLink(data.meetLink)
      }).catch(() => {})
    } catch (_) {}

    // Always show success immediately
    setStep('success')
    onConfirmed?.({ nombre: form.nombre, email: form.email, meetLink: '', slotDate, slotTime })
  }

  const fmtDate = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })

  if (step === 'success') {
    if (!soundPlayed.current) {
      soundPlayed.current = true
      setTimeout(playSuccessSound, 200)
    }
    return (
    <div style={MS.card}>
      <div style={{
        width: 52, height: 52, borderRadius: '50%',
        background: '#E8FF00',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '4px auto',
        animation: 'successPop .6s cubic-bezier(.34,1.56,.64,1) forwards, successGlow 1s ease-out .3s forwards',
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#080808" strokeWidth="3"
          strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"
            style={{ strokeDasharray: 30, strokeDashoffset: 30, animation: 'checkDraw .35s ease .45s forwards' }} />
        </svg>
      </div>
      <div style={MS.successTitle}>{tl.successTitle}</div>
      <div style={MS.successSub}>
        Tendrás una reunión con un Director Creativo Ejecutivo de GÜÜD Company
        {selectedSlot && selectedDate ? <span> el <strong style={{color:'var(--t1)'}}>{new Date(selectedDate+'T12:00:00').toLocaleDateString('es-CL',{weekday:'long',day:'numeric',month:'long'})}</strong> a las <strong style={{color:'var(--t1)'}}>{selectedSlot.time}</strong></span> : ''}.
        <br/><br/>
        Te enviamos la invitación al calendario a <strong style={{color:'var(--t1)'}}>{form.email}</strong> con todos los detalles.
        <br/><br/>
        <span style={{color:'var(--t3)'}}>Nos vemos.</span>
      </div>
      {meetLink && <a href={meetLink} target="_blank" rel="noopener noreferrer" style={MS.meetLink}>{tl.meetBtn}</a>}
      <button onClick={() => onReset?.()} style={{ ...MS.btnSecondary, marginTop: 4 }}>{tl.newQuote}</button>
    </div>
  )}

  if (step === 'error') return (
    <div style={MS.card}>
      <div style={MS.errorText}>{tl.errorMsg}</div>
      <button style={MS.btnSecondary} onClick={() => setStep('idle')}>{tl.retryBtn}</button>
    </div>
  )

  return (
    <div style={MS.card}>
      <div style={MS.header}>
        <div style={MS.tag}>{tl.scheduleTitle}</div>
        <div style={MS.sub}>{tl.scheduleSub}</div>
      </div>

      <div style={MS.fields}>
        <div style={{display:'flex',flexDirection:'column',gap:2}}>
          <input style={{...MS.input,borderColor:touched.nombre&&errors.nombre?'#ff4d4f':undefined}} placeholder={tl.nameField} value={form.nombre}
            onChange={e=>{setForm(p=>({...p,nombre:e.target.value}));if(touched.nombre)setErrors(v=>({...v,nombre:isValidName(e.target.value)?undefined:'Ingresa tu nombre'}))}}
            onBlur={()=>{setTouched(p=>({...p,nombre:true}));setErrors(v=>({...v,nombre:isValidName(form.nombre)?undefined:'Ingresa tu nombre (mín. 2 caracteres)'}))}}
          />
          {touched.nombre&&errors.nombre&&<span style={{fontSize:11,color:'#ff4d4f',paddingLeft:4,marginTop:2}}>{errors.nombre}</span>}
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:2}}>
          <input style={{...MS.input,borderColor:touched.email&&errors.email?'#ff4d4f':undefined}} placeholder={tl.emailField} type="email" value={form.email}
            onChange={e=>{setForm(p=>({...p,email:e.target.value}));if(touched.email)setErrors(v=>({...v,email:isValidEmail(e.target.value)?undefined:'Email inválido'}))}}
            onBlur={()=>{setTouched(p=>({...p,email:true}));setErrors(v=>({...v,email:isValidEmail(form.email)?undefined:'Ingresa un email válido (ej: juan@empresa.com)'}))}}
          />
          {touched.email&&errors.email&&<span style={{fontSize:11,color:'#ff4d4f',paddingLeft:4,marginTop:2}}>{errors.email}</span>}
        </div>
        <input style={MS.input} placeholder={tl.companyField} value={form.empresa} onChange={e=>setForm(p=>({...p,empresa:e.target.value}))} />
        <div style={{display:'flex',flexDirection:'column',gap:2}}>
          <input style={{...MS.input,borderColor:touched.telefono&&errors.telefono?'#ff4d4f':undefined}} placeholder={tl.phoneField} value={form.telefono}
            onChange={e=>{setForm(p=>({...p,telefono:e.target.value}));if(touched.telefono)setErrors(v=>({...v,telefono:isValidPhone(e.target.value)?undefined:'Teléfono inválido'}))}}
            onBlur={()=>{setTouched(p=>({...p,telefono:true}));setErrors(v=>({...v,telefono:isValidPhone(form.telefono)?undefined:'Teléfono inválido'}))}}
          />
          {touched.telefono&&errors.telefono&&<span style={{fontSize:11,color:'#ff4d4f',paddingLeft:4,marginTop:2}}>{errors.telefono}</span>}
        </div>
      </div>

      {/* Selector de día */}
      <div style={MS.sectionLabel}>{tl.selectDay}</div>
      <div style={MS.dateRow}>
        {weekdays.map(day => (
          <button key={day} onClick={() => fetchSlots(day)}
            style={{ ...MS.dateBtn, ...(selectedDate === day ? MS.dateBtnActive : {}) }}>
            <div style={MS.dateDow}>{new Date(day+'T12:00:00').toLocaleDateString('es-CL',{weekday:'short'})}</div>
            <div style={MS.dateNum}>{new Date(day+'T12:00:00').getDate()}</div>
          </button>
        ))}
      </div>

      {/* Horarios — siempre visibles, ocupados tachados */}
      <div style={MS.sectionLabel}>
        {loadingSlots ? tl.loadingSlots : selectedDate ? 'Horarios · ' + fmtDate(selectedDate) : ''}
      </div>
      <div style={MS.slotGrid}>
        {loadingSlots && <div style={MS.loadingText}>{tl.loadingSlots}</div>}
        {!loadingSlots && slots.map(slot => (
          <button
            key={slot.iso}
            disabled={!slot.available}
            onClick={() => slot.available && setSelectedSlot(slot)}
            style={{
              ...MS.slotBtn,
              ...(selectedSlot?.iso === slot.iso ? MS.slotBtnActive : {}),
              ...(slot.available ? {} : MS.slotBtnBooked),
            }}
          >
            {slot.time}
          </button>
        ))}
      </div>

      {selectedSlot && (
        <button
          style={{ ...MS.btnPrimary, opacity: (!canConfirm || step === 'confirming') ? 0.5 : 1, cursor: !canConfirm ? 'not-allowed' : 'pointer' }}
          onClick={confirmar}
          disabled={!canConfirm || step === 'confirming'}
        >
          {step === 'confirming' ? tl.confirming : tl.confirmBtn + ' · ' + selectedSlot.time}
        </button>
      )}
    </div>
  )
}

const MS = {
  card: { border: '0.5px solid rgba(232,255,0,0.2)', borderRadius: 16, padding: '18px 16px', background: '#0E0E0E', width: '100%', display: 'flex', flexDirection: 'column', gap: 12 },
  header: { borderBottom: '0.5px solid var(--b1)', paddingBottom: 12 },
  tag: { fontSize: 9, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--acc)', fontFamily: 'Unbounded, sans-serif', marginBottom: 5 },
  sub: { fontSize: 13, color: 'var(--t2)', lineHeight: 1.5 },
  fields: { display: 'flex', flexDirection: 'column', gap: 8 },
  input: { background: 'var(--bg3)', border: '0.5px solid var(--b2)', borderRadius: 10, padding: '10px 13px', fontSize: 13, color: 'var(--t1)', outline: 'none', width: '100%' },
  sectionLabel: { fontSize: 11, color: 'var(--t3)', letterSpacing: '.06em', textTransform: 'uppercase', marginTop: 4 },
  dateRow: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  dateBtn: { padding: '8px 12px', borderRadius: 10, border: '0.5px solid var(--b2)', background: 'none', color: 'var(--t2)', cursor: 'pointer', textAlign: 'center', minWidth: 52, transition: 'all .15s' },
  dateBtnActive: { borderColor: '#E8FF00', background: 'rgba(232,255,0,0.08)', color: '#E8FF00' },
  dateDow: { fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em' },
  dateNum: { fontSize: 18, fontWeight: 600, marginTop: 2 },
  slotGrid: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  slotBtn: { padding: '7px 12px', borderRadius: 8, border: '0.5px solid var(--b2)', background: 'none', color: 'var(--t2)', cursor: 'pointer', fontSize: 13, transition: 'all .15s' },
  slotBtnActive: { borderColor: '#E8FF00', background: 'rgba(232,255,0,0.1)', color: '#E8FF00', fontWeight: 600 },
  slotBtnBooked: { textDecoration: 'line-through', opacity: 0.35, cursor: 'not-allowed', borderColor: 'rgba(255,255,255,0.05)' },
  loadingText: { fontSize: 12, color: 'var(--t3)' },
  btnPrimary: { padding: '12px 16px', background: '#E8FF00', color: '#080808', border: 'none', borderRadius: 10, fontFamily: 'Unbounded, sans-serif', fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all .2s', width: '100%', marginTop: 4 },
  btnSecondary: { padding: '10px 14px', background: 'none', color: 'var(--t2)', border: '0.5px solid var(--b2)', borderRadius: 10, fontSize: 12, cursor: 'pointer', width: '100%' },
  successIcon: { width: 44, height: 44, borderRadius: '50%', background: '#E8FF00', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '4px auto' },
  successTitle: { fontFamily: 'Unbounded, sans-serif', fontWeight: 700, fontSize: 15, textAlign: 'center' },
  successSub: { fontSize: 13, color: 'var(--t2)', textAlign: 'center', lineHeight: 1.55 },
  meetLink: { display: 'block', textAlign: 'center', fontSize: 13, color: '#E8FF00', padding: '10px 16px', border: '0.5px solid rgba(232,255,0,0.3)', borderRadius: 10, textDecoration: 'none', marginTop: 4 },
  errorText: { fontSize: 13, color: '#ff6b6b', lineHeight: 1.5 },
}


function ConfirmCard({ contacto, meetLink, slotTime, slotDate }) {
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
        <div style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.7, textAlign: 'center', marginBottom: 4 }}>
          Un Director Creativo Ejecutivo de GÜÜD Company tendrá una reunión contigo
          {slotDate && slotTime ? <span> el <strong style={{color:'var(--t1)'}}>{slotDate}</strong> a las <strong style={{color:'var(--t1)'}}>{slotTime}</strong></span> : ''}.
          <br/><br/>
          Te enviamos la invitación a <strong style={{color:'var(--t1)'}}>{contacto.email}</strong> con todos los detalles.
          <br/>
          <span style={{color:'var(--t3)'}}>¡Nos vemos!</span>
        </div>
        <div style={S.jlCard}>
          <div style={S.jlAvatar}>GÜ</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Director Creativo Ejecutivo</div>
            <div style={{ fontSize: 11, color: 'var(--t2)', marginTop: 1 }}>GÜÜD Company</div>
          </div>
        </div>
      </div>
    </div>
  )
}

const S = {
  app: { display: 'flex', flexDirection: 'column', height: '100dvh', position: 'relative', zIndex: 2, transition: 'all .4s ease' },
  amb: { position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 500px 250px at 50% -60px, rgba(232,255,0,0.04), transparent)' }, inner: { display: 'flex', flexDirection: 'column', flex: 1, maxWidth: 720, margin: '0 auto', width: '100%', overflow: 'hidden' },
  hdr: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 28px', borderBottom: 'none', flexShrink: 0, background: '#080808', width: '100%', position: 'relative' }, langSelector: { position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 4 },
  logoWrap: { display: 'flex', alignItems: 'center' },
  logoImg: { height: 52, width: 'auto', objectFit: 'contain', filter: 'invert(1)' },
  logoText: { fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 20, letterSpacing: '0.04em', color: '#080808', lineHeight: 1 },
  logoSub: { fontSize: 9, color: '#333', letterSpacing: '0.12em', textTransform: 'uppercase' },
  badge: { fontSize: 10, color: 'var(--t3)', border: '0.5px solid var(--b2)', padding: '3px 10px', borderRadius: 20, letterSpacing: '.06em', textTransform: 'uppercase', background: 'none', cursor: 'pointer' },
  hero: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '22px 0 10px', flexShrink: 0, transition: 'all .4s cubic-bezier(.4,0,.2,1)' },
  heroMini: { padding: '7px 0 4px' },
  heroCenter: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '0 20px 40px', animation: 'fadeUp .4s ease', gap: 0 },
  heroTitle: { fontFamily: 'Unbounded, sans-serif', fontWeight: 700, fontSize: 28, /* v2 */ marginTop: 20, textAlign: 'center', letterSpacing: '-0.02em', lineHeight: 1.25, padding: '0 24px', maxWidth: 700, color: '#F2F0E8' },
  heroSub: { fontSize: 14, color: 'var(--t2)', textAlign: 'center', marginTop: 10, maxWidth: 480, lineHeight: 1.6, padding: '0 32px' },
  heroInputWrap: { width: '100%', maxWidth: 760, marginTop: 28, padding: '0 20px', position: 'relative' },
  agentChipsRow: { display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', maxWidth: 720, margin: '10px auto 0', padding: '0 20px' },
  agentChip: { display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(232,255,0,0.05)', border: '1px solid rgba(232,255,0,0.2)', borderRadius: 20, padding: '5px 13px', cursor: 'pointer', transition: 'all .2s', color: 'var(--t1)', fontSize: 12, fontFamily: 'inherit' },
  agentChipEmoji: { fontSize: 10, color: 'var(--acc)', lineHeight: 1 },
  agentChipLabel: { fontWeight: 600, color: 'rgba(255,255,255,0.6)', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase' },
  chipsHero: { display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 760, margin: '14px auto 0', padding: '0 20px' },
  heroSub: { fontSize: 13.5, color: 'var(--t2)', textAlign: 'center', marginTop: 10, maxWidth: 480, lineHeight: 1.7, padding: '0 32px' },
  miniTitle: { fontFamily: 'Unbounded, sans-serif', fontWeight: 700, fontSize: 12, marginTop: 7, letterSpacing: '0.02em' },
  orbWrap: { width: 92, height: 92, position: 'relative', transition: 'all .4s cubic-bezier(.4,0,.2,1)' },
  orbMini: { width: 42, height: 42 },
  ring1: { position: 'absolute', inset: -9, borderRadius: '50%', border: '0.5px solid rgba(232,255,0,0.15)', animation: 'spin 10s linear infinite' },
  ring2: { position: 'absolute', inset: -17, borderRadius: '50%', border: '0.5px solid rgba(232,255,0,0.06)', animation: 'spin 16s linear infinite reverse' },
  ripple1: { position: 'absolute', inset: 0, borderRadius: '50%', border: '1px solid rgba(232,255,0,0.35)', animation: 'rippleWave 3s ease-out infinite', animationDelay: '0s', pointerEvents: 'none' },
  ripple2: { position: 'absolute', inset: 0, borderRadius: '50%', border: '1px solid rgba(232,255,0,0.28)', animation: 'rippleWave 3s ease-out infinite', animationDelay: '0.75s', pointerEvents: 'none' },
  ripple3: { position: 'absolute', inset: 0, borderRadius: '50%', border: '1px solid rgba(232,255,0,0.2)', animation: 'rippleWave 3s ease-out infinite', animationDelay: '1.5s', pointerEvents: 'none' },
  ripple4: { position: 'absolute', inset: 0, borderRadius: '50%', border: '0.5px solid rgba(232,255,0,0.14)', animation: 'rippleWave 3s ease-out infinite', animationDelay: '2.25s', pointerEvents: 'none' },
  orb: { position: 'absolute', inset: 0, borderRadius: '50%', background: '#0C0C0C', border: '1px solid rgba(232,255,0,0.2)', overflow: 'hidden', transition: 'all .3s' },
  orbLive: { borderColor: 'rgba(232,255,0,0.5)' },
  chat: { flex: 1, overflowY: 'auto', padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 11, WebkitOverflowScrolling: 'touch' },
  row: { display: 'flex', gap: 10, animation: 'up .28s ease' },
  rowUser: { flexDirection: 'row-reverse' },
  av: { width: 28, height: 28, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 900, fontFamily: 'Unbounded, sans-serif', marginTop: 2 },
  avAi: { background: '#E8FF00', border: 'none', overflow: 'hidden', padding: 0 },
  avU: { background: 'var(--bg3)', border: '0.5px solid var(--b2)', color: 'var(--t2)' },
  bub: { maxWidth: '84%', padding: '11px 14px', borderRadius: 14, fontSize: 13.5, lineHeight: 1.65, color: 'var(--t1)' },
  bubAi: { background: '#111', border: '0.5px solid var(--b1)', borderTopLeftRadius: 3 },
  bubUser: { background: '#181818', border: '0.5px solid var(--b2)', borderTopRightRadius: 3 },
  dots: { display: 'flex', gap: 4, padding: '13px 14px' },
  dot: { width: 5, height: 5, borderRadius: '50%', background: 'var(--acc)', opacity: .3, display: 'inline-block', animation: 'dot 1.1s ease-in-out infinite' },
  chips: { padding: '8px 20px 0', display: 'flex', flexWrap: 'wrap', gap: 8, flexShrink: 0, justifyContent: 'center', maxWidth: 780, margin: '0 auto', width: '100%' },
  chip: { padding: '7px 13px', borderRadius: 20, border: '0.5px solid var(--b2)', background: 'var(--bg2)', fontSize: 12, color: 'var(--t2)', cursor: 'pointer', transition: 'all .15s', fontFamily: 'DM Sans, sans-serif' },
  inputArea: { padding: '8px 20px 18px', flexShrink: 0 },
  inputBox: { display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg3)', border: '0.5px solid var(--b2)', borderRadius: 22, padding: '0 12px', minHeight: 54, position: 'relative' },
  textarea: { flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--t1)', fontFamily: 'DM Sans, sans-serif', fontSize: 14, lineHeight: '21px', resize: 'none', maxHeight: 80, height: 21, padding: '0', margin: '0', display: 'block' },
  inputFooter: { fontSize: 10, color: '#E8FF00', letterSpacing: '0.04em' },
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