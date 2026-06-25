import { useLang } from '../LangContext'
import { useCustomSections } from '../hooks'
import '../Styles/CustomSections.css'

const FONT_SIZE_MAP = {
  small:  'clamp(0.85rem, 1.8vw, 1rem)',
  normal: 'clamp(1rem, 2vw, 1.15rem)',
  large:  'clamp(1.15rem, 2.5vw, 1.4rem)',
}

const blockStyle = (align) => {
  switch (align) {
    case 'center-left':
      return { marginLeft: '25%', marginRight: '0',    textAlign: 'left',   width: '75%' }
    case 'center-right':
      return { marginLeft: '0',   marginRight: '25%',  textAlign: 'right',  width: '75%' }
    case 'center':
      return { marginLeft: 'auto', marginRight: 'auto', textAlign: 'center', width: '100%' }
    case 'right':
      return { marginLeft: 'auto', marginRight: '0',   textAlign: 'right',  width: '100%' }
    default:
      return { marginLeft: '0',   marginRight: 'auto', textAlign: 'left',   width: '100%' }
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

        const titleBlock = blockStyle(titleAlign)
        const bodyBlock  = blockStyle(bodyAlign)

        return (
          <section key={s.id} className="custom-section">
            <div className="container">

              {/* Cím – saját blokk igazítással */}
              {title && (
                <h2
                  className="custom-section-title"
                  style={{
                    ...titleBlock,
                    fontSize,
                    display: 'block',
                    marginBottom: '1.4rem',   /* ~5 szóköz */
                  }}
                >
                  {title}
                </h2>
              )}

              {/* Body – saját blokk igazítással */}
              {body && (
                <div
                  className="custom-section-body"
                  style={{
                    ...bodyBlock,
                    lineHeight: s.line_height || '1.75',
                    fontSize,
                    whiteSpace: 'pre-wrap',
                    display:    'block',
                  }}
                >
                  <PreservedText text={body} />
                </div>
              )}

              {/* Extra mezők – minden mező saját igazítással */}
              {fields.length > 0 && (
                <div className="custom-section-fields">
                  {fields.map((f, i) => {
                    const label  = lang === 'hu' ? f.label_hu : (f.label_en || f.label_hu)
                    const fAlign = f.align || bodyAlign
                    if (!f.value) return null
                    return (
                      <div
                        key={f.key || i}
                        className="custom-section-field"
                        style={{
                          ...blockStyle(fAlign),
                          display: 'block',
                        }}
                      >
                        {label && (
                          <span className="custom-section-field-label">{label}</span>
                        )}
                        <span
                          className="custom-section-field-value"
                          style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
                        >
                          {f.value}
                        </span>
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
