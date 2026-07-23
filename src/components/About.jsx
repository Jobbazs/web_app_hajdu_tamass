import { useLang } from '../LangContext'
import { useSiteContent } from '../hooks'
import { OWNER } from '../data'
import '../Styles/About.css'
import { cldThumb } from '../lib/portfolioPages'

const alignStyle = (align) => {
  switch (align) {
    case 'center':       return { textAlign: 'center' }
    case 'center-left':  return { textAlign: 'left',  paddingLeft:  'clamp(0px, 8%, 80px)' }
    case 'center-right': return { textAlign: 'right', paddingRight: 'clamp(0px, 8%, 80px)' }
    case 'right':        return { textAlign: 'right' }
    default:             return {}
  }
}

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

  const bio1 = content[`about_bio1_${lang}`] || a.bio1
  const bio2 = content[`about_bio2_${lang}`] || a.bio2
  const bio3 = content[`about_bio3_${lang}`] || a.bio3

  const bio1Align = content[`about_bio1_${lang}_align`] || 'left'
  const bio2Align = content[`about_bio2_${lang}_align`] || 'left'
  const bio3Align = content[`about_bio3_${lang}_align`] || 'left'

  const bio1Size  = content[`about_bio1_${lang}_size`]  || 'normal'
  const bio2Size  = content[`about_bio2_${lang}_size`]  || 'normal'
  const bio3Size  = content[`about_bio3_${lang}_size`]  || 'normal'

  const rawTags = content[`about_tags_${lang}`]
  const tags = rawTags
    ? rawTags.split(',').map(t => t.trim()).filter(Boolean)
    : a.tags

  // Portré URL – site_content-ből, fallback data.js OWNER-re
  const portraitUrl = content['about_portrait_url'] || OWNER.portraitUrl || ''

  return (
    <section id="about">
      <div className="container about-grid">
        <div className="about-img-frame">
          {portraitUrl ? (
            <img src={cldThumb(portraitUrl, 800)} alt={a.imgAlt} loading="lazy" decoding="async" />
          ) : (
            <div className="about-img-placeholder">[ {a.imgAlt.toUpperCase()} ]</div>
          )}
        </div>
        <div className="about-text">
          <div className="section-label">{a.label}</div>
          <h2 className="section-title">{a.title1}<br />{a.title2}</h2>
          <p className="body-text" style={{ ...alignStyle(bio1Align), ...sizeStyle(bio1Size) }}>{bio1}</p>
          <p className="body-text" style={{ ...alignStyle(bio2Align), ...sizeStyle(bio2Size) }}>{bio2}</p>
          <p className="body-text" style={{ ...alignStyle(bio3Align), ...sizeStyle(bio3Size) }}>{bio3}</p>
          <div className="about-tags">
            {tags.map(tag => <span key={tag} className="tag">{tag}</span>)}
          </div>
        </div>
      </div>
    </section>
  )
}
