import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

// Visited via /confirm?token=xxx or /cancel?token=xxx
export default function Confirm() {
  const [status, setStatus] = useState('loading') // loading | confirmed | cancelled | expired | error

  useEffect(() => {
    const params  = new URLSearchParams(window.location.search)
    const token   = params.get('token')
    const isCanel = window.location.pathname.includes('cancel')

    if (!token) { setStatus('error'); return }

    const run = async () => {
      if (isCanel) {
        // Cancellation
        const { data, error } = await supabase
          .from('appointments')
          .select('id, status, slot_id')
          .eq('cancellation_token', token)
          .single()

        if (error || !data) { setStatus('expired'); return }
        if (data.status === 'cancelled') { setStatus('cancelled'); return }

        await supabase
          .from('appointments')
          .update({ status: 'cancelled' })
          .eq('id', data.id)

        setStatus('cancelled')
      } else {
        // Confirmation
        const now = new Date().toISOString()
        const { data, error } = await supabase
          .from('appointments')
          .select('id, status, token_expires_at, slot_id')
          .eq('confirmation_token', token)
          .single()

        if (error || !data)                        { setStatus('expired'); return }
        if (data.status !== 'pending_confirmation'){ setStatus('confirmed'); return }
        if (data.token_expires_at < now)           { setStatus('expired'); return }

        await supabase
          .from('appointments')
          .update({ status: 'confirmed', confirmed_at: now })
          .eq('id', data.id)

        setStatus('confirmed')
      }
    }

    run()
  }, [])

  const messages = {
    loading:   { icon: '…', title: 'Feldolgozás...',         body: 'Egy pillanat.' },
    confirmed: { icon: '✓', title: 'Foglalás megerősítve!',  body: 'Hamarosan visszajelzünk a részletekkel.' },
    cancelled: { icon: '✓', title: 'Foglalás lemondva.',      body: 'Az időpont felszabadult.' },
    expired:   { icon: '✕', title: 'A link lejárt.',          body: 'Kérlek foglalj új időpontot.' },
    error:     { icon: '✕', title: 'Érvénytelen link.',       body: 'Kérlek ellenőrizd az emailt.' },
  }

  const m = messages[status]

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg-primary)', padding: '2rem',
    }}>
      <div style={{
        border: '1px solid var(--border-mid)', padding: '3rem 2.5rem',
        textAlign: 'center', maxWidth: 480, width: '100%',
        background: 'var(--bg-card)',
      }}>
        <div style={{ fontSize: '2.5rem', color: 'var(--accent)', marginBottom: '1rem' }}>{m.icon}</div>
        <h2 style={{
          fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem',
          letterSpacing: '0.08em', color: 'var(--text-primary)', marginBottom: '0.8rem',
        }}>{m.title}</h2>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>{m.body}</p>
        <a href="/" style={{
          display: 'inline-block', marginTop: '2rem',
          fontFamily: "'Space Mono', monospace", fontSize: '0.65rem',
          letterSpacing: '0.2em', textTransform: 'uppercase',
          color: 'var(--accent)', textDecoration: 'none',
        }}>← Vissza a főoldalra</a>
      </div>
    </div>
  )
}
