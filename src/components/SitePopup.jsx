import { useEffect, useState } from 'react'
import { useLang } from '../LangContext'
import { useSiteContent } from '../hooks'
import '../Styles/ThankYou.css'

// Promó/hirdető felugró ablak. Kinézetre a ThankYou popupot követi (ty-* CSS).
//
// Megjelenés:
//  • "Első látogatás" mód  → csak a legelső főoldal-megnyitáskor (böngészőnként
//    egyszer, verziónként; localStorage-ban jegyezve → cookieless).
//  • "Aloldal" mód         → MINDEN alkalommal, amikor a látogató a beállított
//    oldalra ÉRKEZIK (F5 vagy odanavigálás). Bezárás után csak az adott
//    nézetre tűnik el; ha újra odanavigálnak, ismét feljön. (Nincs tartós jelzés.)
const PRIVATE_PREFIXES = ['/admin', '/confirm', '/cancel', '/termekismerteto', '/login']

function safeArr(s) { try { return JSON.parse(s || '[]') } catch { return [] } }

export default function SitePopup() {
  const { lang } = useLang()
  const { content } = useSiteContent()
  const [path, setPath] = useState(typeof window !== 'undefined' ? window.location.pathname : '/')
  const [show, setShow]     = useState(false)
  const [active, setActive] = useState(false)

  // Útvonalváltás követése (back/forward is) – hogy aloldal-módban újra feljöhessen
  useEffect(() => {
    const handler = () => setPath(window.location.pathname)
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [])

  const enabled = content.promo_popup_enabled === 'true'
  const trigger = content.promo_popup_trigger || 'first_visit'
  const version = content.promo_popup_ver || '0'
  const fvKey   = `promo_popup_fv_seen_${version}`   // CSAK az "első látogatás" módhoz

  useEffect(() => {
    if (!enabled) { setShow(false); return }
    if (PRIVATE_PREFIXES.some(p => path.startsWith(p))) { setShow(false); return }

    let match = false
    if (trigger === 'first_visit') {
      let seen = false
      try { seen = localStorage.getItem(fvKey) === '1' } catch { /* privát mód */ }
      match = path === '/' && !seen
    } else if (trigger === 'subpage') {
      const pages = safeArr(content.promo_popup_pages)
      match = pages.some(pg => path === pg || path === pg + '/')   // minden odaérkezéskor
    }
    setShow(match)
  }, [enabled, trigger, version, path, content.promo_popup_pages, fvKey])

  useEffect(() => {
    if (show) { const t = setTimeout(() => setActive(true), 20); return () => clearTimeout(t) }
    setActive(false)
  }, [show])

  useEffect(() => {
    if (!show) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [show])

  const close = () => {
    // Első látogatás módban jegyezzük, hogy látta (többé ne jöjjön).
    // Aloldal módban NEM jegyezzük → a következő odaérkezéskor ismét feljön.
    if (trigger === 'first_visit') {
      try { localStorage.setItem(fvKey, '1') } catch { /* privát mód */ }
    }
    setActive(false)
    setTimeout(() => setShow(false), 250)
  }

  if (!show) return null

  const g = (base) => content[`${base}_${lang}`] || content[`${base}_hu`] || ''
  const eyebrow  = g('promo_popup_eyebrow')
  const title1   = g('promo_popup_title1')
  const title2   = g('promo_popup_title2')
  const body     = g('promo_popup_body')
  const btnLabel = g('promo_popup_button')
  const btnLink  = content.promo_popup_link || ''

  return (
    <div className={`ty-backdrop ${active ? 'ty-active' : ''}`} onClick={close} role="dialog" aria-modal="true">
      <div className={`ty-box ${active ? 'ty-box-active' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="ty-corner ty-corner--tl" />
        <div className="ty-corner ty-corner--tr" />
        <div className="ty-corner ty-corner--bl" />
        <div className="ty-corner ty-corner--br" />
        {eyebrow && <div className="ty-eyebrow">{eyebrow}</div>}
        <h2 className="ty-title">
          {title1}{title2 && <> <span className="ty-title-accent">{title2}</span></>}
        </h2>
        {body && <p className="ty-body">{body}</p>}
        {btnLabel && (btnLink
          ? <a className="ty-close-btn" href={btnLink} onClick={close}
               style={{ textDecoration: 'none', display: 'inline-block' }}>{btnLabel}</a>
          : <button className="ty-close-btn" onClick={close}>{btnLabel}</button>
        )}
        <button className="ty-dismiss" onClick={close} aria-label="Bezárás">
          {lang === 'hu' ? 'Bezárás' : 'Close'}
        </button>
      </div>
    </div>
  )
}