import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useLang } from '../LangContext'
import '../Styles/ThankYou.css'


const X_STYLE = {
  position: 'absolute', top: '0.5rem', right: '0.7rem', background: 'transparent',
  border: 'none', color: 'inherit', fontSize: '1.7rem', lineHeight: 1, cursor: 'pointer',
  opacity: 0.55, padding: '0.2rem 0.4rem',
}
const BTN = {
  padding: '0.7rem 1.6rem', borderRadius: '2px', cursor: 'pointer',
  fontFamily: "'Space Mono', monospace", fontSize: '0.72rem', letterSpacing: '0.08em',
  textTransform: 'uppercase', border: '1px solid var(--rust, #B5231E)',
}
const BTN_PRIMARY = { ...BTN, background: 'var(--rust, #B5231E)', color: '#fff' }
const BTN_SEC = { ...BTN, background: 'transparent', color: 'inherit' }

export default function PollWarning() {
  const { lang } = useLang()
  const [poll, setPoll]       = useState(null)
  const [options, setOptions] = useState([])
  const [now, setNow]         = useState(Date.now())
  const [dismissed, setDismissed] = useState(false)
  const [active, setActive]   = useState(false)

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase.from('polls').select('*').eq('active', true).maybeSingle()
      if (!p || !p.warn_before_min || !p.closes_at) return
      const { data: opts } = await supabase.from('poll_options').select('*').eq('poll_id', p.id).eq('approved', true)
      setPoll(p); setOptions(opts || [])
      try { if (localStorage.getItem(`poll_warn_${p.id}_${p.version || 0}`) === '1') setDismissed(true) } catch {}
    })()
  }, [])

  useEffect(() => {
    if (!poll?.closes_at) return
    const t = setInterval(() => setNow(Date.now()), 20000)
    return () => clearInterval(t)
  }, [poll?.id])

  const closeMs = poll?.closes_at ? new Date(poll.closes_at).getTime() : 0
  const warnMs  = (poll?.warn_before_min || 0) * 60000
  const started = !poll?.starts_at || new Date(poll.starts_at).getTime() <= now
  const onPublicPage = typeof window === 'undefined' ||
    !/^\/(admin|confirm|cancel|login|termekismerteto)/.test(window.location.pathname)
  const inWindow = !!poll && !dismissed && poll.status !== 'closed' && started && onPublicPage &&
    now < closeMs && now >= (closeMs - warnMs)

  useEffect(() => {
    if (inWindow) { const t = setTimeout(() => setActive(true), 20); return () => clearTimeout(t) }
    setActive(false)
  }, [inWindow])

  useEffect(() => {
    if (!inWindow) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [inWindow])

  if (!inWindow) return null

  const isSimple = (poll.vote_style || 'updown') === 'simple'
  const scoreOf  = (o) => (isSimple ? o.up_votes : o.up_votes - o.down_votes)
  const liveSort = poll.live_sort !== false
  const top = liveSort ? [...options].sort((a, b) => scoreOf(b) - scoreOf(a)).slice(0, 3) : []
  const rowLabel = (o) => (Array.isArray(o.cells) ? o.cells : []).map(c => (lang === 'hu' ? c.hu : (c.en || c.hu))).filter(Boolean).join(' – ') || '—'
  const title = lang === 'hu' ? poll.title_hu : (poll.title_en || poll.title_hu)

  const markSeen = () => { try { localStorage.setItem(`poll_warn_${poll.id}_${poll.version || 0}`, '1') } catch {} }
  const close = () => { markSeen(); setActive(false); setTimeout(() => setDismissed(true), 250) }
  const goVote = () => {
    markSeen()
    if (window.location.pathname === '/') {
      document.getElementById('szavazas')?.scrollIntoView({ behavior: 'smooth' })
      setActive(false); setTimeout(() => setDismissed(true), 250)
    } else {
      window.location.href = '/#szavazas'
    }
  }

  return (
    <div className={`ty-backdrop ${active ? 'ty-active' : ''}`} onClick={close} role="dialog" aria-modal="true">
      <div className={`ty-box ${active ? 'ty-box-active' : ''}`} onClick={e => e.stopPropagation()} style={{ position: 'relative' }}>
        <button onClick={close} aria-label={lang === 'hu' ? 'Bezárás' : 'Close'} style={X_STYLE}>×</button>
        <div className="ty-corner ty-corner--tl" />
        <div className="ty-corner ty-corner--tr" />
        <div className="ty-corner ty-corner--bl" />
        <div className="ty-corner ty-corner--br" />
        <div className="ty-eyebrow">{lang === 'hu' ? 'Hamarosan zárul' : 'Closing soon'}</div>
        <h2 className="ty-title">{title}</h2>
        {top.length > 0 && (
          <ol style={{ listStyle: 'none', padding: 0, margin: '1rem 0 0.5rem', textAlign: 'left' }}>
            {top.map((o, i) => (
              <li key={o.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '0.45rem 0', borderBottom: '1px solid rgba(128,128,128,0.25)' }}>
                <span>{i + 1}. {rowLabel(o)}</span>
                <span style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {isSimple ? `▲${o.up_votes}` : `▲${o.up_votes} ▼${o.down_votes}`}
                </span>
              </li>
            ))}
          </ol>
        )}
        <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', marginTop: '1.3rem', flexWrap: 'wrap' }}>
          <button style={BTN_SEC} onClick={close}>{lang === 'hu' ? 'Bezárás' : 'Close'}</button>
          <button style={BTN_PRIMARY} onClick={goVote}>{lang === 'hu' ? 'Szavazok' : 'Vote'}</button>
        </div>
      </div>
    </div>
  )
}