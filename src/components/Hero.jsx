import { useLang } from '../LangContext'
import { useSiteContent } from '../hooks'

export default function Hero() {
  const { lang } = useLang()
  const { content, loading } = useSiteContent()

  // Supabase-ből jönnek, fallback a LangContext értékekre
  const line1    = content[`hero_line1_${lang}`]    || (lang === 'hu' ? 'Ahol a fény'   : 'Where the light')
  const line2    = content[`hero_line2_${lang}`]    || (lang === 'hu' ? 'meghal.'       : 'dies.')
  const subtitle = content[`hero_subtitle_${lang}`] || (lang === 'hu' ? 'Rendezvények, underground helyszínek, portrék és urbex — a képek, amelyek megmaradnak.' : 'Events, underground venues, portraits and urbex — images that stay with you.')
  const cta      = content[`hero_cta_${lang}`]      || (lang === 'hu' ? 'Portfólió megtekintése' : 'View Portfolio')
  const eyebrow  = lang === 'hu' ? 'Fotós & Videós' : 'Photographer & Videographer'

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section id="hero">
      <div className="hero-bg" />
      <div className="hero-year">EST. 2019 — BUDAPEST</div>
      <div className="hero-content">
        <div className="hero-eyebrow">{eyebrow}</div>
        <h1 className="hero-title">
          {line1}<br />
          <span className="accent">{line2}</span>
        </h1>
        <p className="hero-subtitle">{subtitle}</p>
        <button className="hero-cta" onClick={() => scrollTo('portfolio')}>
          <span>{cta}</span>
        </button>
      </div>
      <div className="scroll-hint">
        <span>{lang === 'hu' ? 'Görgess' : 'Scroll'}</span>
      </div>
    </section>
  )
}
