import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useLang } from '../LangContext'
import { usePortfolio, useCategories, useSiteContent } from '../hooks'
import MediaModal from './MediaModal'

const shuffle = (arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ── Képek rendezése FixRatio gridhez ────────────────────────
// Probléma: fekvő kép (span 2) + páratlan számú álló → lyuk
// Megoldás: az items-t úgy rendezzük át hogy fekvő képek
// mindig párban legyenek (egymás mellett), és ne okozzanak lyukat.
// Ezt előre nem tudjuk (arány nincs a DB-ben), de a rácsot
// CSS subgrid + auto-placement dense-sel kezeljük.
// A kulcstrükk: a fekvő képeket inline style-lal kezelve
// az order CSS tulajdonsággal rendezzük a cellák pozícióját.

// ── RatioGrid komponens – belső state a mért arányokhoz ─────
function RatioGrid({ items, onSelect }) {
  // { itemId: 'landscape' | 'portrait' }
  const [ratios, setRatios] = useState({})

  const handleLoad = (e, itemId) => {
    const img   = e.currentTarget
    const ratio = img.naturalWidth / img.naturalHeight
    const type  = ratio > 1.15 ? 'landscape' : 'portrait'
    setRatios(prev => {
      if (prev[itemId] === type) return prev   // ne triggereljen felesleges renderelést
      return { ...prev, [itemId]: type }
    })
  }

  // Miután minden arány ismert, rendezzük a cellákat:
  // Álló képek → span 1, fekvő képek → span 2
  // A grid 4 oszlopos. Ha egy fekvő kép (span 2) után 1 álló kép marad
  // az adott sorban (2 cella szabad volt, de csak 1 kell) → lyuk.
  // Megoldás: a képeket ÚJRARENDEZZÜK: álló képek, majd fekvők párban.
  const sortedItems = useMemo(() => {
    const knownCount = Object.keys(ratios).length
    if (knownCount < items.length) return items  // még nem mértünk mindent

    const portraits  = items.filter(i => ratios[i.id] !== 'landscape')
    const landscapes = items.filter(i => ratios[i.id] === 'landscape')

    // Fekvő képeket párba rendezzük
    // Ha páratlan számú fekvő van → az utolsót portraitnak kezeljük (span 1)
    const pairedLandscapes = landscapes.length % 2 === 0
      ? landscapes
      : [...landscapes.slice(0, -1)]   // utolsó fekvőt kihagyjuk a span-2-ből
    const oddLandscape = landscapes.length % 2 === 1
      ? [landscapes[landscapes.length - 1]]
      : []

    // Elrendezés: álló képek + páratlan fekvő (mint portrait) + páros fekvők párban
    return [...portraits, ...oddLandscape, ...pairedLandscapes]
  }, [ratios, items])

  return (
    <>
      {sortedItems.map(item => {
        const isLandscape = ratios[item.id] === 'landscape'
        const known       = ratios[item.id] !== undefined
        const src         = item.cloudinaryUrl

        return (
          <div
            key={item.id}
            className={`port-acc-item port-acc-item--ratio ${isLandscape && known ? 'port-acc-item--landscape' : ''}`}
            onClick={() => onSelect(item)}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && onSelect(item)}
          >
            {src ? (
              <>
                <div
                  className="port-acc-blur-bg"
                  style={{ backgroundImage: `url(${src})` }}
                  aria-hidden="true"
                />
                <img
                  src={src}
                  alt={item.title}
                  loading="lazy"
                  className="port-acc-img--ratio"
                  onLoad={e => handleLoad(e, item.id)}
                />
              </>
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
    </>
  )
}

// ── CategoryAccordion ────────────────────────────────────────
function CategoryAccordion({ category, items, isOpen, onToggle, onSelect, gridMode, lang }) {
  const label = lang === 'hu' ? category.label_hu : category.label_en

  return (
    <div className={`port-accordion ${isOpen ? 'port-accordion--open' : ''}`}>
      <button
        className="port-accordion-header"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <span className="port-accordion-name">{label}</span>
        <span className="port-accordion-meta">
          <span className="port-accordion-count">{items.length} kép</span>
          <span className="port-accordion-arrow">{isOpen ? '▲' : '▼'}</span>
        </span>
      </button>

      {isOpen && (
        gridMode === 'ratio' ? (
          // FixRatio: a grid konténer maga tartalmazza a cellákat
          <div className="port-accordion-grid--ratio">
            <RatioGrid items={items} onSelect={onSelect} />
          </div>
        ) : (
          // FlexiGrid: fix magasságú rács
          <div className="port-accordion-grid">
            {items.map(item => {
              const src = item.cloudinaryUrl
              return (
                <div
                  key={item.id}
                  className="port-acc-item"
                  onClick={() => onSelect(item)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && onSelect(item)}
                >
                  {src ? (
                    <img
                      src={src}
                      alt={item.title}
                      loading="lazy"
                      className="port-acc-img--flex"
                    />
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
        )
      )}
    </div>
  )
}

// ── Főkomponens ──────────────────────────────────────────────
export default function Portfolio() {
  const [openCat, setOpenCat] = useState('all')
  const [selected, setSelected] = useState(null)

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

  const getLimit = (key) => parseInt(content[`portfolio_limit_${key}`]) || (key === 'all' ? 10 : 15)
  const getMode  = (key) => content[`portfolio_grid_mode_${key}`] || 'flex'

  const normalized = useMemo(() => items.map(item => ({
    ...item,
    cloudinaryUrl: item.cloudinary_url,
    videoUrl:      item.video_url,
    categorySlug:  item.portfolio_categories?.slug || item.category || '',
  })), [items])

  const allItems = useMemo(() => {
    const limit = getLimit('all')
    return shuffle(normalized).slice(0, limit)
  }, [normalized, content])

  const getItemsForCat = useCallback((slug) => {
    const limit = getLimit(slug)
    return normalized.filter(i => i.categorySlug === slug).slice(0, limit)
  }, [normalized, content])

  const toggleCat = (key) => {
    setOpenCat(prev => prev === key ? null : key)
  }

  // Modal: csak az aktív kategória képei
  const visibleForModal = useMemo(() => {
    if (!openCat) return normalized
    if (openCat === 'all') return allItems
    return getItemsForCat(openCat)
  }, [openCat, allItems, normalized, getItemsForCat])

  const closeModal = () => setSelected(null)

  const goNext = useCallback(() => {
    if (!selected) return
    const idx = visibleForModal.findIndex(i => i.id === selected.id)
    if (idx === -1) return
    setSelected(visibleForModal[(idx + 1) % visibleForModal.length])
  }, [selected, visibleForModal])

  const goPrev = useCallback(() => {
    if (!selected) return
    const idx = visibleForModal.findIndex(i => i.id === selected.id)
    if (idx === -1) return
    setSelected(visibleForModal[(idx - 1 + visibleForModal.length) % visibleForModal.length])
  }, [selected, visibleForModal])

  return (
    <>
      <section id="portfolio">
        <div className="container">
          <div className="portfolio-header">
            <div>
              <div className="section-label">{t.portfolio.label}</div>
              <h2 className="section-title">{t.portfolio.title}</h2>
            </div>
          </div>

          {(loading || catLoading) ? (
            <div className="port-loading">Betöltés...</div>
          ) : (
            <div className="port-accordion-list">
              {/* Mind */}
              <CategoryAccordion
                category={{ label_hu: 'Mind', label_en: 'All', slug: 'all' }}
                items={allItems}
                isOpen={openCat === 'all'}
                onToggle={() => toggleCat('all')}
                onSelect={setSelected}
                gridMode={getMode('all')}
                lang={lang}
              />
              {/* Kategóriák */}
              {categories.map(cat => (
                <CategoryAccordion
                  key={cat.id}
                  category={cat}
                  items={getItemsForCat(cat.slug)}
                  isOpen={openCat === cat.slug}
                  onToggle={() => toggleCat(cat.slug)}
                  onSelect={setSelected}
                  gridMode={getMode(cat.slug)}
                  lang={lang}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <MediaModal
        item={selected}
        items={visibleForModal}
        onClose={closeModal}
        onNext={goNext}
        onPrev={goPrev}
      />
    </>
  )
}
