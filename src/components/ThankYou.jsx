import { useEffect, useState } from 'react'
import { useLang } from '../LangContext'
import { useSiteContent } from '../hooks'
import '../Styles/ThankYou.css'

export default function ThankYou({
  visible, name, onClose,
  // Opcionális override – ha nincs megadva, a site_content / LangContext szöveg jön
  eyebrow: eyebrowProp,
  titleLine1: title1Prop,
  titleLine2: title2Prop,
  body: bodyProp,
}) {
  const { lang, t }  = useLang()
  const { content }  = useSiteContent()
  const ty = t.thankYou

  // Szövegek site_content-ből, fallback LangContext-re
  const eyebrow     = eyebrowProp ?? (content[`thankyou_eyebrow_${lang}`] || ty.eyebrow)
  const titleLine1  = title1Prop  ?? (content[`thankyou_title1_${lang}`]  || ty.titleLine1)
  const titleLine2  = title2Prop  ?? (content[`thankyou_title2_${lang}`]  || ty.titleLine2)
  const body        = bodyProp    ?? (content[`thankyou_body_${lang}`]    || ty.body)
  const bodyName    = content[`thankyou_body_name_${lang}`]   || ty.bodyWithName
  const closeBtn    = content[`thankyou_closebtn_${lang}`]    || ty.closeBtn
  const dismiss     = content[`thankyou_dismiss_${lang}`]     || ty.dismiss

  const [rendered, setRendered] = useState(false)
  const [active,   setActive]   = useState(false)

  useEffect(() => {
    if (visible) {
      setRendered(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setActive(true)))
    } else {
      setActive(false)
      const t = setTimeout(() => setRendered(false), 500)
      return () => clearTimeout(t)
    }
  }, [visible])

  useEffect(() => {
    if (!visible) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [visible, onClose])

  useEffect(() => {
    if (visible) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [visible])

  if (!rendered) return null

  // Ha bodyProp van, az már kész szöveg – nincs {name} helyettesítés
  const bodyText = bodyProp
    ? bodyProp
    : (name ? bodyName.replace('{name}', name) : body)

  return (
    <div className={`ty-backdrop ${active ? 'ty-active' : ''}`} onClick={onClose} aria-modal="true" role="dialog">
      <div className={`ty-box ${active ? 'ty-box-active' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="ty-corner ty-corner--tl" />
        <div className="ty-corner ty-corner--tr" />
        <div className="ty-corner ty-corner--bl" />
        <div className="ty-corner ty-corner--br" />
        <div className="ty-icon">✓</div>
        <div className="ty-eyebrow">{eyebrow}</div>
        <h2 className="ty-title">
          {titleLine1}<br />
          <span className="ty-title-accent">{titleLine2}</span>
        </h2>
        <p className="ty-body">{bodyText}</p>
        <button className="ty-close-btn" onClick={onClose}>{closeBtn}</button>
        <button className="ty-dismiss" onClick={onClose} aria-label={dismiss}>{dismiss}</button>
      </div>
    </div>
  )
}
