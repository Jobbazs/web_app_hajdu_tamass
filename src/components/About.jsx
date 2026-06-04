import { useLang } from '../LangContext'
import { useSiteContent } from '../hooks'
import { OWNER } from '../data'

export default function About() {
  const { lang, t } = useLang()
  const { content } = useSiteContent()
  const a = t.about

  const bio1 = content[`about_bio1_${lang}`] || a.bio1
  const bio2 = content[`about_bio2_${lang}`] || a.bio2
  const bio3 = content[`about_bio3_${lang}`] || a.bio3

  return (
    <section id="about">
      <div className="container about-grid">
        <div className="about-img-frame">
          {OWNER.portraitUrl ? (
            <img src={OWNER.portraitUrl} alt={a.imgAlt} />
          ) : (
            <div className="about-img-placeholder">[ {a.imgAlt.toUpperCase()} ]</div>
          )}
        </div>
        <div>
          <div className="section-label">{a.label}</div>
          <h2 className="section-title">{a.title1}<br />{a.title2}</h2>
          <p className="body-text">{bio1}</p>
          <p className="body-text">{bio2}</p>
          <p className="body-text">{bio3}</p>
          <div className="about-tags">
            {a.tags.map(tag => <span key={tag} className="tag">{tag}</span>)}
          </div>
        </div>
      </div>
    </section>
  )
}
