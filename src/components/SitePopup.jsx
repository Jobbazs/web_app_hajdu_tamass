import { useEffect, useState } from 'react'
import { useLang } from '../LangContext'
import { supabase } from '../supabaseClient'
import '../Styles/ThankYou.css'

const PRIVATE_PREFIXES = ['/admin', '/confirm', '/cancel', '/termekismerteto', '/login']

function pageMatches(pop, path) {
  if (pop.trigger === 'first_visit') return path === '/'
  const pages = Array.isArray(pop.pages) ? pop.pages : []
  return pages.some(pg => path === pg || path === pg + '/')
}

function isSeen(pop) {
  try {
    return localStorage.getItem(`popup_fv_${pop.id}_${pop.version}`) === '1'
  } catch {
    return false
  }
}

function pickPopup(popups, path, dismissed) {
  if (PRIVATE_PREFIXES.some(p => path.startsWith(p))) return null
  for (const pop of popups) {
    if (dismissed[pop.id]) continue
    if (!pageMatches(pop, path)) continue
    if (pop.trigger === 'first_visit' && isSeen(pop)) continue
    return pop
  }
  return null
}

export default function SitePopup() {
  const { lang } = useLang()
  const [popups, setPopups]       = useState([])
  const [path, setPath]           = useState(typeof window !== 'undefined' ? window.location.pathname : '/')
  const [dismissed, setDismissed] = useState({})
  const [active, setActive]       = useState(false)

  useEffect(() => {
    supabase.from('site_popups').select('*').eq('enabled', true)
      .order('featured', { ascending: false }).order('sort_order', { ascending: true })
      .then(({ data }) => setPopups(data || []))
  }, [])

  useEffect(() => {
    const handler = () => setPath(window.location.pathname)
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [])

  useEffect(() => { setDismissed({}) }, [path])

  const current = pickPopup(popups, path, dismissed)

  useEffect(() => {
    if (current) { const t = setTimeout(() => setActive(true), 20); return () => clearTimeout(t) }
    setActive(false)
  }, [current?.id])

  useEffect(() => {
    if (!current) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [current?.id])

  if (!current) return null

  const close = () => {
    if (current.trigger === 'first_visit') {
      try { localStorage.setItem(`popup_fv_${current.id}_${current.version}`, '1') } catch {}
    }
    setActive(false)
    const id = current.id
    setTimeout(() => setDismissed(d => ({ ...d, [id]: true })), 250)
  }

  const g = (base) => current[`${base}_${lang}`] || current[`${base}_hu`] || ''
  const eyebrow  = g('eyebrow')
  const title1   = g('title1')
  const title2   = g('title2')
  const body     = g('body')
  const btnLabel = g('button')
  const btnLink  = current.link || ''

  return (
    <div className={`ty-backdrop ${active ? 'ty-active' : ''}`} onClick={close} role="dialog" aria-modal="true">
      <div className={`ty-box ${active ? 'ty-box-active' : ''}`} onClick={e => e.stopPropagation()} style={{ position: 'relative' }}>
        <button className="ty-x-btn" onClick={close} aria-label={lang === 'hu' ? 'Bezárás' : 'Close'}>×</button>
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
      </div>
    </div>
  )
}