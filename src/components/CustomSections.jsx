import { useLang } from '../LangContext'
import { useCustomSections } from '../hooks'

const ALIGN_MAP = {
  'left':         { textAlign: 'left',   marginLeft: '0',    marginRight: 'auto' },
  'center-left':  { textAlign: 'left',   marginLeft: '0',    marginRight: 'auto', maxWidth: '75%' },
  'center':       { textAlign: 'center', marginLeft: 'auto', marginRight: 'auto' },
  'center-right': { textAlign: 'right',  marginLeft: 'auto', marginRight: '0',    maxWidth: '75%' },
  'right':        { textAlign: 'right',  marginLeft: 'auto', marginRight: '0' },
}

const FONT_SIZE_MAP = {
  small:  'clamp(0.85rem, 1.8vw, 1rem)',
  normal: 'clamp(1rem, 2vw, 1.15rem)',
  large:  'clamp(1.15rem, 2.5vw, 1.4rem)',
}

export default function CustomSections() {
  const { lang } = useLang()
  const { sections, loading } = useCustomSections()

  if (loading || sections.length === 0) return null

  return (
    <>
      {sections.map(s => {
        const title = lang === 'hu' ? s.title_hu : (s.title_en || s.title_hu)
        const body  = lang === 'hu' ? s.body_hu  : (s.body_en  || s.body_hu)
        const align = ALIGN_MAP[s.align] || ALIGN_MAP.left

        return (
          <section key={s.id} className="custom-section">
            <div className="container">
              <div
                className="custom-section-inner"
                style={{
                  ...align,
                  lineHeight: s.line_height,
                  fontSize:   FONT_SIZE_MAP[s.font_size] || FONT_SIZE_MAP.normal,
                }}
              >
                {title && (
                  <h2 className="custom-section-title">{title}</h2>
                )}
                {/* Sortörések megőrzése */}
                <div className="custom-section-body">
                  {body.split('\n').map((line, i) => (
                    <span key={i}>
                      {line}
                      {i < body.split('\n').length - 1 && <br />}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )
      })}
    </>
  )
}
