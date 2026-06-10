import { useState, useRef } from 'react'
import emailjs from '@emailjs/browser'
import { supabase } from '../supabaseClient'
import { useLang } from '../LangContext'
import ThankYou from './ThankYou'

const EMAILJS_SERVICE_ID  = import.meta.env.VITE_EMAILJS_SERVICE_ID  || ''
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || ''
const EMAILJS_PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY  || ''

const ACCEPTED_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
  'image/heic', 'image/heif', 'image/gif', 'image/avif',
]
const ACCEPTED_EXT  = '.jpg,.jpeg,.png,.webp,.heic,.heif,.gif,.avif'
const MAX_SIZE_MB   = 10
const MAX_SIZE_B    = MAX_SIZE_MB * 1024 * 1024
const MAX_FILES     = 5

const EMPTY = { name: '', email: '', service: '', message: '' }

export default function Contact() {
  const [form,       setForm]      = useState(EMPTY)
  const [status,     setStatus]    = useState('idle')
  const [errMsg,     setErrMsg]    = useState('')
  const [showThanks, setThanks]    = useState(false)
  const [senderName, setSender]    = useState('')
  const [files,      setFiles]     = useState([])        // max 5 File object
  const [fileErr,    setFileErr]   = useState('')
  const [uploading,  setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const { t } = useLang()
  const c = t.contact

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  // Fájl kiválasztás – max 5 db
  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || [])
    if (!selected.length) return
    setFileErr('')

    const remaining = MAX_FILES - files.length
    if (remaining <= 0) {
      setFileErr(`Maximum ${MAX_FILES} fájl csatolható.`)
      e.target.value = ''
      return
    }

    const toAdd = []
    for (const f of selected.slice(0, remaining)) {
      if (!ACCEPTED_TYPES.includes(f.type.toLowerCase())) {
        setFileErr(c.errFileType); e.target.value = ''; return
      }
      if (f.size > MAX_SIZE_B) {
        setFileErr(c.errFileSize); e.target.value = ''; return
      }
      toAdd.push(f)
    }

    setFiles(prev => [...prev, ...toAdd])
    e.target.value = ''   // reset hogy ugyanazt újra lehessen választani
  }

  const removeFile = (idx) => {
    setFiles(prev => prev.filter((_, i) => i !== idx))
    setFileErr('')
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

    // 1. Fájlok feltöltése Supabase Storage-ba
    const attachmentUrls = []
    if (files.length > 0) {
      setUploading(true)
      for (const f of files) {
        const ext      = f.name.split('.').pop()
        const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
        const path     = `contact-attachments/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(path, f, { contentType: f.type, upsert: false })

        if (uploadError) {
          console.error('Upload error:', uploadError)
          setErrMsg(c.errUpload)
          setStatus('error')
          setUploading(false)
          return
        }

        const { data: urlData } = supabase.storage
          .from('attachments')
          .getPublicUrl(path)
        if (urlData?.publicUrl) attachmentUrls.push(urlData.publicUrl)
      }
      setUploading(false)
    }

    // 2. Supabase DB – üzenet mentése
    const payload = {
      name:            form.name.trim(),
      email:           form.email.trim(),
      service:         form.service || 'Nem megadott',
      message:         form.message.trim(),
      read:            false,
      attachment_url:  attachmentUrls.length > 0 ? attachmentUrls.join(', ') : null,
    }

    const { error: dbError } = await supabase.from('messages').insert(payload)
    if (dbError) {
      console.error('DB error:', dbError)
      setErrMsg(c.errSend)
      setStatus('error')
      return
    }

    // 3. EmailJS
    if (EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY) {
      try {
        await emailjs.send(
          EMAILJS_SERVICE_ID,
          EMAILJS_TEMPLATE_ID,
          {
            from_name:      payload.name,
            from_email:     payload.email,
            service_type:   payload.service,
            message:        payload.message,
            attachment_url: attachmentUrls.length > 0 ? attachmentUrls.join('\n') : 'Nincs csatolmány',
          },
          EMAILJS_PUBLIC_KEY
        )
      } catch (emailErr) {
        console.warn('EmailJS error (nem kritikus):', emailErr)
      }
    }

    setStatus('success')
    setSender(form.name.trim())
    setForm(EMPTY)
    setFiles([])
    if (fileInputRef.current) fileInputRef.current.value = ''
    setThanks(true)
  }

  const isSending = status === 'sending' || uploading

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

          {/* ── Fájl csatolás – max 5 db ── */}
          <div className="form-group">
            <input
              ref={fileInputRef}
              id="attachment"
              type="file"
              accept={ACCEPTED_EXT}
              multiple
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />

            {/* Meglévő fájlok */}
            {files.length > 0 && (
              <div className="attach-list">
                {files.map((f, idx) => (
                  <div key={idx} className="attach-preview">
                    <img
                      src={URL.createObjectURL(f)}
                      alt="előnézet"
                      className="attach-preview-img"
                    />
                    <div className="attach-preview-info">
                      <span className="attach-preview-name">{f.name}</span>
                      <span className="attach-preview-size">
                        {(f.size / 1024 / 1024).toFixed(1)} MB
                      </span>
                    </div>
                    <button
                      type="button"
                      className="attach-remove-btn"
                      onClick={() => removeFile(idx)}
                      aria-label={c.attachRemove}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Hozzáadás gomb – csak ha van még hely */}
            {files.length < MAX_FILES && (
              <button
                type="button"
                className="attach-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                <span className="attach-btn-icon">⊕</span>
                {files.length === 0
                  ? c.attachBtn
                  : `${c.attachBtn} (${files.length}/${MAX_FILES})`}
              </button>
            )}

            {files.length >= MAX_FILES && (
              <div className="attach-limit-note">
                Maximum {MAX_FILES} fájl csatolva.
              </div>
            )}

            <span className="form-hint">{c.attachHint}</span>
            {fileErr && <div className="form-error">{fileErr}</div>}
          </div>

          {errMsg && <div className="form-error">{errMsg}</div>}

          <button
            type="submit"
            className="submit-btn"
            disabled={isSending}
          >
            <span>
              {uploading  ? 'Feltöltés...' :
               isSending  ? c.sending :
               c.send}
            </span>
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
