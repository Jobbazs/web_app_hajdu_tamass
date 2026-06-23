import { useEffect, useState } from 'react'
import { useLang } from '../LangContext'
import '../Styles/ThankYou.css'

/*
  Props:
    visible  – boolean, megjelenjen-e
    name     – küldő neve (személyre szabott üzenet)
    onClose  – bezárás callback
*/
export default function ThankYou({ visible, name, onClose }) {
  const { t } = useLang()
  const ty = t.thankYou
  // rendered: DOM-ban van-e (animáció miatt kicsit tovább marad)
  const [rendered, setRendered] = useState(false)
  // active: opacity 1 (fade-in trigger)
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (visible) {
      setRendered(true)
      // Kis delay kell hogy a CSS transition érzékelje a változást
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setActive(true))
      })
    } else {
      setActive(false)
      // Fade-out után eltávolítjuk a DOM-ból
      const t = setTimeout(() => setRendered(false), 500)
      return () => clearTimeout(t)
    }
  }, [visible])

  // ESC bezárja
  useEffect(() => {
    if (!visible) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [visible, onClose])

  // Scroll lock
  useEffect(() => {
    if (visible) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [visible])

  if (!rendered) return null

  return (
    <div
      className={`ty-backdrop ${active ? 'ty-active' : ''}`}
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className={`ty-box ${active ? 'ty-box-active' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Dekoratív sarok vonalak */}
        <div className="ty-corner ty-corner--tl" />
        <div className="ty-corner ty-corner--tr" />
        <div className="ty-corner ty-corner--bl" />
        <div className="ty-corner ty-corner--br" />

        {/* Tartalom */}
        <div className="ty-icon">✓</div>

        <div className="ty-eyebrow">{ty.eyebrow}</div>

        <h2 className="ty-title">
          {ty.titleLine1}<br />
          <span className="ty-title-accent">{ty.titleLine2}</span>
        </h2>

        <p className="ty-body">
          {name
            ? ty.bodyWithName.replace('{name}', name)
            : ty.body}
        </p>

        <button className="ty-close-btn" onClick={onClose}>
          {ty.closeBtn}
        </button>

        {/* Háttér backdrop blur gomb */}
        <button
          className="ty-dismiss"
          onClick={onClose}
          aria-label={ty.dismiss}
        >
          {ty.dismiss}
        </button>
      </div>
    </div>
  )
}
