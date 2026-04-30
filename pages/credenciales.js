import Head from 'next/head'
import { useRouter } from 'next/router'

const SERVICIOS = {
  branding:   { label: 'Branding e Identidad Visual', desc: 'Proyectos de naming, identidad, packaging y sistemas de marca.' },
  web:        { label: 'Web y Digital',               desc: 'Sitios web, landings de alta conversión y e-commerce.' },
  campana:    { label: 'Campaña Creativa',           desc: 'Campañas, key visuals, dirección de arte y producción con IA.' },
  contenido:  { label: 'Contenido para Redes',         desc: 'Estrategia de contenido, piezas gráficas y automatización.' },
  estrategia: { label: 'Estrategia Creativa',          desc: 'Consultoría, posicionamiento y presentaciones comerciales.' },
}

export default function Credenciales() {
  const router = useRouter()
  const { servicio, industria } = router.query
  const current = SERVICIOS[servicio] || null

  return (
    <>
      <Head>
        <title>Proyectos similares · GÜÜD Company</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div style={S.wrap}>
        <div style={S.amb} />
        <header style={S.hdr}>
          <a href="/" style={S.back}>← Volver a la cotización</a>
          <div style={S.logo}>GÜ<span style={{ color: '#E8FF00' }}>Ü</span>D</div>
        </header>

        <div style={S.hero}>
          <div style={S.tag}>Proyectos similares</div>
          <h1 style={S.title}>
            {current ? current.label : 'Nuestro trabajo'}
          </h1>
          <p style={S.sub}>
            {current ? current.desc : 'Explorá el trabajo de GÜÜD Company en distintas áreas creativas.'}
            {industria && <span style={{ color: 'var(--acc)', marginLeft: 6 }}>· {industria}</span>}
          </p>
        </div>

        <div style={S.tabs}>
          <a href="/credenciales" style={{ ...S.tab, ...(servicio ? {} : S.tabActive) }}>Todos</a>
          {Object.entries(SERVICIOS).map(([key, val]) => (
            <a key={key} href={`/credenciales?servicio=${key}`}
              style={{ ...S.tab, ...(servicio === key ? S.tabActive : {}) }}>
              {val.label.split(' ')[0]}
            </a>
          ))}
        </div>

        <div style={S.grid}>
          {[1,2,3,4,5,6].map(i => (
            <div key={i} style={S.card}>
              <div style={S.cardImg} />
              <div style={S.cardBody}>
                <div style={S.cardTag}>{current ? current.label : 'Proyecto GÜÜD'}</div>
                <div style={S.cardTitle}>Proyecto {i}</div>
                <div style={S.cardSub}>Próximamente — este espacio mostrará casos reales de GÜÜD Company.</div>
              </div>
            </div>
          ))}
        </div>

        <div style={S.cta}>
          <div style={S.ctaText}>
            ¿Listo para cotizar tu proyecto?
          </div>
          <a href="/" style={S.ctaBtn}>Ir a la cotización →</a>
        </div>
      </div>

      <style>{`
        :root {
          --bg: #080808; --bg2: #0F0F0F; --bg3: #161616;
          --b1: rgba(255,255,255,0.06); --b2: rgba(255,255,255,0.11);
          --t1: #EDEBE5; --t2: #8F8D89; --t3: #4E4D4A;
          --acc: #E8FF00;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; background: var(--bg); color: var(--t1); -webkit-font-smoothing: antialiased; }
        a { color: inherit; text-decoration: none; }
        a:hover { opacity: .8; }
      `}</style>
    </>
  )
}

const S = {
  wrap: { minHeight: '100vh', maxWidth: 1100, margin: '0 auto', padding: '0 24px 80px', position: 'relative', zIndex: 2 },
  amb: { position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 600px 300px at 50% -80px, rgba(232,255,0,0.03), transparent)' },
  hdr: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 0', borderBottom: '0.5px solid var(--b1)', marginBottom: 48 },
  back: { fontSize: 13, color: 'var(--t3)' },
  logo: { fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 17, letterSpacing: '0.04em' },
  hero: { marginBottom: 40 },
  tag: { fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--acc)', fontFamily: 'Unbounded, sans-serif', marginBottom: 10 },
  title: { fontFamily: 'Unbounded, sans-serif', fontWeight: 700, fontSize: 32, letterSpacing: '-0.01em', lineHeight: 1.2, marginBottom: 12 },
  sub: { fontSize: 14, color: 'var(--t2)', lineHeight: 1.6, maxWidth: 520 },
  tabs: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 32 },
  tab: { fontSize: 12, padding: '6px 14px', borderRadius: 20, border: '0.5px solid var(--b2)', color: 'var(--t3)', transition: 'all .15s' },
  tabActive: { borderColor: 'rgba(232,255,0,0.35)', color: '#E8FF00', background: 'rgba(232,255,0,0.06)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, marginBottom: 64 },
  card: { border: '0.5px solid var(--b1)', borderRadius: 14, overflow: 'hidden', background: 'var(--bg2)' },
  cardImg: { height: 180, background: 'var(--bg3)' },
  cardBody: { padding: '14px 16px 18px' },
  cardTag: { fontSize: 9.5, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--t3)', fontFamily: 'Unbounded, sans-serif', marginBottom: 6 },
  cardTitle: { fontSize: 15, fontWeight: 600, marginBottom: 5 },
  cardSub: { fontSize: 12, color: 'var(--t3)', lineHeight: 1.5 },
  cta: { textAlign: 'center', padding: '48px 0 0' },
  ctaText: { fontSize: 18, fontWeight: 500, marginBottom: 16 },
  ctaBtn: { display: 'inline-block', padding: '12px 28px', background: '#E8FF00', color: '#080808', borderRadius: 10, fontFamily: 'Unbounded, sans-serif', fontWeight: 700, fontSize: 13 },
}
