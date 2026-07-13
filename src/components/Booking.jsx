import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useLang } from '../LangContext'
import { useAvailableSlots } from '../hooks'
import '../Styles/Booking.css'

const SERVICE_LABELS = {
  portrait:   { hu: 'Portré & Stúdió',   en: 'Portrait & Studio'  },
  event:      { hu: 'Rendezvény & Buli',  en: 'Event & Party'      },
  video:      { hu: 'Videóklipp',         en: 'Music Video'        },
  other:      { hu: 'Egyéb',              en: 'Other'              },
}

const EMPTY_FORM = { name: '', email: '', phone: '', message: '' }

function formatDate(dateStr, lang) {
  const d = new Date(dateStr)
  return d.toLocaleDateString(lang === 'hu' ? 'hu-HU' : 'en-GB', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  })
}

function formatTime(t) {
  return t?.slice(0, 5) || ''
}

export default function Booking() {
  const { lang } = useLang()
  const { slots, loading } = useAvailableSlots()

  const [selectedSlot, setSelectedSlot] = useState(null)
  const [form,         setForm]         = useState(EMPTY_FORM)
  const [step,         setStep]         = useState('list')   // 'list' | 'form' | 'success' | 'waitlist'
  const [sending,      setSending]      = useState(false)
  const [error,        setError]        = useState('')
  const [waitlistDone, setWaitlistDone] = useState(false)

  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }))

  const validate = () => {
    if (!form.name.trim())  return lang === 'hu' ? 'Kérlek add meg a neved.' : 'Please enter your name.'
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email))
      return lang === 'hu' ? 'Érvényes email szükséges.' : 'Valid email required.'
    return null
  }

  // ── Időpont foglalás ─────────────────────────────────────────
  const handleBook = async (e) => {
    e.preventDefault()
    const err = validate()
    if (err) { setError(err); return }

    setSending(true); setError('')

    // Token generálás
    const token     = crypto.randomUUID()
    const cancelTok = crypto.randomUUID()
    const expires   = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 perc

    const { error: dbErr } = await supabase.from('appointments').insert({
      slot_id:            selectedSlot.id,
      name:               form.name.trim(),
      email:              form.email.trim(),
      phone:              form.phone.trim() || null,
      message:            form.message.trim() || null,
      status:             'pending_confirmation',
      confirmation_token: token,
      token_expires_at:   expires,
      cancellation_token: cancelTok,
    })

    if (dbErr) {
      setError(lang === 'hu' ? 'Hiba történt. Kérlek próbáld újra.' : 'Something went wrong. Please try again.')
      setSending(false); return
    }

    // Email küldés (Supabase Edge Function-nel, vagy EmailJS fallback)
    await sendConfirmationEmail(form, selectedSlot, token)

    setStep('success')
    setSending(false)
  }

  // ── Várólistára feliratkozás ─────────────────────────────────
  const handleWaitlist = async (e) => {
    e.preventDefault()
    const err = validate()
    if (err) { setError(err); return }

    setSending(true); setError('')

    // Pozíció meghatározása
    const { data: existing } = await supabase
      .from('appointment_waitlist')
      .select('id')
      .eq('slot_id', selectedSlot.id)

    const position = (existing?.length || 0) + 1

    const { error: dbErr } = await supabase.from('appointment_waitlist').insert({
      slot_id:  selectedSlot.id,
      name:     form.name.trim(),
      email:    form.email.trim(),
      phone:    form.phone.trim() || null,
      position,
    })

    if (dbErr) {
      setError(lang === 'hu' ? 'Hiba történt.' : 'Something went wrong.')
      setSending(false); return
    }

    setWaitlistDone(true)
    setSending(false)
  }

  const isFull   = (s) => s.booked_count >= s.capacity
  const isAlmost = (s) => s.available_spots === 1

  // ── Csoportosítás dátum szerint ─────────────────────────────
  const grouped = slots.reduce((acc, s) => {
    const key = s.slot_date
    if (!acc[key]) acc[key] = []
    acc[key].push(s)
    return acc
  }, {})

  return (
    <section id="booking">
      <div className="container">
        <div className="section-label">
          {lang === 'hu' ? 'Foglalj időpontot' : 'Book a session'}
        </div>
        <h2 className="section-title">
          {lang === 'hu' ? 'Időpontfoglalás' : 'Booking'}
        </h2>

        {/* ── LISTA ── */}
        {step === 'list' && (
          loading ? (
            <div className="booking-empty">
              {lang === 'hu' ? 'Betöltés...' : 'Loading...'}
            </div>
          ) : slots.length === 0 ? (
            <div className="booking-empty">
              {lang === 'hu'
                ? 'Jelenleg nincs szabad időpont. Írj a Kapcsolat oldalon!'
                : 'No available slots at the moment. Contact me below!'}
            </div>
          ) : (
            <div className="booking-groups">
              {Object.entries(grouped).map(([date, daySlots]) => (
                <div key={date} className="booking-day">
                  <div className="booking-day-label">{formatDate(date, lang)}</div>
                  <div className="booking-slots">
                    {daySlots.map(slot => (
                      <div
                        key={slot.id}
                        className={`booking-slot ${isFull(slot) ? 'booking-slot--full' : ''}`}
                        onClick={() => {
                          setSelectedSlot(slot)
                          setStep('form')
                          setForm(EMPTY_FORM)
                          setError('')
                          setWaitlistDone(false)
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={e => e.key === 'Enter' && !isFull(slot) && setSelectedSlot(slot)}
                      >
                        <div className="booking-slot-time">
                          {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                        </div>
                        <div className="booking-slot-title">{slot.title}</div>
                        <div className="booking-slot-type">
                          {SERVICE_LABELS[slot.service_type]?.[lang] || slot.service_type}
                        </div>
                        <div className={`booking-slot-status ${isFull(slot) ? 'full' : isAlmost(slot) ? 'almost' : 'free'}`}>
                          {isFull(slot)
                            ? (lang === 'hu' ? 'Foglalt – várólistára' : 'Full – join waitlist')
                            : isAlmost(slot)
                              ? (lang === 'hu' ? 'Utolsó hely!' : 'Last spot!')
                              : (lang === 'hu' ? 'Szabad' : 'Available')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* ── FORM ── */}
        {step === 'form' && selectedSlot && (
          <div className="booking-form-wrap">
            <button className="booking-back" onClick={() => setStep('list')}>
              ← {lang === 'hu' ? 'Vissza' : 'Back'}
            </button>

            <div className="booking-selected-info">
              <div className="booking-selected-date">{formatDate(selectedSlot.slot_date, lang)}</div>
              <div className="booking-selected-time">
                {formatTime(selectedSlot.start_time)} – {formatTime(selectedSlot.end_time)}
              </div>
              <div className="booking-selected-title">{selectedSlot.title}</div>
            </div>

            {/* Várólistára ha tele */}
            {isFull(selectedSlot) ? (
              waitlistDone ? (
                <div className="booking-success">
                  ✓ {lang === 'hu'
                    ? 'Felkerültél a várólistára. Ha hely szabadul fel, emailben értesítünk.'
                    : 'You\'re on the waitlist. We\'ll email you if a spot opens up.'}
                </div>
              ) : (
                <>
                  <p className="booking-waitlist-note">
                    {lang === 'hu'
                      ? 'Ez az időpont foglalt. Feliratkozhatsz a várólistára – ha valaki lemond, automatikusan értesítünk.'
                      : 'This slot is full. Join the waitlist – we\'ll notify you automatically if someone cancels.'}
                  </p>
                  <form onSubmit={handleWaitlist} className="booking-form" noValidate>
                    {renderFields(form, handleChange, lang)}
                    {error && <div className="form-error">{error}</div>}
                    <button type="submit" className="submit-btn" disabled={sending}>
                      <span>{sending
                        ? (lang === 'hu' ? 'Küldés...' : 'Sending...')
                        : (lang === 'hu' ? 'Feliratkozás a várólistára' : 'Join waitlist')}</span>
                    </button>
                  </form>
                </>
              )
            ) : (
              <form onSubmit={handleBook} className="booking-form" noValidate>
                {renderFields(form, handleChange, lang)}
                {error && <div className="form-error">{error}</div>}
                <p className="booking-confirm-note">
                  {lang === 'hu'
                    ? 'A foglalás megerősítéséhez emailben küldünk egy linket. A link 10 percig érvényes.'
                    : 'We\'ll send a confirmation link to your email. The link is valid for 10 minutes.'}
                </p>
                <button type="submit" className="submit-btn" disabled={sending}>
                  <span>{sending
                    ? (lang === 'hu' ? 'Küldés...' : 'Sending...')
                    : (lang === 'hu' ? 'Időpont foglalása →' : 'Book this slot →')}</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* ── SIKER ── */}
        {step === 'success' && (
          <div className="booking-success-wrap">
            <div className="booking-success">
              <div className="booking-success-icon">✓</div>
              <h3>{lang === 'hu' ? 'Majdnem kész!' : 'Almost there!'}</h3>
              <p>
                {lang === 'hu'
                  ? `Elküldtük a megerősítő emailt a ${form.email} címre. Kattints a linkre 10 percen belül a foglalás véglegesítéséhez.`
                  : `We've sent a confirmation email to ${form.email}. Click the link within 10 minutes to finalize your booking.`}
              </p>
              <button className="booking-back" onClick={() => { setStep('list'); setForm(EMPTY_FORM) }}>
                {lang === 'hu' ? '← Vissza a listához' : '← Back to slots'}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

// ── Form mezők ────────────────────────────────────────────────
function renderFields(form, handleChange, lang) {
  return (
    <>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="b-name">
            {lang === 'hu' ? 'Neved *' : 'Your name *'}
          </label>
          <input id="b-name" name="name" type="text" className="form-input"
            value={form.name} onChange={handleChange}
            placeholder={lang === 'hu' ? 'Kis János' : 'John Smith'} />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="b-email">
            Email *
          </label>
          <input id="b-email" name="email" type="email" className="form-input"
            value={form.email} onChange={handleChange}
            placeholder="valaki@email.com" />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="b-phone">
          {lang === 'hu' ? 'Telefonszám' : 'Phone number'}
        </label>
        <input id="b-phone" name="phone" type="tel" className="form-input"
          value={form.phone} onChange={handleChange}
          placeholder="+36 30 123 4567" />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="b-message">
          {lang === 'hu' ? 'Gondolatok, kérdések, elképzelések' : 'Thoughts, questions, ideas'}
        </label>
        <textarea id="b-message" name="message" className="form-input"
          value={form.message} onChange={handleChange} rows={5}
          placeholder={lang === 'hu'
            ? 'Meséld el az elképzelésed, ha van inspirációd, vagy bármilyen kérdésed...'
            : 'Tell me about your idea, inspiration, or any questions you have...'} />
      </div>
    </>
  )
}

// ── Email küldés – Resend.com ────────────────────────────────
async function sendConfirmationEmail(form, slot, token) {
  try {
    const { sendBookingConfirmation } = await import('../lib/resend.js')
    await sendBookingConfirmation({
      to:           form.email,
      name:         form.name,
      slotTitle:    slot.title,
      slotDate:     slot.slot_date,
      startTime:    slot.start_time?.slice(0,5),
      endTime:      slot.end_time?.slice(0,5),
      confirmToken: token,
    })
  } catch (e) {
    console.warn('Resend confirmation error:', e)
    // Nem blokkolja a foglalást ha az email küldés hibázik
  }
}
