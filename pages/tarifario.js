import { useState, useEffect } from 'react'
import Link from 'next/link'
import Head from 'next/head'

const CATEGORIAS = ['Branding','Web','Campana','Contenido','Estrategia','BTL','Ads','Guerrilla','Producto','Produccion']
const fmt = n => new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(n||0)

const EMPTY = { id:'', nombre:'', categoria:'Branding', descripcion:'', precio_min:0, precio_max:0, activo:true }

export default function Tarifario() {
  const [auth, setAuth] = useState(false)
  const [pin, setPin] = useState('')
  const [servicios, setServicios] = useState([])
  const [filtro, setFiltro] = useState('Todos')
  const [soloActivos, setSoloActivos] = useState(false)
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState(null) // null | { modo:'crear'|'editar', item }
  const [form, setForm] = useState(EMPTY)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [toast, setToast] = useState('')

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(''),2500) }

  useEffect(() => {
    if (auth) cargar()
  }, [auth])

  const cargar = async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/tarifario')
      const d = await r.json()
      setServicios(Array.isArray(d) ? d : [])
    } catch(e) { showToast('Error cargando') }
    setLoading(false)
  }

  const guardar = async (items) => {
    const r = await fetch('/api/tarifario', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(items)
    })
    return r.ok
  }

  // Toggle activo
  const toggleActivo = async (id) => {
    const updated = servicios.map(s => s.id === id ? {...s, activo: !s.activo} : s)
    setServicios(updated)
    const ok = await guardar(updated)
    if (!ok) { showToast('Error al guardar'); cargar() }
  }

  // Eliminar
  const eliminar = async (id) => {
    const updated = servicios.filter(s => s.id !== id)
    setServicios(updated)
    setConfirmDelete(null)
    const ok = await guardar(updated)
    if (ok) showToast('Servicio eliminado')
    else { showToast('Error al eliminar'); cargar() }
  }

  // Abrir modal editar
  const abrirEditar = (item) => {
    setForm({...item})
    setModal({ modo: 'editar' })
  }

  // Abrir modal crear
  const abrirCrear = () => {
    const newId = 'svc-' + Date.now()
    setForm({...EMPTY, id: newId})
    setModal({ modo: 'crear' })
  }

  // Guardar modal
  const guardarModal = async () => {
    if (!form.nombre.trim()) { showToast('El nombre es obligatorio'); return }
    const existe = servicios.find(s => s.id === form.id)
    let updated
    if (modal.modo === 'crear') {
      updated = [...servicios, {...form, precio_min: Number(form.precio_min), precio_max: Number(form.precio_max)}]
    } else {
      updated = servicios.map(s => s.id === form.id ? {...form, precio_min: Number(form.precio_min), precio_max: Number(form.precio_max)} : s)
    }
    setServicios(updated)
    setModal(null)
    const ok = await guardar(updated)
    if (ok) showToast(modal.modo === 'crear' ? 'Servicio creado ✓' : 'Cambios guardados ✓')
    else { showToast('Error al guardar'); cargar() }
  }

  const visibles = servicios.filter(s => {
    const catOk = filtro === 'Todos' || s.categoria === filtro
    const activeOk = !soloActivos || s.activo
    return catOk && activeOk
  })

  if (!auth) return (
    <div style={{minHeight:'100vh',background:'#0a0a0a',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <Head><title>Tarifario - GUUD</title></Head>
      <div style={{background:'#111',padding:40,borderRadius:16,width:320,textAlign:'center'}}>
        <div style={{fontWeight:700,fontSize:18,color:'#fff',marginBottom:4}}>Tarifario</div>
        <div style={{fontSize:13,color:'rgba(255,255,255,.4)',marginBottom:24}}>GUUD Company</div>
        <input
          type="password" placeholder="contrasena"
          value={pin} onChange={e=>setPin(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&pin==='estamosguud'&&setAuth(true)}
          style={{width:'100%',padding:'10px 14px',borderRadius:8,border:'1px solid rgba(255,255,255,.15)',
            background:'rgba(255,255,255,.05)',color:'#fff',fontSize:14,marginBottom:12,boxSizing:'border-box'}}
        />
        <button onClick={()=>pin==='estamosguud'&&setAuth(true)}
          style={{width:'100%',padding:'11px',borderRadius:8,border:'none',background:'#E8FF00',
            color:'#000',fontWeight:700,fontSize:14,cursor:'pointer'}}>Entrar</button>
        <Link href="/admin" style={{display:'block',marginTop:16,color:'rgba(255,255,255,.3)',fontSize:12,textDecoration:'none'}}>
          Volver al admin
        </Link>
      </div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#0a0a0a',color:'#fff',padding:'0 0 60px'}}>
      <Head><title>Tarifario - GUUD</title></Head>

      {/* Toast */}
      {toast && (
        <div style={{position:'fixed',top:20,left:'50%',transform:'translateX(-50%)',
          background:'#1a1a1a',color:'#E8FF00',padding:'10px 20px',borderRadius:20,
          fontSize:13,fontWeight:500,zIndex:9999,border:'1px solid rgba(232,255,0,.3)'}}>
          {toast}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',zIndex:1000,
          display:'flex',alignItems:'center',justifyContent:'center',padding:20}}
          onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div style={{background:'#111',borderRadius:16,padding:28,width:'100%',maxWidth:480,
            border:'0.5px solid rgba(255,255,255,.15)'}}>
            <div style={{fontWeight:600,fontSize:16,marginBottom:20,color:'#fff'}}>
              {modal.modo==='crear' ? 'Nuevo servicio' : 'Editar servicio'}
            </div>
            
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <div>
                <label style={{fontSize:12,color:'rgba(255,255,255,.5)',marginBottom:4,display:'block'}}>Nombre *</label>
                <input value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})}
                  placeholder="Ej: Branding Esencial"
                  style={{width:'100%',padding:'9px 12px',borderRadius:8,border:'1px solid rgba(255,255,255,.15)',
                    background:'rgba(255,255,255,.05)',color:'#fff',fontSize:14,boxSizing:'border-box'}}/>
              </div>

              <div>
                <label style={{fontSize:12,color:'rgba(255,255,255,.5)',marginBottom:4,display:'block'}}>Categoría</label>
                <select value={form.categoria} onChange={e=>setForm({...form,categoria:e.target.value})}
                  style={{width:'100%',padding:'9px 12px',borderRadius:8,border:'1px solid rgba(255,255,255,.15)',
                    background:'#1a1a1a',color:'#fff',fontSize:14,boxSizing:'border-box'}}>
                  {CATEGORIAS.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label style={{fontSize:12,color:'rgba(255,255,255,.5)',marginBottom:4,display:'block'}}>Descripción</label>
                <input value={form.descripcion} onChange={e=>setForm({...form,descripcion:e.target.value})}
                  placeholder="Breve descripción de qué incluye"
                  style={{width:'100%',padding:'9px 12px',borderRadius:8,border:'1px solid rgba(255,255,255,.15)',
                    background:'rgba(255,255,255,.05)',color:'#fff',fontSize:14,boxSizing:'border-box'}}/>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div>
                  <label style={{fontSize:12,color:'rgba(255,255,255,.5)',marginBottom:4,display:'block'}}>Precio mínimo CLP</label>
                  <input type="number" value={form.precio_min} onChange={e=>setForm({...form,precio_min:e.target.value})}
                    placeholder="900000"
                    style={{width:'100%',padding:'9px 12px',borderRadius:8,border:'1px solid rgba(255,255,255,.15)',
                      background:'rgba(255,255,255,.05)',color:'#fff',fontSize:14,boxSizing:'border-box'}}/>
                </div>
                <div>
                  <label style={{fontSize:12,color:'rgba(255,255,255,.5)',marginBottom:4,display:'block'}}>Precio máximo CLP</label>
                  <input type="number" value={form.precio_max} onChange={e=>setForm({...form,precio_max:e.target.value})}
                    placeholder="1500000"
                    style={{width:'100%',padding:'9px 12px',borderRadius:8,border:'1px solid rgba(255,255,255,.15)',
                      background:'rgba(255,255,255,.05)',color:'#fff',fontSize:14,boxSizing:'border-box'}}/>
                </div>
              </div>

              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <input type="checkbox" id="activoCheck" checked={form.activo}
                  onChange={e=>setForm({...form,activo:e.target.checked})}
                  style={{width:16,height:16,cursor:'pointer'}}/>
                <label htmlFor="activoCheck" style={{fontSize:13,color:'rgba(255,255,255,.7)',cursor:'pointer'}}>
                  Activo (visible en el chat)
                </label>
              </div>
            </div>

            <div style={{display:'flex',gap:8,marginTop:24}}>
              <button onClick={()=>setModal(null)}
                style={{flex:1,padding:'10px',borderRadius:8,border:'1px solid rgba(255,255,255,.2)',
                  background:'transparent',color:'#fff',fontSize:14,cursor:'pointer'}}>Cancelar</button>
              <button onClick={guardarModal}
                style={{flex:2,padding:'10px',borderRadius:8,border:'none',
                  background:'#E8FF00',color:'#000',fontSize:14,fontWeight:700,cursor:'pointer'}}>
                {modal.modo==='crear' ? 'Crear servicio' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      {confirmDelete && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',zIndex:1000,
          display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div style={{background:'#111',borderRadius:16,padding:28,width:'100%',maxWidth:380,
            border:'1px solid rgba(226,75,74,.4)',textAlign:'center'}}>
            <div style={{fontSize:15,fontWeight:600,color:'#fff',marginBottom:8}}>Eliminar servicio</div>
            <div style={{fontSize:13,color:'rgba(255,255,255,.5)',marginBottom:24}}>
              ¿Eliminar "{confirmDelete.nombre}"? Esta acción no se puede deshacer.
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>setConfirmDelete(null)}
                style={{flex:1,padding:'10px',borderRadius:8,border:'1px solid rgba(255,255,255,.2)',
                  background:'transparent',color:'#fff',cursor:'pointer'}}>Cancelar</button>
              <button onClick={()=>eliminar(confirmDelete.id)}
                style={{flex:1,padding:'10px',borderRadius:8,border:'none',
                  background:'#E24B4A',color:'#fff',fontWeight:700,cursor:'pointer'}}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',
        padding:'20px 32px',borderBottom:'0.5px solid rgba(255,255,255,.1)'}}>
        <div>
          <div style={{fontWeight:700,fontSize:20,color:'#fff'}}>Tarifario de Servicios</div>
          <div style={{fontSize:13,color:'rgba(255,255,255,.4)',marginTop:2}}>
            {servicios.length} servicios · {servicios.filter(s=>s.activo).length} activos en el chat
          </div>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <Link href="/admin" style={{fontSize:12,color:'rgba(255,255,255,.5)',textDecoration:'none',
            padding:'7px 14px',borderRadius:8,border:'0.5px solid rgba(255,255,255,.2)'}}>
            ← Admin
          </Link>
          <button onClick={abrirCrear}
            style={{padding:'8px 16px',borderRadius:8,border:'none',background:'#E8FF00',
              color:'#000',fontWeight:700,fontSize:13,cursor:'pointer'}}>
            + Nuevo servicio
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div style={{padding:'16px 32px',display:'flex',gap:8,flexWrap:'wrap',alignItems:'center',
        borderBottom:'0.5px solid rgba(255,255,255,.08)'}}>
        {['Todos',...CATEGORIAS].map(cat=>(
          <button key={cat} onClick={()=>setFiltro(cat)}
            style={{padding:'5px 14px',borderRadius:20,border:'0.5px solid',cursor:'pointer',fontSize:13,
              background:filtro===cat?'#E8FF00':'transparent',
              color:filtro===cat?'#000':'rgba(255,255,255,.6)',
              borderColor:filtro===cat?'#E8FF00':'rgba(255,255,255,.2)'}}>
            {cat}
          </button>
        ))}
        <button onClick={()=>setSoloActivos(!soloActivos)}
          style={{marginLeft:'auto',padding:'5px 14px',borderRadius:20,border:'0.5px solid',cursor:'pointer',fontSize:13,
            background:soloActivos?'rgba(93,202,165,.15)':'transparent',
            color:soloActivos?'#5DCAA5':'rgba(255,255,255,.5)',
            borderColor:soloActivos?'#5DCAA5':'rgba(255,255,255,.2)'}}>
          Solo activos
        </button>
      </div>

      {/* Lista */}
      <div style={{padding:'20px 32px',display:'flex',flexDirection:'column',gap:8}}>
        {loading && <div style={{textAlign:'center',color:'rgba(255,255,255,.4)',padding:40}}>Cargando...</div>}
        {!loading && visibles.length === 0 && (
          <div style={{textAlign:'center',color:'rgba(255,255,255,.3)',padding:60}}>
            No hay servicios en esta categoría.
          </div>
        )}
        {visibles.map(s => (
          <div key={s.id} style={{display:'flex',alignItems:'center',gap:12,padding:'14px 20px',
            borderRadius:12,border:'0.5px solid rgba(255,255,255,.1)',background:'rgba(255,255,255,.03)',
            opacity:s.activo?1:0.45,transition:'all .15s'}}>
            
            {/* Info */}
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontWeight:500,fontSize:15,color:'#fff'}}>{s.nombre}</span>
                <span style={{fontSize:11,padding:'2px 8px',borderRadius:20,background:'rgba(255,255,255,.08)',
                  color:'rgba(255,255,255,.5)'}}>{s.categoria}</span>
                {!s.activo && <span style={{fontSize:11,color:'#E24B4A'}}>inactivo</span>}
              </div>
              {s.descripcion && <div style={{fontSize:12,color:'rgba(255,255,255,.4)',marginTop:3}}>{s.descripcion}</div>}
            </div>

            {/* Precio */}
            <div style={{textAlign:'right',flexShrink:0}}>
              <div style={{fontSize:14,fontWeight:600,color:'#E8FF00'}}>
                {fmt(s.precio_min)} — {fmt(s.precio_max)}
              </div>
            </div>

            {/* Toggle activo */}
            <div onClick={()=>toggleActivo(s.id)}
              style={{width:40,height:22,borderRadius:11,cursor:'pointer',position:'relative',flexShrink:0,
                background:s.activo?'#E8FF00':'rgba(255,255,255,.15)',transition:'background .2s'}}>
              <div style={{position:'absolute',top:3,left:s.activo?20:3,width:16,height:16,
                borderRadius:8,background:s.activo?'#000':'#888',transition:'left .2s'}}/>
            </div>

            {/* Acciones */}
            <button onClick={()=>abrirEditar(s)}
              style={{padding:'6px 14px',borderRadius:8,border:'0.5px solid rgba(255,255,255,.2)',
                background:'transparent',color:'rgba(255,255,255,.7)',fontSize:12,cursor:'pointer'}}>
              Editar
            </button>
            <button onClick={()=>setConfirmDelete(s)}
              style={{padding:'6px 10px',borderRadius:8,border:'0.5px solid rgba(226,75,74,.4)',
                background:'transparent',color:'#E24B4A',fontSize:12,cursor:'pointer'}}>
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
