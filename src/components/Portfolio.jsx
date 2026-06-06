import { useState, useCallback, useRef, useEffect } from 'react'
import { useLang } from '../LangContext'
import { usePortfolio, useCategories, useSiteContent } from '../hooks'
import MediaModal from './MediaModal'

export default function Portfolio() {
  const [active,   setActive]   = useState('all')
  const [selected, setSelected] = useState(null)
  const [isSticky, setIsSticky] = useState(false)

  const sectionRef   = useRef(null)
  const filterBarRef = useRef(null)
  const sentinelRef  = useRef(null)
  const bottomRef    = useRef(null)

  const { lang, t }                         = useLang()
  const { items, loading }                  = usePortfolio()
  const { categories, loading: catLoading } = useCategories()
  const { content }                         = useSiteContent()

  const f = t.portfolio.filters

  // Filter lista Supabase kategóriákból
  const FILTERS = [
    { key: 'all', label: f.all },
    ...categories.map(c => ({
      key:   c.slug,
      label: lang === 'hu' ? c.label_hu : c.label_en,
    })),
  ]

  // Grid mód per-filter – CMS-ből jön, fallback 'flex'
  // Kulcs: portfolio_grid_mode_all, portfolio_grid_mode_event, stb.
  const getMode = (filterKey) =>
    content[`portfolio_grid_mode_${filterKey}`] || 'flex'

  const currentMode = getMode(active)

  // ── Sticky logika ────────────────────────────────────────
  // sentinelRef: a filter bar eredeti helye (ha eltűnik → sticky ON)
  // bottomRef:   a section aljának jelzője (ha eltűnik → sticky OFF)
  useEffect(() => {
    const sentinel = sentinelRef.current
    const bottom   = bottomRef.current
    if (!sentinel || !bottom) return

    // Filter bar eltűnt a viewportból → sticky ON
    const topObserver = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) setIsSticky(true)
        else setIsSticky(false)
      },
      { threshold: 0, rootMargin: '-64px 0px 0px 0px' }
    )

    // Section alja eltűnt a viewportból alulra → sticky OFF
    const bottomObserver = new IntersectionObserver(
      ([entry]) => {
        // Ha a section alja már nem látható (feljebb görgettünk) → ne legyen sticky
        if (!entry.isIntersecting && entry.boundingClientRect.top > 0) {
          setIsSticky(false)
        }
      },
      { threshold: 0 }
    )

    topObserver.observe(sentinel)
    bottomObserver.observe(bottom)
    return () => {
      topObserver.disconnect()
      bottomObserver.disconnect()
    }
  }, [])

  // Normalizálás
  const normalized = items.map(item => ({
    ...item,
    cloudinaryUrl: item.cloudinary_url,
    videoUrl:      item.video_url,
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
      <section id="portfolio" ref={sectionRef}>
        <div className="container">

          {/* Header */}
          <div className="portfolio-header">
            <div>
              <div className="section-label">{t.portfolio.label}</div>
              <h2 className="section-title">{t.portfolio.title}</h2>
            </div>
          </div>

          {/* Sentinel – itt van a filter bar eredeti helye */}
          <div ref={sentinelRef} style={{ height: 1, marginBottom: 0 }} />

          {/* Filter sáv */}
          <div
            ref={filterBarRef}
            className={`portfolio-filter-bar ${isSticky ? 'portfolio-filter-bar--sticky' : ''}`}
          >
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

            {/* Grid mód jelző – csak olvasható, CMS-ben állítható */}
            <div className="port-mode-indicator">
              <span className={`port-mode-chip ${currentMode === 'flex' ? 'active' : ''}`}>
                FlexiGrid
              </span>
              <span className={`port-mode-chip ${currentMode === 'ratio' ? 'active' : ''}`}>
                FixRatio
              </span>
            </div>
          </div>

          {/* Placeholder – megakadályozza hogy a grid feljebb ugorjon sticky-nél */}
          {isSticky && <div style={{ height: 48 }} />}

          {/* Grid */}
          {loading || catLoading ? (
            <div className="port-loading">Betöltés...</div>
          ) : visible.length === 0 ? (
            <div className="port-loading">Nincs elem ebben a kategóriában.</div>
          ) : currentMode === 'ratio' ? (
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
                    <img src={item.cloudinaryUrl} alt={item.title} loading="lazy" />
                  ) : (
                    <div className="port-placeholder">{item.title}</div>
                  )}
                  <div className="port-overlay">
                    <span className="port-label">{item.title}</span>
                    {item.categorySlug === 'video' && <span className="port-play-icon">▶</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
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
                      {item.categorySlug === 'video' && <span className="port-play-icon">▶</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Bottom sentinel – sticky megáll itt */}
          <div ref={bottomRef} style={{ height: 1 }} />

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
