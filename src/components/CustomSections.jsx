import { useLang } from '../LangContext'
import { useCustomSections } from '../hooks'

const FONT_SIZE_MAP = {
  small:  'clamp(0.85rem, 1.8vw, 1rem)',
  normal: 'clamp(1rem, 2vw, 1.15rem)',
  large:  'clamp(1.15rem, 2.5vw, 1.4rem)',
}

// Wrapper konténer igazítása (justify-content)
const wrapperStyle = (align) => {
  switch (align) {
    case 'center':       return { display: 'flex', justifyContent: 'center' }
    case 'center-left':  return { display: 'flex', justifyContent: 'flex-start', paddingLeft:  'clamp(0px, 15%, 180px)' }
    case 'center-right': return { display: 'flex', justifyContent: 'flex-end',   paddingRight: 'clamp(0px, 15%, 180px)' }
    case 'right':        return { display: 'flex', justifyContent: 'flex-end' }
    default:             return { display: 'block' }
  }
}

// Szöveg igazítása a tartalmon belül
const textStyle = (align) => {
  switch (align) {
    case 'center':       return { textAlign: 'center' }
    case 'center-left':  return { textAlign: 'left' }
    case 'center-right': return { textAlign: 'right' }
    case 'right':        return { textAlign: 'right' }
    default:             return { textAlign: 'left' }
  }
}

function PreservedText({ text }) {
  if (!text) return null
  return (
    <>
      {text.split('\n').map((line, i, arr) => (
        <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
      ))}
    </>
  )
}

export default function CustomSections() {
  const { lang }              = useLang()
  const { sections, loading } = useCustomSections()

  if (loading || sections.length === 0) return null

  return (
    <>
      {sections.map(s => {
        const title      = lang === 'hu' ? s.title_hu : (s.title_en || s.title_hu)
        const body       = lang === 'hu' ? s.body_hu  : (s.body_en  || s.body_hu)
        const fontSize   = FONT_SIZE_MAP[s.font_size || 'normal']
        const titleAlign = s.title_align || s.align || 'left'
        const bodyAlign  = s.body_align  || s.align || 'left'
        const fields     = Array.isArray(s.fields) ? s.fields : []

        return (
          <section key={s.id} className="custom-section">
            <div className="container">

              {/* Cím */}
              {title && (
                <div style={wrapperStyle(titleAlign)}>
                  <h2 className="custom-section-title" style={{ ...textStyle(titleAlign), fontSize }}>
                    {title}
                  </h2>
                </div>
              )}

              {/* Body */}
              {body && (
                <div style={wrapperStyle(bodyAlign)}>
                  <div
                    className="custom-section-body"
                    style={{
                      ...textStyle(bodyAlign),
                      lineHeight:  s.line_height || '1.75',
                      fontSize,
                      whiteSpace:  'pre-wrap',
                    }}
                  >
                    <PreservedText text={body} />
                  </div>
                </div>
              )}

              {/* Extra mezők */}
              {fields.length > 0 && (
                <div className="custom-section-fields">
                  {fields.map((f, i) => {
                    const label = lang === 'hu' ? f.label_hu : (f.label_en || f.label_hu)
                    const fAlign = f.align || bodyAlign
                    if (!f.value) return null
                    return (
                      <div key={f.key || i} style={wrapperStyle(fAlign)}>
                        <div className="custom-section-field" style={textStyle(fAlign)}>
                          {label && <span className="custom-section-field-label">{label}</span>}
                          <span
                            className="custom-section-field-value"
                            style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
                          >
                            {f.value}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

            </div>
          </section>
        )
      })}
    </>
  )
}
