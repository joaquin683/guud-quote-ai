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
  'Cotizar una marca desde cero',
  'Estimar rediseño de identidad visual',
  'Cotizar una web que convierta',
  'Presupuestar contenido mensual',
  'Cotizar campaña de lanzamiento',
  'No sé qué necesito aún',
]


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
  const [waveActive, setWaveActive] = useState(false)
  const [agendando, setAgendando]   = useState(false)
  const [contacto, setContacto]     = useState({ nombre: '', email: '' })
  const [proyectoId, setProyectoId] = useState(null)
  const [welcomeDone, setWelcomeDone] = useState(false)
  const [intentDetected, setIntentDetected] = useState(null)

  const { voiceState, supported: voiceSupported, start: startVoice, stop: stopVoice, interim: voiceInterim } = useVoiceInput({
    autoSend: false,
    onResult: (text, auto) => {
      if (auto) {
        enviar(text)
      } else {
        setInput(text)
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.style.height = 'auto'
            inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 96) + 'px'
          }
          document.getElementById('send-btn')?.removeAttribute('disabled')
        }, 50)
      }
    },
    onError: () => {},
  })

  const chatRef   = useRef(null)
  const inputRef  = useRef(null)
  const canvasRef = useRef(null)
  const rafRef    = useRef(null)
  const wtRef     = useRef(0)

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

  const addMsg = (texto, rol, extra = null) =>
    setMensajes(prev => [...prev, { texto, rol, extra, id: Date.now() + Math.random() }])

  const enviar = async (texto) => {
    const msg = texto || input.trim()
    if (!msg || cargando) return
    setInput('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
    setMini(true)
    setHasStartedChat(true)
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
        <meta name="description" content="¡Hola! ¿Listo para cotizar tu próximo proyecto creativo? GÜÜD Company — Global Creative HÜB." />
      </Head>

      <div style={S.app}>
        <div style={S.amb} />
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {agenteInfo && (
              <div style={{ ...S.badge, borderColor: 'rgba(0,0,0,0.2)', color: '#080808', background: 'rgba(0,0,0,0.1)' }}>
                {agenteInfo.label}
              </div>
            )}
            <a href="/admin" style={S.badge}>Admin →</a>
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
            <div style={S.heroTitle}>Cotiza tu próximo proyecto creativo</div>
            <div style={S.heroSub}>Describe lo que necesitas y recibe una estimación inicial en segundos.</div>
          </div>
        )}
                {hasStartedChat && <div ref={chatRef} style={S.chat}>
          {mensajes.map(m => (
            <div key={m.id} style={{ ...S.row, ...(m.rol === 'user' ? S.rowUser : {}) }}>
              <div style={{ ...S.av, ...(m.rol === 'ai' ? S.avAi : S.avU) }}>
                {m.rol === 'ai' ? <img src="/avatar.svg" alt="GÜÜD" style={{width:'100%',height:'100%',objectFit:'cover'}} /> : 'TÚ'}
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
              <div style={{ ...S.av, ...S.avAi }}><img src="/avatar.svg" alt="GÜÜD" style={{width:'100%',height:'100%',objectFit:'cover'}} /></div>
              <div style={{ ...S.bub, ...S.bubAi, padding: 0 }}>
                <div style={S.dots}>
                  {[0, .18, .36].map((d, i) => <span key={i} style={{ ...S.dot, animationDelay: `${d}s` }} />)}
                </div>
              </div>
            </div>
          )}

          {agendando && (
            <div style={S.row}>
              <div style={{ ...S.av, ...S.avAi }}><img src="/avatar.svg" alt="GÜÜD" style={{width:'100%',height:'100%',objectFit:'cover'}} /></div>
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

        }

        {fase === 'inicio' && !hasStartedChat && (
          <div style={S.chips}>
            {INITIAL_CHIPS.map((c, i) => (
              <SuggestionChip key={i} label={c} onClick={() => enviar(c)} />
            ))}
          </div>
        )}

        {fase !== 'confirmado' && (
          <div style={{ ...S.inputArea, ...(hasStartedChat ? {} : { maxWidth: 680, width: '100%', margin: '0 auto', paddingBottom: 32 }) }}>
            <div style={{ ...S.inputBox, position: 'relative' }}>
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
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() } }}
              />
              <VoiceButton voiceState={voiceState} onStart={startVoice} onStop={stopVoice} />
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
              <div style={S.inputFooter}>GÜÜD Company · Global Creative HÜB</div>
            </div>
          </div>
        )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes dot { 0%,80%,100%{transform:scale(1);opacity:.3} 40%{transform:scale(1.4);opacity:1} }
        @keyframes up { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes mpulse { 0%,100%{box-shadow:0 0 0 0 rgba(232,255,0,.2)} 50%{box-shadow:0 0 0 6px transparent} }
        @keyframes caretPulse { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes chipSweep { from{background-position:100% 0} to{background-position:-100% 0} }
        @keyframes rippleWave {
          0%   { transform: scale(0.85); opacity: 0.5; }
          70%  { transform: scale(1.5);  opacity: 0.12; }
          100% { transform: scale(1.7);  opacity: 0; }
        }
        @keyframes chipGlowPulse { 0%,100%{box-shadow:0 0 0 0.5px #E8FF00, 0 0 8px rgba(232,255,0,0.25)} 50%{box-shadow:0 0 0 0.5px #E8FF00, 0 0 14px rgba(232,255,0,0.4), 0 0 24px rgba(232,255,0,0.15)} }
        textarea { caret-color: transparent !important; }
        textarea::placeholder { color: transparent !important; }
        .fake-caret { display:inline-block; width:2px; height:16px; background:#E8FF00; border-radius:1px; animation:caretPulse 1s step-end infinite; vertical-align:middle; margin-left:2px; }
        @keyframes orbglow { 0%,100%{box-shadow:0 0 20px rgba(232,255,0,.1)} 50%{box-shadow:0 0 35px rgba(232,255,0,.2)} }
        
        textarea::placeholder { color: #484644; }
        @media (max-width: 600px) {
          .guud-app { max-width: 100vw !important; }
          .guud-hdr { padding: 12px 16px !important; }
        }
      `}</style>
    </>
  )
}



// ─── useVoiceInput hook ───────────────────────────────────────────────
function useVoiceInput({ onResult, onError, autoSend = false }) {
  const [voiceState, setVoiceState] = useStateRef('idle')
  const [interim, setInterim] = useState('')
  const recogRef = useRef(null)
  const finalRef = useRef('')

  const supported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  const start = () => {
    if (!supported) { setVoiceState('unsupported'); return }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const recog = new SR()
    // Detectar idioma del navegador, fallback a es-CL
    recog.lang = navigator.language || 'es-CL'
    recog.continuous = true       // no corta solo — espera al botón stop
    recog.interimResults = true   // muestra texto mientras el usuario habla
    recogRef.current = recog
    finalRef.current = ''
    setInterim('')

    setVoiceState('requesting-permission')
    recog.onstart = () => setVoiceState('listening')

    recog.onresult = (e) => {
      let interimText = ''
      let finalText = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          finalText += e.results[i][0].transcript + ' '
        } else {
          interimText += e.results[i][0].transcript
        }
      }
      if (finalText) finalRef.current += finalText
      setInterim(interimText)
    }

    recog.onerror = (e) => {
      if (e.error === 'not-allowed') setVoiceState('error-permission')
      else if (e.error !== 'aborted') setVoiceState('error')
      setTimeout(() => setVoiceState('idle'), 2500)
    }

    recog.onend = () => {
      // Solo termina si el usuario presionó stop (no automáticamente)
    }

    recog.start()
  }

  const stop = () => {
    recogRef.current?.stop()
    recogRef.current = null
    setInterim('')
    const text = finalRef.current.trim()
    if (text) {
      onResult(text, autoSend)
    }
    setVoiceState('idle')
    finalRef.current = ''
  }

  return { voiceState, supported, start, stop, interim }
}

function useStateRef(init) {
  const [val, setVal] = useState(init)
  const ref = useRef(val)
  const set = (v) => {
    const next = typeof v === 'function' ? v(ref.current) : v
    ref.current = next
    setVal(next)
  }
  return [val, set]
}

// ─── VoiceButton component ────────────────────────────────────────────
function VoiceButton({ voiceState, onStart, onStop }) {
  const isListening = voiceState === 'listening'
  const isLoading = voiceState === 'requesting-permission' || voiceState === 'transcribing'
  const isError = voiceState === 'error' || voiceState === 'error-permission'
  const isUnsupported = voiceState === 'unsupported'

  const label = isListening ? 'Escuchando…'
    : isLoading ? '…'
    : isError ? 'Intenta de nuevo'
    : ''

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
      {label && (
        <span style={{
          position: 'absolute', right: 44, whiteSpace: 'nowrap',
          fontSize: 11, color: isError ? '#ff6b6b' : '#E8FF00',
          letterSpacing: '0.04em', pointerEvents: 'none',
          animation: 'fadeIn .2s ease',
        }}>{label}</span>
      )}
      {isListening && (
        <div style={{ position: 'absolute', right: 44, display: 'flex', gap: 2, alignItems: 'flex-end', height: 16, paddingRight: label ? 80 : 0 }}>
          {[0,1,2,3,4].map(i => (
            <div key={i} style={{
              width: 2, background: '#E8FF00', borderRadius: 2,
              animation: `voiceWave .8s ease-in-out ${i * 0.1}s infinite alternate`,
              height: [8,14,10,16,8][i],
            }} />
          ))}
        </div>
      )}
      <button
        style={{
          ...VBS.btn,
          ...(isListening ? VBS.listening : {}),
          ...(isError ? VBS.error : {}),
          ...(isUnsupported ? VBS.disabled : {}),
          opacity: isUnsupported ? 0.4 : 1,
        }}
        onClick={isListening ? onStop : onStart}
        disabled={isUnsupported || isLoading}
        title={isUnsupported ? 'Tu navegador no permite dictado por voz' : isListening ? 'Cancelar' : 'Hablar'}
      >
        {isListening ? (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="#080808" stroke="none">
            <rect x="4" y="4" width="16" height="16" rx="2"/>
          </svg>
        ) : (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>
          </svg>
        )}
      </button>
    </div>
  )
}

const VBS = {
  btn: { width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .2s', border: '0.5px solid var(--b2)', background: 'none', color: 'var(--t3)', cursor: 'pointer' },
  listening: { background: '#E8FF00', borderColor: '#E8FF00', color: '#080808', boxShadow: '0 0 0 4px rgba(232,255,0,0.15)' },
  error: { borderColor: 'rgba(255,107,107,0.5)', color: '#ff6b6b' },
  disabled: { cursor: 'not-allowed' },
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
function SuggestionChip({ label, onClick }) {
  const [hovered, setHovered] = useState(false)

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
          ? '0 0 0 0.5px #E8FF00, 0 0 8px rgba(232,255,0,0.25), 0 0 16px rgba(232,255,0,0.1)'
          : '0 0 0 0.5px rgba(255,255,255,0.11)',
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
            <div style={{ fontSize: 11, color: 'var(--t2)', marginTop: 1 }}>GÜÜD Company</div>
          </div>
        </div>
      </div>
    </div>
  )
}

const S = {
  app: { display: 'flex', flexDirection: 'column', height: '100svh', position: 'relative', zIndex: 2, transition: 'all .4s ease' },
  amb: { position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 500px 250px at 50% -60px, rgba(232,255,0,0.04), transparent)' }, inner: { display: 'flex', flexDirection: 'column', flex: 1, maxWidth: 720, margin: '0 auto', width: '100%', overflow: 'hidden' },
  hdr: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 28px', borderBottom: 'none', flexShrink: 0, background: '#080808', width: '100%', position: 'relative' },
  logoWrap: { display: 'flex', alignItems: 'center' },
  logoImg: { height: 52, width: 'auto', objectFit: 'contain', filter: 'invert(1)' },
  logoText: { fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 20, letterSpacing: '0.04em', color: '#080808', lineHeight: 1 },
  logoSub: { fontSize: 9, color: '#333', letterSpacing: '0.12em', textTransform: 'uppercase' },
  badge: { fontSize: 10, color: 'var(--t3)', border: '0.5px solid var(--b2)', padding: '3px 10px', borderRadius: 20, letterSpacing: '.06em', textTransform: 'uppercase', background: 'none', cursor: 'pointer' },
  hero: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '22px 0 10px', flexShrink: 0, transition: 'all .4s cubic-bezier(.4,0,.2,1)' },
  heroMini: { padding: '7px 0 4px' },
  heroCenter: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '0 20px', animation: 'fadeUp .4s ease' },
  heroTitle: { fontFamily: 'Unbounded, sans-serif', fontWeight: 700, fontSize: 20, marginTop: 18, textAlign: 'center', letterSpacing: '-0.01em', lineHeight: 1.3, padding: '0 32px', maxWidth: 560 },
  heroSub: { fontSize: 14, color: 'var(--t2)', textAlign: 'center', marginTop: 10, maxWidth: 480, lineHeight: 1.6, padding: '0 32px' },
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
  chips: { padding: '0 20px 16px', display: 'flex', flexWrap: 'wrap', gap: 6, flexShrink: 0, justifyContent: 'center', maxWidth: 680, margin: '0 auto', width: '100%' },
  chip: { padding: '7px 13px', borderRadius: 20, border: '0.5px solid var(--b2)', background: 'var(--bg2)', fontSize: 12, color: 'var(--t2)', cursor: 'pointer', transition: 'all .15s', fontFamily: 'DM Sans, sans-serif' },
  inputArea: { padding: '8px 20px 18px', flexShrink: 0 },
  inputBox: { display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg3)', border: '0.5px solid var(--b2)', borderRadius: 22, padding: '14px 12px 14px 20px' },
  textarea: { flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--t1)', fontFamily: 'DM Sans, sans-serif', fontSize: 14, lineHeight: 1.5, resize: 'none', maxHeight: 96, minHeight: 22, padding: '1px 0' },
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