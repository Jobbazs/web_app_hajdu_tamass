import { useLang } from '../LangContext'
import { useSiteContent } from '../hooks'
import { OWNER } from '../data'
import '../Styles/About.css'

// align kulcs → textAlign + esetleges eltolás
const alignStyle = (align) => {
  switch (align) {
    case 'center':       return { textAlign: 'center' }
    case 'center-left':  return { textAlign: 'left',  paddingLeft:  'clamp(0px, 8%, 80px)' }
    case 'center-right': return { textAlign: 'right', paddingRight: 'clamp(0px, 8%, 80px)' }
    case 'right':        return { textAlign: 'right' }
    default:             return {}
  }
}

// size kulcs → font-size
const sizeStyle = (size) => {
  switch (size) {
    case 'small': return { fontSize: '0.9rem',  lineHeight: '1.6' }
    case 'large': return { fontSize: '1.25rem', lineHeight: '1.8' }
    default:      return {}
  }
}

export default function About() {
  const { lang, t }  = useLang()
  const { content }  = useSiteContent()
  const a = t.about

  // Szövegek
  const bio1 = content[`about_bio1_${lang}`] || a.bio1
  const bio2 = content[`about_bio2_${lang}`] || a.bio2
  const bio3 = content[`about_bio3_${lang}`] || a.bio3

  // Igazítás beállítások az adminból
  const bio1Align = content[`about_bio1_${lang}_align`] || 'left'
  const bio2Align = content[`about_bio2_${lang}_align`] || 'left'
  const bio3Align = content[`about_bio3_${lang}_align`] || 'left'

  // Betűméret beállítások az adminból
  const bio1Size  = content[`about_bio1_${lang}_size`]  || 'normal'
  const bio2Size  = content[`about_bio2_${lang}_size`]  || 'normal'
  const bio3Size  = content[`about_bio3_${lang}_size`]  || 'normal'

  return (
    <section id="about">
      <div className="container about-grid">

        {/* Kép */}
        <div className="about-img-frame">
          {OWNER.portraitUrl ? (
            <img src={OWNER.portraitUrl} alt={a.imgAlt} />
          ) : (
            <div className="about-img-placeholder">[ {a.imgAlt.toUpperCase()} ]</div>
          )}
        </div>

        {/* Szöveg */}
        <div className="about-text">
          <div className="section-label">{a.label}</div>
          <h2 className="section-title">{a.title1}<br />{a.title2}</h2>

          <p
            className="body-text"
            style={{ ...alignStyle(bio1Align), ...sizeStyle(bio1Size) }}
          >
            {bio1}
          </p>
          <p
            className="body-text"
            style={{ ...alignStyle(bio2Align), ...sizeStyle(bio2Size) }}
          >
            {bio2}
          </p>
          <p
            className="body-text"
            style={{ ...alignStyle(bio3Align), ...sizeStyle(bio3Size) }}
          >
            {bio3}
          </p>

          <div className="about-tags">
            {a.tags.map(tag => <span key={tag} className="tag">{tag}</span>)}
          </div>
        </div>

      </div>
    </section>
  )
}
