import { useState, useEffect } from 'react'
import { OWNER } from '../data'
import { useLang } from '../LangContext'
import '../Styles/Navbar.css'

export default function Navbar({ subpage = false }) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { lang, t, toggleLang } = useLang()

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
    { id: 'contact',   label: t.nav.contact },
  ]

  return (
    <>
      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        {/* Logo */}
        <div
          className="nav-logo"
          onClick={goHome}
          role="button"
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && goHome()}
        >
          {OWNER.nameShort}<span className="logo-accent">.</span>
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
      </div>
    </>
  )
}
