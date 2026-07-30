import { useState, useEffect } from 'react'
import { OWNER } from '../data'
import { useLang } from '../LangContext'
import { useSiteContent } from '../hooks'
import '../Styles/Navbar.css'

/* ── Social ikonok (inline SVG, currentColor) ───────────────────
   A CMS csak { label, url } párokat tárol – a platformot a label/url
   alapján ismerjük fel, és ahhoz rendelünk ikont. Ismeretlen esetén
   egy általános "link" (glóbusz) ikon jelenik meg. */
const ICON_PATHS = {
  instagram: 'M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.43.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.43.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.43-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.43-.16 1.06-.36 2.23-.41 1.27-.06 1.65-.07 4.85-.07M12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63c-.79.31-1.46.72-2.13 1.38C1.35 2.68.94 3.35.63 4.14.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.31.79.72 1.46 1.38 2.13.67.66 1.34 1.07 2.13 1.38.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56.79-.31 1.46-.72 2.13-1.38.66-.67 1.07-1.34 1.38-2.13.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91-.31-.79-.72-1.46-1.38-2.13C21.32 1.35 20.65.94 19.86.63 19.1.33 18.22.13 16.95.07 15.67.01 15.26 0 12 0zm0 5.84A6.16 6.16 0 1 0 12 18.16 6.16 6.16 0 0 0 12 5.84zm0 10.16A4 4 0 1 1 12 8a4 4 0 0 1 0 8zm6.41-11.85a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88z',
  facebook: 'M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.87v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z',
  tiktok: 'M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.08-.14 1.62.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z',
  youtube: 'M23.5 6.2a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.51A3.02 3.02 0 0 0 .5 6.2C0 8.07 0 12 0 12s0 3.93.5 5.8a3.02 3.02 0 0 0 2.12 2.14c1.88.51 9.38.51 9.38.51s7.5 0 9.38-.51a3.02 3.02 0 0 0 2.12-2.14C24 15.93 24 12 24 12s0-3.93-.5-5.8zM9.55 15.57V8.43L15.82 12l-6.27 3.57z',
  x: 'M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.47l8.6-9.83L0 1.15h7.59l5.24 6.93 6.07-6.93zm-1.29 19.5h2.04L6.49 3.24H4.3l13.31 17.41z',
  linkedin: 'M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.66H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13zm1.78 13.02H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z',
  link: 'M12 0a12 12 0 1 0 0 24 12 12 0 0 0 0-24zm7.94 7h-3.38a15.7 15.7 0 0 0-1.38-3.56A8.03 8.03 0 0 1 19.94 7zM12 2.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM2.26 14a8.03 8.03 0 0 1 0-4h3.87c-.08.66-.13 1.32-.13 2s.05 1.34.13 2H2.26zm.8 2h3.38c.35 1.28.82 2.48 1.38 3.56A8.03 8.03 0 0 1 3.06 16zm3.38-8H3.06a8.03 8.03 0 0 1 4.76-3.56A15.7 15.7 0 0 0 6.44 8zM12 21.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 16H9.66c-.09-.66-.16-1.32-.16-2s.07-1.35.16-2h4.68c.09.65.16 1.32.16 2s-.07 1.34-.16 2zm.32 3.56c.56-1.08 1.03-2.28 1.38-3.56h3.38a8.03 8.03 0 0 1-4.76 3.56zM16.72 14c.08-.66.13-1.32.13-2s-.05-1.34-.13-2h3.87a8.03 8.03 0 0 1 0 4h-3.87z',
}

function iconKey(label = '', url = '') {
  const s = `${label} ${url}`.toLowerCase()
  if (s.includes('instagram')) return 'instagram'
  if (s.includes('facebook') || s.includes('fb.com')) return 'facebook'
  if (s.includes('tiktok')) return 'tiktok'
  if (s.includes('youtu')) return 'youtube'
  if (s.includes('twitter') || s.includes('x.com')) return 'x'
  if (s.includes('linkedin')) return 'linkedin'
  return 'link'
}

function SocialIcon({ label, url }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <path d={ICON_PATHS[iconKey(label, url)]} />
    </svg>
  )
}

