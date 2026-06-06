import { useState, useCallback, useMemo } from 'react'
import { useLang } from '../LangContext'
import { usePortfolio, useCategories, useSiteContent } from '../hooks'
import MediaModal from './MediaModal'

// Véletlen keverés – Fisher-Yates
const shuffle = (arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Egy accordion mappa kártya
function CategoryAccordion({ category, items, isOpen, onToggle, onSelect, gridMode, lang }) {
  const label = lang === 'hu' ? category.label_hu : category.label_en

  return (
    <div className={`port-accordion ${isOpen ? 'port-accordion--open' : ''}`}>
      {/* Fejléc – kattintható sor */}
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

      {/* Képek – csak ha nyitva */}
      {isOpen && (
        <div className={`port-accordion-grid ${gridMode === 'ratio' ? 'port-accordion-grid--ratio' : ''}`}>
          {items.map(item => (
            <div
              key={item.id}
              className="port-acc-item"
              onClick={() => onSelect(item)}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && onSelect(item)}
            >
              {item.cloudinaryUrl ? (
                <img
                  src={item.cloudinaryUrl}
                  alt={item.title}
                  loading="lazy"
                  className={gridMode === 'ratio' ? 'port-acc-img--ratio' : 'port-acc-img--flex'}
                />
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
      )}
    </div>
  )
}

export default function Portfolio() {
  // Nyitott kategóriák – több is nyitva lehet egyszerre
  const [openCats, setOpenCats] = useState({})
  const [selected, setSelected] = useState(null)

  const { lang, t }                         = useLang()
  const { items, loading }                  = usePortfolio()
  const { categories, loading: catLoading } = useCategories()
  const { content }                         = useSiteContent()

  // Beállítások a site_content-ből
  // portfolio_limit_all = "10" (Mind kategória limit)
  // portfolio_limit_event = "15" (per-kategória limit)
  // portfolio_grid_mode_all = "flex" | "ratio"
  const getLimit = (key) => parseInt(content[`portfolio_limit_${key}`]) || (key === 'all' ? 10 : 15)
  const getMode  = (key) => content[`portfolio_grid_mode_${key}`] || 'flex'

  // Normalizálás
  const normalized = useMemo(() => items.map(item => ({
    ...item,
    cloudinaryUrl: item.cloudinary_url,
    videoUrl:      item.video_url,
    categorySlug:  item.portfolio_categories?.slug || item.category || '',
  })), [items])

  // "Mind" – véletlenszerű mix az összes kategóriából
  const allItems = useMemo(() => {
    const limit = getLimit('all')
    return shuffle(normalized).slice(0, limit)
  }, [normalized, content])

  // Per-kategória itemek limitálva
  const getItemsForCat = (slug) => {
    const limit = getLimit(slug)
    return normalized.filter(i => i.categorySlug === slug).slice(0, limit)
  }

  // Accordion toggle
  const toggleCat = (key) => {
    setOpenCats(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Modal
  const closeModal = () => setSelected(null)

  // A modal navigációhoz szükséges "összes látható" lista
  // Ha van nyitott kategória, az abban lévő képek közül navigál
  const visibleForModal = useMemo(() => {
    // Gyűjtsük össze az összes nyitott kategória képeit sorban
    const result = []
    // "All" mappa nyitva
    if (openCats['all']) result.push(...allItems)
    // Kategória mappák
    categories.forEach(cat => {
      if (openCats[cat.slug]) {
        result.push(...getItemsForCat(cat.slug))
      }
    })
    // Ha semmi nincs nyitva, használjuk az összes elemet
    return result.length > 0 ? result : normalized
  }, [openCats, allItems, categories, normalized])

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

  const isLoading = loading || catLoading

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

          {isLoading ? (
            <div className="port-loading">Betöltés...</div>
          ) : (
            <div className="port-accordion-list">

              {/* ── "Mind" accordion ── */}
              <CategoryAccordion
                category={{ label_hu: 'Mind', label_en: 'All', slug: 'all' }}
                items={allItems}
                isOpen={!!openCats['all']}
                onToggle={() => toggleCat('all')}
                onSelect={setSelected}
                gridMode={getMode('all')}
                lang={lang}
              />

              {/* ── Kategória accordionok ── */}
              {categories.map(cat => {
                const catItems = getItemsForCat(cat.slug)
                return (
                  <CategoryAccordion
                    key={cat.id}
                    category={cat}
                    items={catItems}
                    isOpen={!!openCats[cat.slug]}
                    onToggle={() => toggleCat(cat.slug)}
                    onSelect={setSelected}
                    gridMode={getMode(cat.slug)}
                    lang={lang}
                  />
                )
              })}

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
