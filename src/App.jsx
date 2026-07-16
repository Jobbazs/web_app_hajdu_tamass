import { useEffect, useState, useMemo } from 'react'
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
import Admin          from './components/Admin'
import Login          from './components/Login'
import Booking        from './components/Booking'
import Confirm        from './components/Confirm'

import './Styles/global.css'

// Szekció komponens térkép
const SECTION_COMPONENTS = {
  about:     <About />,
  portfolio: <Portfolio />,
  services:  <Services />,
  booking:   <Booking />,
  custom:    <CustomSections />,
  contact:   <Contact />,
}

// Alapértelmezett sorrend ha nincs DB beállítás
const DEFAULT_ORDER = [
  { key: 'about',     visible: true },
  { key: 'portfolio', visible: true },
  { key: 'services',  visible: true },
  { key: 'booking',   visible: true },
  { key: 'custom',    visible: true },
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
    return session ? <Admin /> : <Login />
  }

  if (path === '/confirm' || path === '/cancel') return <Confirm />

  return (
    <>
      <Navbar />
      <main>
        <Hero />
        {sectOrder
          .filter(s => s.visible)
          .map(s => (
            <div key={s.key}>
              {SECTION_COMPONENTS[s.key] || null}
            </div>
          ))}
      </main>
      <Footer />
    </>
  )
}

export default function App() {
  return (
    <LangProvider>
      <AppInner />
    </LangProvider>
  )
}
