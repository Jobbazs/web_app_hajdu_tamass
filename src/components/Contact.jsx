import { useState } from 'react'
import emailjs from '@emailjs/browser'
import { supabase } from '../supabaseClient'
import { useLang } from '../LangContext'
import ThankYou from './ThankYou'

// ── EmailJS beállítások – töltsd ki a saját értékeiddel ──────
// emailjs.com → Account → API Keys → Public Key
// emailjs.com → Email Services → Service ID
// emailjs.com → Email Templates → Template ID
const EMAILJS_SERVICE_ID  = import.meta.env.VITE_EMAILJS_SERVICE_ID  || ''
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || ''
const EMAILJS_PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY  || ''

const EMPTY = { name: '', email: '', service: '', message: '' }

export default function Contact() {
  const [form, setForm]         = useState(EMPTY)
  const [status, setStatus]     = useState('idle')
  const [errMsg, setErrMsg]     = useState('')
  const [showThanks, setThanks] = useState(false)
  const [senderName, setSender] = useState('')
  const { t } = useLang()
  const c = t.contact

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const validate = () => {
    if (!form.name.trim())    return c.errName
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) return c.errEmail
    if (!form.message.trim()) return c.errMessage
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const err = validate()
    if (err) { setErrMsg(err); return }

    setStatus('sending')
    setErrMsg('')

    const payload = {
      name:    form.name.trim(),
      email:   form.email.trim(),
      service: form.service || 'Nem megadott',
      message: form.message.trim(),
      read:    false,
    }

    // 1. Supabase – mindig menti az adatbázisba
    const { error: dbError } = await supabase.from('messages').insert(payload)

    if (dbError) {
      console.error('Supabase error:', dbError)
      setErrMsg(c.errSend)
      setStatus('error')
      return
    }

    // 2. EmailJS – elküldi a tulajdonosnak (ha van konfiguráció)
    if (EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY) {
      try {
        await emailjs.send(
          EMAILJS_SERVICE_ID,
          EMAILJS_TEMPLATE_ID,
          {
            from_name:    payload.name,
            from_email:   payload.email,
            service_type: payload.service,
            message:      payload.message,
          },
          EMAILJS_PUBLIC_KEY
        )
      } catch (emailErr) {
        // Email küldés nem kritikus – az üzenet már el van mentve
        console.warn('EmailJS error (nem kritikus):', emailErr)
      }
    }

    setStatus('success')
    setSender(form.name.trim())
    setForm(EMPTY)
    setThanks(true)
  }

  return (
    <section id="contact">
      <div className="container contact-inner">
        <div className="section-label">{c.label}</div>
        <h2 className="section-title">{c.title}</h2>
        <p className="contact-intro">{c.intro}</p>

        {status === 'success' && (
          <div className="form-success">{c.success}</div>
        )}
          <form onSubmit={handleSubmit} noValidate>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="name">{c.name}</label>
                <input
                  id="name" name="name" type="text"
                  className="form-input"
                  placeholder={c.namePh}
                  value={form.name}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="email">{c.email}</label>
                <input
                  id="email" name="email" type="email"
                  className="form-input"
                  placeholder={c.emailPh}
                  value={form.email}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="service">{c.service}</label>
              <select
                id="service" name="service"
                className="form-input"
                value={form.service}
                onChange={handleChange}
              >
                {c.serviceOptions.map((o, i) => (
                  <option key={o} value={i === 0 ? '' : o}>{o}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="message">{c.message}</label>
              <textarea
                id="message" name="message"
                className="form-input"
                placeholder={c.messagePh}
                rows={6}
                value={form.message}
                onChange={handleChange}
              />
            </div>

            {errMsg && <div className="form-error">{errMsg}</div>}

            <button
              type="submit"
              className="submit-btn"
              disabled={status === 'sending'}
            >
              <span>{status === 'sending' ? c.sending : c.send}</span>
            </button>

          </form>

      </div>

      <ThankYou
        visible={showThanks}
        name={senderName}
        onClose={() => { setThanks(false); setStatus('idle') }}
      />
    </section>
  )
}