export default function Navbar({ subpage = false }) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { lang, t, toggleLang } = useLang()
  const { content } = useSiteContent()

  // Social linkek – site_content-ből (JSON), fallback az OWNER-re.
  // A CMS változatlanul a footer_socials kulcsot tölti fel.
  let socials = []
  try {
    const raw = content['footer_socials']
    if (raw) socials = JSON.parse(raw)
  } catch {}
  if (!socials.length && OWNER.instagram) {
    socials = [{ label: 'Instagram', url: OWNER.instagram }]
  }

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const scrollTo = (id) => {
    // Aloldalon nincs #section a DOM-ban → a főoldalra navigálunk az adott
    // horgonyra; főoldalon sima görgetés.
    if (subpage) {
      window.location.href = `/#${id}`
      return
    }
    setMenuOpen(false)
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    }, menuOpen ? 300 : 0)
  }

  const goHome = () => {
    if (subpage) { window.location.href = '/'; return }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const links = [
    { id: 'about',     label: t.nav.about },
    { id: 'portfolio', label: t.nav.portfolio },
    { id: 'services',  label: t.nav.services },
    { id: 'booking',   label: lang === 'hu' ? 'Időpontfoglalás' : 'Booking' },
    { id: 'contact',   label: t.nav.contact },
  ]

  return (
    <>
      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        {/* Bal oldali csoport: teljes név + social ikonok */}
        <div className="nav-brand">
          <div
            className="nav-logo"
            onClick={goHome}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && goHome()}
          >
            {OWNER.name}
          </div>

          {socials.length > 0 && (
            <div className="nav-socials">
              {socials.map((s, i) => (
                <a key={i} href={s.url} target="_blank" rel="noreferrer" aria-label={s.label}>
                  <SocialIcon label={s.label} url={s.url} />
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Desktop links + language switcher */}
        <div className="nav-right">
          <ul className="nav-links">
            {subpage && (
              <li>
                <a href="/" onClick={e => { e.preventDefault(); goHome() }}>
                  {lang === 'hu' ? 'Főoldal' : 'Home'}
                </a>
              </li>
            )}
            {links.map(l => (
              <li key={l.id}>
                <a href={subpage ? `/#${l.id}` : `#${l.id}`} onClick={e => { e.preventDefault(); scrollTo(l.id) }}>
                  {l.label}
                </a>
              </li>
            ))}
          </ul>

          {/* Language switcher */}
          <button
            className="lang-switcher"
            onClick={toggleLang}
            aria-label={lang === 'hu' ? 'Switch to English' : 'Váltás magyarra'}
          >
            <span className={lang === 'hu' ? 'lang-active' : ''}>HU</span>
            <span className="lang-sep">/</span>
            <span className={lang === 'en' ? 'lang-active' : ''}>EN</span>
          </button>
        </div>

        {/* Hamburger */}
        <button
          className={`nav-hamburger ${menuOpen ? 'open' : ''}`}
          onClick={() => setMenuOpen(o => !o)}
          aria-label={menuOpen ? 'Menü bezárása' : 'Menü megnyitása'}
          aria-expanded={menuOpen}
        >
          <span /><span /><span />
        </button>
      </nav>

      {/* Mobil menü */}
      <div className={`nav-mobile ${menuOpen ? 'open' : ''}`} aria-hidden={!menuOpen}>
        {subpage && (
          <a href="/" onClick={e => { e.preventDefault(); goHome() }}>
            {lang === 'hu' ? 'Főoldal' : 'Home'}
          </a>
        )}
        {links.map(l => (
          <a key={l.id} href={subpage ? `/#${l.id}` : `#${l.id}`} onClick={e => { e.preventDefault(); scrollTo(l.id) }}>
            {l.label}
          </a>
        ))}
        {/* Language switcher mobilon is */}
        <button className="lang-switcher lang-switcher--mobile" onClick={toggleLang}>
          <span className={lang === 'hu' ? 'lang-active' : ''}>HU</span>
          <span className="lang-sep">/</span>
          <span className={lang === 'en' ? 'lang-active' : ''}>EN</span>
        </button>

        {/* Social ikonok a mobil menüben (a navbar sávban csak desktopon látszanak) */}
        {socials.length > 0 && (
          <div className="nav-mobile-socials">
            {socials.map((s, i) => (
              <a key={i} href={s.url} target="_blank" rel="noreferrer" aria-label={s.label}>
                <SocialIcon label={s.label} url={s.url} />
              </a>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
