import { useState, useCallback, useRef, useEffect } from 'react'
import { useLang } from '../LangContext'
import { usePortfolio, useCategories, useSiteContent } from '../hooks'
import MediaModal from './MediaModal'

// Navbar magassága – a CSS --navbar-height változóból olvassuk
// Így mindig szinkronban van a CSS-sel, nem kell kézzel igazítani
const getNavbarH = () => {
  const val = getComputedStyle(document.documentElement)
    .getPropertyValue('--navbar-height')
    .trim()
  return parseInt(val) || 81
}

export default function Portfolio() {
  const [active,   setActive]   = useState('all')
  const [selected, setSelected] = useState(null)
  const [isSticky, setIsSticky] = useState(false)

  const sectionRef   = useRef(null)
  const filterBarRef = useRef(null)
  // filterBarHeight: az eredeti filter sáv magassága (placeholder-hez kell)
  const filterBarH   = useRef(48)

  const { lang, t }                         = useLang()
  const { items, loading }                  = usePortfolio()
  const { categories, loading: catLoading } = useCategories()
  const { content }                         = useSiteContent()

  const f = t.portfolio.filters

  const FILTERS = [
    { key: 'all', label: f.all },
    ...categories.map(c => ({
      key:   c.slug,
      label: lang === 'hu' ? c.label_hu : c.label_en,
    })),
  ]

  // Filter váltás – scroll pozíció rögzítve, nem ugrik sehova
  const handleFilterClick = (key) => {
    const scrollY = window.scrollY
    setActive(key)
    setSelected(null)
    // Következő frame-ben visszaállítjuk – megakadályozza az ugrást
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo({ top: scrollY, behavior: 'instant' })
      })
    })
  }

  const getMode = (filterKey) =>
    content[`portfolio_grid_mode_${filterKey}`] || 'flex'
  const currentMode = getMode(active)

  // ── Sticky logika scroll alapon ──────────────────────────
  // A filter sáv sticky legyen amíg a section látható,
  // de NE ragadjon a section alá, és NE legyen sticky a section felett.
  useEffect(() => {
    const handleScroll = () => {
      const section    = sectionRef.current
      const filterBar  = filterBarRef.current
      if (!section || !filterBar) return

      // Aktuális magasság mentése (responsive változhat)
      if (!isSticky) filterBarH.current = filterBar.offsetHeight

      const sectionRect = section.getBoundingClientRect()

      // A filter bar eredeti pozíciója a section-ön belül:
      // navbar alatti pont ahol a sticky-nek be kellene kapcsolnia
      // = section top + portfolio-header magassága
      // Egyszerűbb: sticky ON ha a section teteje a navbar alá kerül
      const navH = getNavbarH()
      const sectionTopUnderNav = sectionRect.top - navH

      // Section alja – ha ez a navbar alá kerül, a sticky-nek ki kell kapcsolni
      const sectionBottomUnderNav = sectionRect.bottom - navH - filterBarH.current

      if (sectionTopUnderNav < 0 && sectionBottomUnderNav > 0) {
        // A section látható, a teteje már a navbar alatt → sticky ON
        setIsSticky(true)
      } else {
        // Section felett vagyunk VAGY section alján túl vagyunk → sticky OFF
        setIsSticky(false)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    // Azonnal lefuttatjuk hogy az oldalra navigálásnál is helyes legyen
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isSticky])

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

          {/* Portfolio cím – sticky filter FELETT, ez nem sticky */}
          <div className="portfolio-header">
            <div>
              <div className="section-label">{t.portfolio.label}</div>
              <h2 className="section-title">{t.portfolio.title}</h2>
            </div>
          </div>

          {/* Placeholder – csak sticky módban veszi fel a filter sáv magasságát,
              hogy a grid ne ugorjon fel amikor a filter sáv kikerül a flow-ból */}
          {isSticky && (
            <div style={{ height: filterBarH.current, display: 'block' }} />
          )}

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
                  onClick={() => handleFilterClick(key)}
                >
                  {label}
                </button>
              ))}
            </div>
            {/* Grid mód chip – csak vizuális jelző, nem kattintható */}
            {/* {currentMode === 'ratio' && (
              <span className="port-mode-chip-solo">FixRatio</span>
            )} */}
          </div>

          {/* Grid */}
          {loading || catLoading ? (
            <div className="port-loading">Betöltés...</div>
          ) : visible.length === 0 ? (
            <div className="port-empty">
              <span>{lang === 'hu' ? 'Hamarosan feltöltöm a képeket.' : 'Photos coming soon.'}</span>
            </div>
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
