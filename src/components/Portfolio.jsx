import { useState, useCallback, useMemo } from 'react'
import { useLang } from '../LangContext'
import { usePortfolio, useCategories } from '../hooks'
import MediaModal from './MediaModal'

// Fix kategória lista – slug, magyar és angol név
const FIXED_CATEGORIES = [
  { slug: 'nightlife',       label_hu: 'Nightlife',        label_en: 'Nightlife'        },
  { slug: 'studio',          label_hu: 'Studio',           label_en: 'Studio'           },
  { slug: 'rendezveny',      label_hu: 'Rendezvény',       label_en: 'Events'           },
  { slug: 'sport-kultura',   label_hu: 'Sport & Kultúra',  label_en: 'Sport & Culture'  },
  { slug: 'kreativ',         label_hu: 'Kreatív',          label_en: 'Creative'         },
]

export default function Portfolio() {
  const [selected,  setSelected]  = useState(null)
  const [activeSlug, setActiveSlug] = useState(null) // melyik kategória modal nyitva

  const { lang, t }    = useLang()
  const { items }      = usePortfolio()
  const { categories } = useCategories()

  // Normalizálás
  const normalized = useMemo(() => items.map(item => ({
    ...item,
    cloudinaryUrl: item.cloudinary_url,
    videoUrl:      item.video_url,
    categorySlug:  item.portfolio_categories?.slug || item.category || '',
  })), [items])

  // Kategória első képe (cover)
  const getCoverItem = (slug) =>
    normalized.find(i => i.categorySlug === slug) || null

  // Kategória összes képe (modalhoz)
  const getItemsForCat = useCallback((slug) =>
    normalized.filter(i => i.categorySlug === slug)
  , [normalized])

  // Modal megnyitása – az adott kategória képeit mutatja
  const openCategory = (slug, coverItem) => {
    const catItems = getItemsForCat(slug)
    if (catItems.length === 0) return
    setActiveSlug(slug)
    setSelected(coverItem || catItems[0])
  }

  const closeModal = () => {
    setSelected(null)
    setActiveSlug(null)
  }

  // Modal navigáció az aktív kategória képein belül
  const modalItems = useMemo(() =>
    activeSlug ? getItemsForCat(activeSlug) : []
  , [activeSlug, getItemsForCat])

  const goNext = useCallback(() => {
    if (!selected || !modalItems.length) return
    const idx = modalItems.findIndex(i => i.id === selected.id)
    setSelected(modalItems[(idx + 1) % modalItems.length])
  }, [selected, modalItems])

  const goPrev = useCallback(() => {
    if (!selected || !modalItems.length) return
    const idx = modalItems.findIndex(i => i.id === selected.id)
    setSelected(modalItems[(idx - 1 + modalItems.length) % modalItems.length])
  }, [selected, modalItems])

  // Megjelenítendő kategóriák – csak azok amikhez van kép
  const displayCats = FIXED_CATEGORIES.map(cat => {
    const cover = getCoverItem(cat.slug)
    return { ...cat, cover }
  })

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

          <div className="port-cat-grid">
            {displayCats.map(cat => {
              const label    = lang === 'hu' ? cat.label_hu : cat.label_en
              const catItems = getItemsForCat(cat.slug)
              const isEmpty  = catItems.length === 0

              return (
                <div
                  key={cat.slug}
                  className={`port-cat-card ${isEmpty ? 'port-cat-card--empty' : ''}`}
                  onClick={() => !isEmpty && openCategory(cat.slug, cat.cover)}
                  role={isEmpty ? undefined : 'button'}
                  tabIndex={isEmpty ? undefined : 0}
                  onKeyDown={e => !isEmpty && e.key === 'Enter' && openCategory(cat.slug, cat.cover)}
                >
                  {/* Cover kép */}
                  <div className="port-cat-img-wrap">
                    {cat.cover?.cloudinaryUrl ? (
                      <img
                        src={cat.cover.cloudinaryUrl}
                        alt={label}
                        className="port-cat-img"
                        loading="lazy"
                      />
                    ) : (
                      <div className="port-cat-placeholder">
                        {isEmpty ? '—' : '?'}
                      </div>
                    )}
                    {/* Overlay */}
                    <div className="port-cat-overlay">
                      {!isEmpty && (
                        <span className="port-cat-count">
                          {catItems.length} {lang === 'hu' ? 'kép' : 'photos'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Kategória neve */}
                  <div className="port-cat-label">{label}</div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <MediaModal
        item={selected}
        items={modalItems}
        onClose={closeModal}
        onNext={goNext}
        onPrev={goPrev}
      />
    </>
  )
}
