import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Confirm() {
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    const params    = new URLSearchParams(window.location.search)
    const token     = params.get('token')
    const waitlist  = params.get('waitlist')
    const action    = params.get('action')   // 'accept' | 'decline'
    const isCancel  = window.location.pathname.includes('cancel')

    if (waitlist) {
      handleWaitlist(waitlist, action)
    } else if (token) {
      isCancel ? handleCancel(token) : handleConfirm(token)
    } else {
      setStatus('error')
    }
  }, [])

  // ── Foglalás megerősítése ────────────────────────────────
  // A token-ellenőrzés + státuszváltás szerveroldalon, SECURITY DEFINER
  // RPC-ben történik. A kliens nem olvashatja/írhatja közvetlenül a
  // foglalás-táblát – csak ezt az egy, tokenre szűkített műveletet hívja.
  const handleConfirm = async (token) => {
    const { data, error } = await supabase.rpc('confirm_appointment', { p_token: token })
    setStatus(error ? 'error' : (data || 'error'))
  }

  // ── Foglalás lemondása ───────────────────────────────────
  const handleCancel = async (token) => {
    const { data, error } = await supabase.rpc('cancel_appointment', { p_token: token })
    setStatus(error ? 'error' : (data || 'error'))
  }

  // ── Waitlist ajánlat elfogadás / elutasítás ──────────────
  // Az elfogadáskori foglalás-létrehozást és a lánc továbbvitelét is az
  // RPC + a szerveroldali triggerek intézik (trg_notify_waitlist_decline),
  // ezért itt már nincs kliensoldali "notifyNext".
  const handleWaitlist = async (offerToken, action) => {
    const { data, error } = await supabase.rpc('respond_waitlist', {
      p_token:  offerToken,
      p_accept: action === 'accept',
    })
    setStatus(error ? 'error' : (data || 'error'))
  }

  // ── Megjelenítés ─────────────────────────────────────────
  const messages = {
    loading:          { icon: '…', title: 'Feldolgozás...',           body: 'Egy pillanat.' },
    confirmed:        { icon: '✓', title: 'Foglalás megerősítve!',    body: 'Várlak szeretettel!' },
    cancelled:        { icon: '✓', title: 'Foglalás lemondva.',        body: 'Az időpont felszabadult.' },
    expired:          { icon: '✕', title: 'A link lejárt.',            body: 'Kérlek foglalj új időpontot.' },
    error:            { icon: '✕', title: 'Érvénytelen link.',         body: 'Kérlek ellenőrizd az emailt.' },
    waitlist_accepted:{ icon: '✓', title: 'Időpont elfogadva!',        body: 'Foglalásod rögzítettük. Várlak szeretettel!' },
    waitlist_declined:{ icon: '✓', title: 'Rendben.',                  body: 'Az ajánlatot visszautasítottad. Ha megváltoztatod a döntésed, írj nekünk.' },
  }

  const m = messages[status] || messages.error

  return (
    <div style={{
      minHeight:'100vh', display:'flex', alignItems:'center',
      justifyContent:'center', background:'var(--bg-primary)', padding:'2rem',
    }}>
      <div style={{
        border:'1px solid var(--border-mid)', padding:'3rem 2.5rem',
        textAlign:'center', maxWidth:480, width:'100%', background:'var(--bg-card)',
      }}>
        <div style={{fontSize:'2.5rem', color:'var(--accent)', marginBottom:'1rem'}}>{m.icon}</div>
        <h2 style={{
          fontFamily:"'Bebas Neue', sans-serif", fontSize:'2rem',
          letterSpacing:'0.08em', color:'var(--text-primary)', marginBottom:'0.8rem',
        }}>{m.title}</h2>
        <p style={{color:'var(--text-secondary)', lineHeight:1.7}}>{m.body}</p>
        <a href="/" style={{
          display:'inline-block', marginTop:'2rem',
          fontFamily:"'Space Mono', monospace", fontSize:'0.65rem',
          letterSpacing:'0.2em', textTransform:'uppercase',
          color:'var(--accent)', textDecoration:'none',
        }}>← Vissza a főoldalra</a>
      </div>
    </div>
  )
}
