import { useLang } from '../LangContext'
import { useSiteContent } from '../hooks'

// align kulcs → inline stílus a szöveg elemre
const alignStyle = (align) => {
  switch (align) {
    case 'center':       return { textAlign: 'center',  display: 'block' }
    case 'center-left':  return { textAlign: 'left',    display: 'block', paddingLeft: 'clamp(0px, 10%, 120px)' }
    case 'center-right': return { textAlign: 'right',   display: 'block', paddingRight: 'clamp(0px, 10%, 120px)' }
    case 'right':        return { textAlign: 'right',   display: 'block' }
    default:             return {}
  }
}

// size kulcs → font-size érték
const sizeStyle = (size) => {
  switch (size) {
    case 'small': return { fontSize: 'clamp(0.85rem, 2vw, 1rem)' }
    case 'large': return { fontSize: 'clamp(1.2rem, 3vw, 1.5rem)' }
    default:      return {}
  }
}

export default function Hero() {
  const { lang } = useLang()
  const { content } = useSiteContent()

  // Szövegek
  const line1    = content[`hero_line1_${lang}`]    || (lang === 'hu' ? 'Ahol a fény'   : 'Where the light')
  const line2    = content[`hero_line2_${lang}`]    || (lang === 'hu' ? 'meghal.'       : 'dies.')
  const subtitle = content[`hero_subtitle_${lang}`] || (lang === 'hu' ? 'Rendezvények, underground helyszínek, portrék és urbex — a képek, amelyek megmaradnak.' : 'Events, underground venues, portraits and urbex — images that stay with you.')
  const cta      = content[`hero_cta_${lang}`]      || (lang === 'hu' ? 'Portfólió megtekintése' : 'View Portfolio')
  const eyebrow  = lang === 'hu' ? 'Fotós & Videós' : 'Photographer & Videographer'

  // Igazítás és méret beállítások az adminból
  const line1Align    = content[`hero_line1_${lang}_align`]    || 'left'
  const line2Align    = content[`hero_line2_${lang}_align`]    || 'left'
  const subtitleAlign = content[`hero_subtitle_${lang}_align`] || 'left'
  const subtitleSize  = content[`hero_subtitle_${lang}_size`]  || 'normal'

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
          <span style={alignStyle(line1Align)}>{line1}</span>
          <span className="accent" style={alignStyle(line2Align)}>{line2}</span>
        </h1>

        <p
          className="hero-subtitle"
          style={{ ...alignStyle(subtitleAlign), ...sizeStyle(subtitleSize) }}
        >
          {subtitle}
        </p>

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
