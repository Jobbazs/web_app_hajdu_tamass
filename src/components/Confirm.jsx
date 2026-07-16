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
  const handleConfirm = async (token) => {
    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('appointments')
      .select('id, status, token_expires_at')
      .eq('confirmation_token', token)
      .single()

    if (error || !data)                         { setStatus('expired');   return }
    if (data.status !== 'pending_confirmation') { setStatus('confirmed'); return }
    if (data.token_expires_at < now)            { setStatus('expired');   return }

    await supabase.from('appointments')
      .update({ status: 'confirmed', confirmed_at: now })
      .eq('id', data.id)

    setStatus('confirmed')
  }

  // ── Foglalás lemondása ───────────────────────────────────
  const handleCancel = async (token) => {
    const { data, error } = await supabase
      .from('appointments')
      .select('id, status')
      .eq('cancellation_token', token)
      .single()

    if (error || !data)           { setStatus('expired');   return }
    if (data.status === 'cancelled') { setStatus('cancelled'); return }

    await supabase.from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', data.id)

    setStatus('cancelled')
  }

  // ── Waitlist ajánlat elfogadás / elutasítás ──────────────
  const handleWaitlist = async (offerToken, action) => {
    const now = new Date().toISOString()

    const { data: wl, error } = await supabase
      .from('appointment_waitlist')
      .select('*, appointment_slots(title, slot_date, start_time, end_time)')
      .eq('offer_token', offerToken)
      .single()

    if (error || !wl)                  { setStatus('expired'); return }
    if (wl.offer_expires_at < now)     { setStatus('expired'); return }
    if (wl.response)                   { setStatus(wl.response === 'accepted' ? 'waitlist_accepted' : 'waitlist_declined'); return }

    if (action === 'accept') {
      // Foglalás létrehozása
      const cancelTok = crypto.randomUUID()
      await supabase.from('appointments').insert({
        slot_id:            wl.slot_id,
        name:               wl.name,
        email:              wl.email,
        phone:              wl.phone || null,
        status:             'confirmed',
        confirmed_at:       now,
        cancellation_token: cancelTok,
      })

      // Waitlist sor frissítése
      await supabase.from('appointment_waitlist')
        .update({ response: 'accepted', responded_at: now })
        .eq('id', wl.id)

      setStatus('waitlist_accepted')

    } else {
      // Elutasítás – trigger viszi a következőnek (trg_notify_waitlist_decline)
      await supabase.from('appointment_waitlist')
        .update({ response: 'declined', responded_at: now })
        .eq('id', wl.id)

      // Frontend is küld emailt a következőnek ha van
      await notifyNextWaitlist(wl.slot_id, wl.id)

      setStatus('waitlist_declined')
    }
  }

  // ── Következő várólistás értesítése (ha a trigger nem fut le) ───────────
  const notifyNextWaitlist = async (slotId, currentWlId) => {
    try {
      // Következő nem értesített
      const { data: next } = await supabase
        .from('appointment_waitlist')
        .select('*, appointment_slots(title, slot_date, start_time, end_time)')
        .eq('slot_id', slotId)
        .is('notified_at', null)
        .is('response', null)
        .order('position', { ascending: true })
        .limit(1)
        .single()

      if (!next) return

      const offerToken = crypto.randomUUID()
      const expires    = new Date(Date.now() + 30 * 60 * 1000).toISOString()

      await supabase.from('appointment_waitlist')
        .update({ notified_at: new Date().toISOString(), offer_token: offerToken, offer_expires_at: expires })
        .eq('id', next.id)

      const slot = next.appointment_slots
      const { error: emailErr } = await supabase.functions.invoke('send-booking-email', {
        body: {
          to:         next.email,
          name:       next.name,
          slotTitle:  slot.title,
          slotDate:   slot.slot_date,
          startTime:  slot.start_time?.slice(0, 5),
          endTime:    slot.end_time?.slice(0, 5),
          isWaitlist: true,
          offerToken,
        },
      })
      if (emailErr) console.warn('Waitlist email error:', emailErr)
    } catch (e) {
      console.warn('Next waitlist notify error:', e)
    }
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
