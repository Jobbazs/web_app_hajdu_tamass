import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { LangProvider } from './LangContext'

import Navbar    from './components/Navbar'
import Hero      from './components/Hero'
import About     from './components/About'
import Portfolio from './components/Portfolio'
import Services  from './components/Services'
import Contact   from './components/Contact'
import Footer    from './components/Footer'
import Admin     from './components/Admin'
import Login     from './components/Login'

import './index.css'

function useRoute() {
  const [path, setPath] = useState(window.location.pathname)
  useEffect(() => {
    const handler = () => setPath(window.location.pathname)
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [])
  return path
}

function AppInner() {
  const path = useRoute()
  const [session, setSession]     = useState(null)
  const [authLoading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (path === '/admin') {
    if (authLoading) return null
    return session ? <Admin /> : <Login />
  }

  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <div className="rust-divider" />
        <About />
        <Portfolio />
        <div className="rust-divider" />
        <Services />
        <Contact />
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
