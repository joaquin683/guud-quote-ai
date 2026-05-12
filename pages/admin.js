import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'

const fmt = n => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)
const fmtDate = d => new Date(d).toLocaleString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const ESTADOS = { cotizado: { label: 'Cotizado', color: '#E8FF00', bg: 'rgba(232,255,0,0.1)' }, meeting_scheduled: { label: 'Reunión agendada', color: '#4ade80', bg: 'rgba(74,222,128,0.1)' }, en_proceso: { label: 'En proceso', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' }, cerrado: { label: 'Cerrado', color: '#f87171', bg: 'rgba(248,113,113,0.1)' } }
const isAgendado = p => p.reunion_agendada === true

export default function Admin() {
  const [vista, setVista] = useState('cotizaciones')
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
          <div style={{display:'flex',gap:4,marginLeft:12}}>
            {[['cotizaciones','Cotizaciones'],['tarifario','Tarifario']].map(([k,v])=>(
              <button key={k} onClick={()=>setVista(k)} style={{padding:'4px 12px',borderRadius:6,border:'none',cursor:'pointer',fontSize:11,fontWeight:700,background:vista===k?'#E8FF00':'rgba(255,255,255,.08)',color:vista===k?'#000':'rgba(255,255,255,.5)'}}>{v}</button>
            ))}
          </div>
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
      {vista === 'cotizaciones' && (<div>
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
      </div>)}
      {vista === 'tarifario' && <TarifarioTab />}
  )
}

function TarifarioTab() {
  const [sv, setSv] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)
  const [ed, setEd] = useState({})
  const [cat, setCat] = useState('Todos')
  const [msg, setMsg] = useState(null)
  const [initing, setIniting] = useState(false)
  const fmt = n => new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(n||0)
  const cats = ['Todos',...[...new Set(sv.map(s=>s.categoria))].sort()]

  useEffect(()=>{load()},[])

  function load(){
    setLoading(true)
    fetch('/api/tarifario').then(r=>r.json()).then(d=>{
      setSv(Array.isArray(d)?d:[])
      setLoading(false)
    })
  }

  function doInit(){
    setIniting(true); setMsg(null)
    fetch('/api/setup-tarifario',{method:'POST'}).then(r=>r.json()).then(d=>{
      if(d.ok){setMsg({ok:true,m:''+d.rows+' servicios cargados'}); load()}
      else setMsg({ok:false,m:d.error||'Error'})
      setIniting(false)
    })
  }

  function startEd(s){ setEd(p=>({...p,[s.id]:{min:s.precio_min,max:s.precio_max,desc:s.descripcion}})) }
  function stopEd(id){ setEd(p=>{const n={...p};delete n[id];return n}) }

  function doSave(s){
    setSaving(s.id)
    const e=ed[s.id]
    const pmin=Number(String(e.min).replace(/D/g,''))
    const pmax=Number(String(e.max).replace(/D/g,''))
    fetch('/api/tarifario',{method:'PUT',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({id:s.id,precio_min:pmin,precio_max:pmax,descripcion:e.desc,activo:s.activo})
    }).then(r=>r.json()).then(d=>{
      if(!d.error){
        setSv(p=>p.map(x=>x.id===s.id?{...x,precio_min:pmin,precio_max:pmax,descripcion:e.desc}:x))
        stopEd(s.id)
        setMsg({ok:true,m:s.servicio+' actualizado'})
        setTimeout(()=>setMsg(null),3000)
      } else setMsg({ok:false,m:d.error})
      setSaving(null)
    })
  }

  function doToggle(s){
    fetch('/api/tarifario',{method:'PUT',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({id:s.id,precio_min:s.precio_min,precio_max:s.precio_max,descripcion:s.descripcion,activo:!s.activo})
    }).then(()=>setSv(p=>p.map(x=>x.id===s.id?{...x,activo:!s.activo}:x)))
  }

  const shown = cat==='Todos' ? sv : sv.filter(s=>s.categoria===cat)

  if(loading) return <div style={{textAlign:'center',padding:60,color:'rgba(255,255,255,.3)',fontSize:14}}>Cargando tarifario...</div>

  if(!sv.length) return (
    <div style={{textAlign:'center',padding:60}}>
      <p style={{color:'rgba(255,255,255,.4)',marginBottom:20,fontSize:14}}>Tabla vacía. Carga los servicios por defecto.</p>
      <button onClick={doInit} disabled={initing} style={{padding:'10px 28px',borderRadius:8,border:'none',background:'#E8FF00',color:'#000',fontWeight:700,fontSize:14,cursor:'pointer'}}>
        {initing?'Inicializando...':'Inicializar Tarifario'}
      </button>
      {msg&&<p style={{marginTop:14,color:msg.ok?'#E8FF00':'#ff6b6b',fontSize:13}}>{msg.m}</p>}
    </div>
  )

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:10}}>
        <span style={{fontSize:16,fontWeight:700,color:'#fff'}}>Tarifario de Servicios</span>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          {cats.map(c=>(
            <button key={c} onClick={()=>setCat(c)} style={{padding:'4px 13px',borderRadius:20,border:'none',cursor:'pointer',fontSize:12,fontWeight:600,background:cat===c?'#E8FF00':'rgba(255,255,255,.07)',color:cat===c?'#000':'rgba(255,255,255,.45)'}}>
              {c}
            </button>
          ))}
        </div>
      </div>
      {msg&&<div style={{padding:'8px 14px',borderRadius:8,marginBottom:12,background:msg.ok?'rgba(232,255,0,.08)':'rgba(255,107,107,.08)',color:msg.ok?'#E8FF00':'#ff6b6b',fontSize:13}}>{msg.m}</div>}
      {shown.map(s=>{
        const e=ed[s.id]
        return (
          <div key={s.id} style={{background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',borderRadius:10,padding:'14px 16px',marginBottom:8,opacity:s.activo?1:0.45}}>
            {e?(
              <div>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                  <span style={{fontWeight:600,fontSize:14,color:'#fff',flex:1}}>{s.servicio}</span>
                  <span style={{fontSize:11,color:'rgba(255,255,255,.35)',background:'rgba(255,255,255,.06)',borderRadius:4,padding:'2px 7px'}}>{s.categoria}</span>
                </div>
                <div style={{display:'flex',gap:8,marginBottom:10,flexWrap:'wrap',alignItems:'flex-end'}}>
                  <div>
                    <div style={{fontSize:11,color:'rgba(255,255,255,.35)',marginBottom:3}}>Precio min</div>
                    <input value={e.min} onChange={ev=>setEd(p=>({...p,[s.id]:{...p[s.id],min:ev.target.value}}))} style={{background:'rgba(255,255,255,.07)',border:'1px solid rgba(232,255,0,.35)',borderRadius:6,padding:'5px 9px',color:'#fff',fontSize:13,width:130}} />
                  </div>
                  <div>
                    <div style={{fontSize:11,color:'rgba(255,255,255,.35)',marginBottom:3}}>Precio max</div>
                    <input value={e.max} onChange={ev=>setEd(p=>({...p,[s.id]:{...p[s.id],max:ev.target.value}}))} style={{background:'rgba(255,255,255,.07)',border:'1px solid rgba(232,255,0,.35)',borderRadius:6,padding:'5px 9px',color:'#fff',fontSize:13,width:130}} />
                  </div>
                  <div style={{flex:1,minWidth:150}}>
                    <div style={{fontSize:11,color:'rgba(255,255,255,.35)',marginBottom:3}}>Descripcion</div>
                    <input value={e.desc} onChange={ev=>setEd(p=>({...p,[s.id]:{...p[s.id],desc:ev.target.value}}))} style={{background:'rgba(255,255,255,.07)',border:'1px solid rgba(232,255,0,.35)',borderRadius:6,padding:'5px 9px',color:'#fff',fontSize:13,width:'100%'}} />
                  </div>
                </div>
                <div style={{display:'flex',gap:6,justifyContent:'flex-end'}}>
                  <button onClick={()=>stopEd(s.id)} style={{padding:'4px 12px',borderRadius:6,border:'none',background:'rgba(255,255,255,.07)',color:'rgba(255,255,255,.4)',fontSize:12,cursor:'pointer'}}>Cancelar</button>
                  <button onClick={()=>doSave(s)} disabled={saving===s.id} style={{padding:'4px 12px',borderRadius:6,border:'none',background:'#E8FF00',color:'#000',fontWeight:700,fontSize:12,cursor:'pointer'}}>
                    {saving===s.id?'Guardando...':'Guardar'}
                  </button>
                </div>
              </div>
            ):(
              <div>
                <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
                  <span style={{fontWeight:600,fontSize:14,color:'#fff',flex:1}}>{s.servicio}</span>
                  <span style={{fontSize:11,color:'rgba(255,255,255,.35)',background:'rgba(255,255,255,.06)',borderRadius:4,padding:'2px 7px'}}>{s.categoria}</span>
                  <span style={{fontWeight:700,fontSize:14,color:'#E8FF00'}}>{fmt(s.precio_min)} — {fmt(s.precio_max)}</span>
                  <button onClick={()=>doToggle(s)} style={{width:36,height:20,borderRadius:10,background:s.activo?'#E8FF00':'rgba(255,255,255,.12)',border:'none',cursor:'pointer',position:'relative',flexShrink:0}}>
                    <span style={{position:'absolute',top:3,left:s.activo?19:3,width:14,height:14,borderRadius:'50%',background:s.activo?'#000':'rgba(255,255,255,.5)',display:'block'}} />
                  </button>
                  <button onClick={()=>startEd(s)} style={{padding:'4px 12px',borderRadius:6,border:'1px solid rgba(255,255,255,.12)',background:'transparent',color:'rgba(255,255,255,.45)',fontSize:12,cursor:'pointer',flexShrink:0}}>Editar</button>
                </div>
                {s.descripcion&&<div style={{fontSize:12,color:'rgba(255,255,255,.38)',marginTop:5}}>{s.descripcion}</div>}
              </div>
            )}
          </div>
        )
      })}
      <div style={{marginTop:16,textAlign:'right'}}>
        <button onClick={doInit} disabled={initing} style={{padding:'6px 16px',borderRadius:6,border:'1px solid rgba(255,255,255,.1)',background:'transparent',color:'rgba(255,255,255,.3)',fontSize:12,cursor:'pointer'}}>
          {initing?'Reiniciando...':'Reinicializar servicios'}
        </button>
      </div>
    </div>
  )
}