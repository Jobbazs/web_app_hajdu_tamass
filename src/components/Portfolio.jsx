import { useState, useCallback, useRef, useEffect } from 'react'
import { useLang } from '../LangContext'
import { usePortfolio, useCategories } from '../hooks'
import MediaModal from './MediaModal'

// Grid mód: 'flex' = eredeti grid fix magassággal, 'ratio' = képarány megtartva
const GRID_MODES = {
  flex:  { hu: 'FlexiGrid', en: 'FlexiGrid' },
  ratio: { hu: 'FixRatio',  en: 'FixRatio'  },
}

export default function Portfolio() {
  const [active,     setActive]     = useState('all')
  const [selected,   setSelected]   = useState(null)
  // gridMode: per-filter beállítás { all: 'flex', event: 'ratio', ... }
  const [gridModes,  setGridModes]  = useState({})
  const [showModeMenu, setShowModeMenu] = useState(false)
  const filterRef = useRef(null)
  const [isSticky, setIsSticky]     = useState(false)

  const { lang, t }                          = useLang()
  const { items, loading }                   = usePortfolio()
  const { categories, loading: catLoading }  = useCategories()
  const f = t.portfolio.filters

  // Filter lista
  const FILTERS = [
    { key: 'all', label: f.all },
    ...categories.map(c => ({
      key:   c.slug,
      label: lang === 'hu' ? c.label_hu : c.label_en,
    })),
  ]

  // Aktív grid mód az aktuális filterre
  const currentMode = gridModes[active] || 'flex'

  const setModeForFilter = (filterKey, mode) => {
    setGridModes(prev => ({ ...prev, [filterKey]: mode }))
    setShowModeMenu(false)
  }

  // Sticky filter figyelő
  useEffect(() => {
    const sentinel = document.getElementById('portfolio-sentinel')
    if (!sentinel) return
    const observer = new IntersectionObserver(
      ([entry]) => setIsSticky(!entry.isIntersecting),
      { threshold: 0, rootMargin: '-70px 0px 0px 0px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [])

  // Kategória alapján szűrés – slug alapú matching
  const normalized = items.map(item => ({
    ...item,
    cloudinaryUrl: item.cloudinary_url,
    videoUrl:      item.video_url,
    // category_slug: join-ból vagy direkt slug mező
    categorySlug:  item.portfolio_categories?.slug || item.category || '',
  }))

  const visible = active === 'all'
    ? normalized
    : normalized.filter(i => i.categorySlug === active)

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

          {/* Sentinel – sticky érzékelő pont */}
          <div id="portfolio-sentinel" style={{ height: 1 }} />

          {/* Header */}
          <div className="portfolio-header">
            <div>
              <div className="section-label">{t.portfolio.label}</div>
              <h2 className="section-title">{t.portfolio.title}</h2>
            </div>
          </div>

          {/* Filter sáv – sticky lesz görgetéskor */}
          <div className={`portfolio-filter-bar ${isSticky ? 'portfolio-filter-bar--sticky' : ''}`} ref={filterRef}>
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

            {/* Grid mód kapcsoló */}
            <div className="port-mode-wrap">
              <button
                className={`port-mode-btn ${currentMode === 'flex' ? 'active' : ''}`}
                onClick={() => setModeForFilter(active, 'flex')}
                title="FlexiGrid – fix magasságú rácsos nézet"
              >
                FlexiGrid
              </button>
              <button
                className={`port-mode-btn ${currentMode === 'ratio' ? 'active' : ''}`}
                onClick={() => setModeForFilter(active, 'ratio')}
                title="FixRatio – képarány megtartva"
              >
                FixRatio
              </button>
            </div>
          </div>

          {/* Grid */}
          {loading || catLoading ? (
            <div className="port-loading">Betöltés...</div>
          ) : visible.length === 0 ? (
            <div className="port-loading">Nincs elem ebben a kategóriában.</div>
          ) : currentMode === 'ratio' ? (
            // ── FixRatio nézet: masonry-szerű, képarány megtartva ──
            <div className="portfolio-ratio-grid">
              {visible.map(item => (
                <div
                  key={item.id}
                  className="port-ratio-item"
                  onClick={() => setSelected(item)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && setSelected(item)}
                >
                  {item.cloudinaryUrl ? (
                    <img
                      src={item.cloudinaryUrl}
                      alt={item.title}
                      loading="lazy"
                    />
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
          ) : (
            // ── FlexiGrid nézet: eredeti 12-oszlopos grid ──
            <div className="portfolio-grid">
              {visible.map(item => {
                const spanClass = {
                  large:  'port-item-large',
                  medium: 'port-item-medium',
                  small:  'port-item-small',
                }[item.span] || 'port-item-medium'

                return (
                  <div
                    key={item.id}
                    className={`port-item ${spanClass}`}
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
                )
              })}
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
