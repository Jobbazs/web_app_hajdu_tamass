import { useLang } from '../LangContext'
import { useCustomSections } from '../hooks'

const FONT_SIZE_MAP = {
  small:  'clamp(0.85rem, 1.8vw, 1rem)',
  normal: 'clamp(1rem, 2vw, 1.15rem)',
  large:  'clamp(1.15rem, 2.5vw, 1.4rem)',
}

// align érték → CSS stílus objektum
const alignToStyle = (align) => {
  switch (align) {
    case 'center':       return { textAlign: 'center', marginLeft: 'auto', marginRight: 'auto', width: '100%' }
    case 'center-left':  return { textAlign: 'left',   marginLeft: '0',    marginRight: 'auto', maxWidth: '75%' }
    case 'center-right': return { textAlign: 'right',  marginLeft: 'auto', marginRight: '0',    maxWidth: '75%' }
    case 'right':        return { textAlign: 'right',  marginLeft: 'auto', marginRight: '0',    width: '100%' }
    default:             return { textAlign: 'left',   width: '100%' }
  }
}

// Szöveg sortöréssel
function PreservedText({ text }) {
  if (!text) return null
  return (
    <>
      {text.split('\n').map((line, i, arr) => (
        <span key={i}>
          {line}
          {i < arr.length - 1 && <br />}
        </span>
      ))}
    </>
  )
}

export default function CustomSections() {
  const { lang }             = useLang()
  const { sections, loading } = useCustomSections()

  if (loading || sections.length === 0) return null

  return (
    <>
      {sections.map(s => {
        const title     = lang === 'hu' ? s.title_hu : (s.title_en || s.title_hu)
        const body      = lang === 'hu' ? s.body_hu  : (s.body_en  || s.body_hu)
        const fontSize  = FONT_SIZE_MAP[s.font_size || 'normal']
        const titleAlign = s.title_align || s.align || 'left'
        const bodyAlign  = s.body_align  || s.align || 'left'
        const fields     = Array.isArray(s.fields) ? s.fields : []

        return (
          <section key={s.id} className="custom-section">
            <div className="container">

              {/* Cím – saját igazítással */}
              {title && (
                <h2
                  className="custom-section-title"
                  style={{ ...alignToStyle(titleAlign), fontSize }}
                >
                  {title}
                </h2>
              )}

              {/* Body szöveg – saját igazítással, sortörésekkel */}
              {body && (
                <div
                  className="custom-section-body"
                  style={{
                    ...alignToStyle(bodyAlign),
                    lineHeight:    s.line_height || '1.75',
                    fontSize,
                    whiteSpace:    'pre-wrap',
                  }}
                >
                  <PreservedText text={body} />
                </div>
              )}

              {/* Extra mezők */}
              {fields.length > 0 && (
                <div className="custom-section-fields">
                  {fields.map((f, i) => {
                    const label = lang === 'hu' ? f.label_hu : (f.label_en || f.label_hu)
                    if (!f.value) return null
                    return (
                      <div
                        key={f.key || i}
                        className="custom-section-field"
                        style={alignToStyle(f.align || bodyAlign)}
                      >
                        {label && (
                          <span className="custom-section-field-label">{label}</span>
                        )}
                        <span className="custom-section-field-value">{f.value}</span>
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
