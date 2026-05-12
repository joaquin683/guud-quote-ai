import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'

export default function Tarifario() {
  const [authed, setAuthed] = useState(false)
  const [pin, setPin] = useState('')
  const [pinErr, setPinErr] = useState(false)
  const [sv, setSv] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)
  const [ed, setEd] = useState({})
  const [cat, setCat] = useState('Todos')
  const [msg, setMsg] = useState(null)
  const [initing, setIniting] = useState(false)

  const fmt = n => new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(n||0)
  const cats = ['Todos',...[...new Set(sv.map(s=>s.categoria))].sort()]

  function checkPin() {
    if (pin === 'estamosguud') { setAuthed(true); setPinErr(false) }
    else { setPinErr(true) }
  }

  useEffect(() => { if (authed) load() }, [authed])

  function load() {
    setLoading(true)
    fetch('/api/tarifario').then(r=>r.json()).then(d=>{
      setSv(Array.isArray(d)?d:[])
      setLoading(false)
    })
  }

  function doInit() {
    setIniting(true); setMsg(null)
    fetch('/api/setup-tarifario',{method:'POST'}).then(r=>r.json()).then(d=>{
      if(d.ok){setMsg({ok:true,m:d.rows+' servicios cargados'}); load()}
      else setMsg({ok:false,m:d.error||'Error'})
      setIniting(false)
    })
  }

  function startEd(s) { setEd(p=>({...p,[s.id]:{min:s.precio_min,max:s.precio_max,desc:s.descripcion}})) }
  function stopEd(id) { setEd(p=>{const n={...p};delete n[id];return n}) }

  function doSave(s) {
    setSaving(s.id)
    const e = ed[s.id]
    const pmin = Number(String(e.min).replace(/D/g,''))
    const pmax = Number(String(e.max).replace(/D/g,''))
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

  function doToggle(s) {
    fetch('/api/tarifario',{method:'PUT',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({id:s.id,precio_min:s.precio_min,precio_max:s.precio_max,descripcion:s.descripcion,activo:!s.activo})
    }).then(()=>setSv(p=>p.map(x=>x.id===s.id?{...x,activo:!s.activo}:x)))
  }

  const shown = cat==='Todos' ? sv : sv.filter(s=>s.categoria===cat)

  if (!authed) return (
    <div style={{minHeight:'100vh',background:'#0a0a0a',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <Head><title>Tarifario - GUUD</title></Head>
      <div style={{background:'#111',border:'1px solid rgba(255,255,255,.1)',borderRadius:16,padding:40,width:320,textAlign:'center'}}>
        <div style={{fontSize:20,fontWeight:700,color:'#fff',marginBottom:6}}>Tarifario</div>
        <div style={{fontSize:13,color:'rgba(255,255,255,.4)',marginBottom:24}}>GUUD Company</div>
        <input
          type="password"
          placeholder="contrasena"
          value={pin}
          onChange={e=>setPin(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&checkPin()}
          style={{width:'100%',padding:'10px 14px',borderRadius:8,border:pinErr?'1px solid #ff6b6b':'1px solid rgba(255,255,255,.15)',background:'rgba(255,255,255,.05)',color:'#fff',fontSize:14,marginBottom:12,boxSizing:'border-box'}}
        />
        {pinErr && <div style={{color:'#ff6b6b',fontSize:12,marginBottom:10}}>Contrasena incorrecta</div>}
        <button onClick={checkPin} style={{width:'100%',padding:'10px',borderRadius:8,border:'none',background:'#E8FF00',color:'#000',fontWeight:700,fontSize:14,cursor:'pointer'}}>Entrar</button>
        <Link href="/admin" style={{display:'block',marginTop:16,color:'rgba(255,255,255,.3)',fontSize:12,textDecoration:'none'}}>Volver al admin</Link>
      </div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#0a0a0a',color:'#fff'}}>
      <Head><title>Tarifario - GUUD</title></Head>
      <div style={{maxWidth:900,margin:'0 auto',padding:'0 20px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'20px 0',borderBottom:'1px solid rgba(255,255,255,.08)',marginBottom:28}}>
          <div>
            <div style={{fontWeight:700,fontSize:18,color:'#fff'}}>Tarifario de Servicios</div>
            <div style={{fontSize:12,color:'rgba(255,255,255,.35)',marginTop:2}}>Edita precios y descripciones en tiempo real</div>
          </div>
          <Link href="/admin" style={{fontSize:12,color:'rgba(255,255,255,.4)',textDecoration:'none',padding:'6px 14px',borderRadius:6,border:'1px solid rgba(255,255,255,.1)'}}>Admin</Link>
        </div>

        <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:20}}>
          {cats.map(c=>(
            <button key={c} onClick={()=>setCat(c)} style={{padding:'4px 13px',borderRadius:20,border:'none',cursor:'pointer',fontSize:12,fontWeight:600,background:cat===c?'#E8FF00':'rgba(255,255,255,.07)',color:cat===c?'#000':'rgba(255,255,255,.45)'}}>
              {c}
            </button>
          ))}
        </div>

        {msg && (
          <div style={{padding:'8px 14px',borderRadius:8,marginBottom:16,background:msg.ok?'rgba(232,255,0,.08)':'rgba(255,107,107,.08)',color:msg.ok?'#E8FF00':'#ff6b6b',fontSize:13}}>
            {msg.m}
          </div>
        )}

        {loading && <div style={{textAlign:'center',padding:60,color:'rgba(255,255,255,.3)'}}>Cargando...</div>}

        {!loading && !sv.length && (
          <div style={{textAlign:'center',padding:60}}>
            <p style={{color:'rgba(255,255,255,.4)',marginBottom:20}}>Sin datos. Inicializa el tarifario con los servicios por defecto.</p>
            <button onClick={doInit} disabled={initing} style={{padding:'10px 28px',borderRadius:8,border:'none',background:'#E8FF00',color:'#000',fontWeight:700,fontSize:14,cursor:'pointer'}}>
              {initing?'Inicializando...':'Inicializar Tarifario'}
            </button>
          </div>
        )}

        {shown.map(s=>{
          const e = ed[s.id]
          return (
            <div key={s.id} style={{background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',borderRadius:10,padding:'14px 16px',marginBottom:8,opacity:s.activo?1:0.45}}>
              {e ? (
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
                    <div style={{flex:1,minWidth:160}}>
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
              ) : (
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

        {!loading && sv.length > 0 && (
          <div style={{marginTop:20,paddingTop:16,borderTop:'1px solid rgba(255,255,255,.06)',textAlign:'right'}}>
            <button onClick={doInit} disabled={initing} style={{padding:'6px 16px',borderRadius:6,border:'1px solid rgba(255,255,255,.1)',background:'transparent',color:'rgba(255,255,255,.3)',fontSize:12,cursor:'pointer'}}>
              {initing?'Reiniciando...':'Reinicializar servicios'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}