import { useEffect, useState, lazy, Suspense } from 'react'
import { supabase } from './supabaseClient'
import { LangProvider } from './LangContext'

import Navbar         from './components/Navbar'
import Hero           from './components/Hero'
import About          from './components/About'
import Portfolio      from './components/Portfolio'
import Services       from './components/Services'
import Contact        from './components/Contact'
import CustomSections from './components/CustomSections'
import Footer         from './components/Footer'
import Booking        from './components/Booking'
import PortfolioHub   from './components/PortfolioHub'
import CategoryPage   from './components/CategoryPage'
import Poll           from './components/Poll'
import SitePopup      from './components/SitePopup'
import PollWarning    from './components/PollWarning'

import './Styles/global.css'

// Ritka / privát útvonalak – külön chunk, csak igény szerint töltődik.
// A legnagyobb nyereség: az admin (8 panel + @dnd-kit) így NEM része a
// főoldali csomagnak. A publikus aloldalak (Hub, CategoryPage) szándékosan
// eager-ek, mert prerenderelt tartalmuk van – ott a lazy villanást okozna.
// Ha egy dinamikus import elbukik (általában ELAVULT CHUNK egy új deploy után),
// egyszer újratöltjük az oldalt – így a böngésző a friss index.html-t és az új
// chunk-neveket kapja. Időalapú védelem a végtelen újratöltés ellen (10 mp).
function lazyWithReload(factory) {
  return lazy(() =>
    factory().catch((err) => {
      const now = Date.now()
      const last = Number(sessionStorage.getItem('chunkReloadAt') || 0)
      if (now - last > 10000) {
        sessionStorage.setItem('chunkReloadAt', String(now))
        window.location.reload()
        return new Promise(() => {})
      }
      throw err
    })
  )
}

const Admin           = lazyWithReload(() => import('./components/Admin'))
const Login           = lazyWithReload(() => import('./components/Login'))
const Confirm         = lazyWithReload(() => import('./components/Confirm'))
const Termekismerteto = lazyWithReload(() => import('./components/Termekismerteto'))
const Adatkezeles     = lazyWithReload(() => import('./components/Adatkezeles'))
const Impresszum      = lazyWithReload(() => import('./components/Impresszum'))

// Szekció komponens térkép
const SECTION_COMPONENTS = {
  about:     <About />,
  portfolio: <Portfolio />,
  services:  <Services />,
  booking:   <Booking />,
  custom:    <CustomSections />,
  contact:   <Contact />,
  poll:      <Poll />,
}

// Nem publikus termékismertető aloldal útvonala.
// Nincs sehol linkelve, nincs a sitemapben, a komponens noindex-eli.
// Átnevezéshez elég ezt az egy sort módosítani.
const INFO_PATH = '/termekismerteto-9fa3'

// Alapértelmezett sorrend ha nincs DB beállítás
const DEFAULT_ORDER = [
  { key: 'about',     visible: true },
  { key: 'portfolio', visible: true },
  { key: 'services',  visible: true },
  { key: 'booking',   visible: true },
  { key: 'custom',    visible: true },
  { key: 'poll',      visible: true },
  { key: 'contact',   visible: true },
]

function useRoute() {
  const [path, setPath] = useState(window.location.pathname)
  useEffect(() => {
    const handler = () => setPath(window.location.pathname)
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [])
  return path
}

// A főoldal szekcióit React rendereli, adatbetöltés UTÁN – ezért a böngésző
// a betöltés pillanatában még nem találja a #hash horgonyt, és a lap tetején
// marad. Ez a hook megvárja, míg az elem megjelenik, és odagördít.
// Érinti: a navbar aloldali linkjei (/#contact stb.) és a 404 oldal linkjei.
function useHashScroll() {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1))
    if (!id) return

    let tries = 0
    let timer

    const attempt = () => {
      const el = document.getElementById(id)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }
      // ~3 másodpercig várunk az adatbetöltésre, aztán feladjuk
      if (++tries < 30) timer = setTimeout(attempt, 100)
    }

    timer = setTimeout(attempt, 0)
    return () => clearTimeout(timer)
  }, [])
}

function useSectionsOrder() {
  const [order, setOrder] = useState(DEFAULT_ORDER)

  useEffect(() => {
    supabase
      .from('site_content')
      .select('value')
      .eq('key', 'sections_order')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) {
          try { setOrder(JSON.parse(data.value)) } catch {}
        }
      })
  }, [])

  return order
}

function AppInner() {
  const path        = useRoute()
  const sectOrder   = useSectionsOrder()
  useHashScroll()
  const [session,     setSession]   = useState(null)
  const [authLoading, setLoading]   = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session); setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  if (path === '/admin') {
    if (authLoading) return null
    return <Suspense fallback={null}>{session ? <Admin /> : <Login />}</Suspense>
  }

  if (path === '/confirm' || path === '/cancel')
    return <Suspense fallback={null}><Confirm /></Suspense>

  // Nem publikus termékismertető (noindex, nincs a menüben/sitemapben)
  if (path === INFO_PATH || path === INFO_PATH + '/')
    return <Suspense fallback={null}><Termekismerteto /></Suspense>

  if (path === '/adatkezeles' || path === '/adatkezeles/')
    return <Suspense fallback={null}><Adatkezeles /></Suspense>

  if (path === '/impresszum' || path === '/impresszum/')
    return <Suspense fallback={null}><Impresszum /></Suspense>

  // Portfólió aloldalak (SEO): hub + kategória-oldalak
  if (path === '/portfolio' || path === '/portfolio/') return <PortfolioHub />
  if (path.startsWith('/portfolio/')) {
    const slug = decodeURIComponent(path.slice('/portfolio/'.length).replace(/\/+$/, ''))
    if (slug) return <CategoryPage slug={slug} />
  }


  return (
    <>
      <Navbar />
      <main>
        <Hero />
        {(() => {
          let list = sectOrder.filter(s => s.visible)
          // Aktív szavazásnál a Poll szekció akkor is megjelenik, ha a mentett
          // sorrend még nem tartalmazza (a Poll magától null, ha nincs aktív szavazás).
          if (!list.some(s => s.key === 'poll')) {
            const ci = list.findIndex(s => s.key === 'contact')
            const entry = { key: 'poll', visible: true }
            list = ci >= 0 ? [...list.slice(0, ci), entry, ...list.slice(ci)] : [...list, entry]
          }
          return list.map(s => (
            <div key={s.key}>
              {SECTION_COMPONENTS[s.key] || null}
            </div>
          ))
        })()}
      </main>
      <Footer />
    </>
  )
}

export default function App() {
  return (
    <LangProvider>
      <AppInner />
      <SitePopup />
      <PollWarning />
    </LangProvider>
  )
}