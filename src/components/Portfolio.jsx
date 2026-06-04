import { useState, useCallback } from 'react'
import { useLang } from '../LangContext'
import { usePortfolio } from '../hooks'
import MediaModal from './MediaModal'

const SPAN_CLASS = {
  large:  'port-item-large',
  medium: 'port-item-medium',
  small:  'port-item-small',
}

export default function Portfolio() {
  const [active,   setActive]   = useState('all')
  const [selected, setSelected] = useState(null)
  const { t } = useLang()
  const { items, loading } = usePortfolio()
  const f = t.portfolio.filters

  const FILTERS = [
    { key: 'all',      label: f.all },
    { key: 'event',    label: f.event },
    { key: 'portrait', label: f.portrait },
    { key: 'video',    label: f.video },
    { key: 'urbex',    label: f.urbex },
  ]

  // Supabase snake_case → camelCase igazítás a modal számára
  const normalized = items.map(item => ({
    ...item,
    cloudinaryUrl: item.cloudinary_url,
    videoUrl:      item.video_url,
  }))

  const visible = active === 'all'
    ? normalized
    : normalized.filter(i => i.category === active)

  const closeModal = () => setSelected(null)

  const goNext = useCallback(() => {
    if (!selected) return
    const idx = visible.findIndex(i => i.id === selected.id)
    setSelected(visible[(idx + 1) % visible.length])
  }, [selected, visible])

  const goPrev = useCallback(() => {
    if (!selected) return
    const idx = visible.findIndex(i => i.id === selected.id)
    setSelected(visible[(idx - 1 + visible.length) % visible.length])
  }, [selected, visible])

  return (
    <>
      <section id="portfolio">
        <div className="container">
          <div className="portfolio-header">
            <div>
              <div className="section-label">{t.portfolio.label}</div>
              <h2 className="section-title">{t.portfolio.title}</h2>
            </div>
            <div className="portfolio-filters">
              {FILTERS.map(({ key, label }) => (
                <button
                  key={key}
                  className={`filter-btn ${active === key ? 'active' : ''}`}
                  onClick={() => { setActive(key); setSelected(null) }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="port-loading">Betöltés...</div>
          ) : (
            <div className="portfolio-grid">
              {visible.map(item => (
                <div
                  key={item.id}
                  className={`port-item ${SPAN_CLASS[item.span] || 'port-item-medium'}`}
                  onClick={() => setSelected(item)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && setSelected(item)}
                >
                  {item.cloudinaryUrl ? (
                    <img src={item.cloudinaryUrl} alt={item.title} loading="lazy" />
                  ) : (
                    <div className="port-placeholder">{item.title}</div>
                  )}
                  <div className="port-overlay">
                    <span className="port-label">{item.title}</span>
                    {item.category === 'video' && <span className="port-play-icon">▶</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <MediaModal
        item={selected}
        items={visible}
        onClose={closeModal}
        onNext={goNext}
        onPrev={goPrev}
      />
    </>
  )
}
