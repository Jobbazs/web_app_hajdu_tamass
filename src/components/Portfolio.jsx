import { useState, useCallback, useMemo } from 'react'
import { useLang } from '../LangContext'
import { usePortfolio, useCategories, useSiteContent } from '../hooks'
import '../Styles/Portfolio.css'
import MediaModal from './MediaModal'

const FIXED_CATEGORIES = [
  { slug: 'nightlife',     label_hu: 'Nightlife',        label_en: 'Nightlife'        },
  { slug: 'studio',        label_hu: 'Studio',           label_en: 'Studio'           },
  { slug: 'rendezveny',    label_hu: 'Rendezvény',       label_en: 'Events'           },
  { slug: 'sport-kultura', label_hu: 'Sport & Kultúra',  label_en: 'Sport & Culture'  },
  { slug: 'kreativ',       label_hu: 'Kreatív',          label_en: 'Creative'         },
]

export default function Portfolio() {
  const [selected,   setSelected]   = useState(null)
  const [activeSlug, setActiveSlug] = useState(null)

  const { lang, t }    = useLang()
  const { items }      = usePortfolio()
  const { categories } = useCategories()
  const { content }    = useSiteContent()

  const normalized = useMemo(() => items.map(item => ({
    ...item,
    cloudinaryUrl: item.cloudinary_url,
    videoUrl:      item.video_url,
    categorySlug:  item.portfolio_categories?.slug || item.category || '',
  })), [items])

  const getItemsForCat = useCallback((slug) =>
    normalized.filter(i => i.categorySlug === slug)
  , [normalized])

  // Cover kép – site_content-ből választott ID, fallback: első kép a kategóriában
  const getCoverItem = (slug) => {
    const coverId = content[`portfolio_cover_${slug}`]
    const catItems = getItemsForCat(slug)
    if (coverId) {
      const chosen = catItems.find(i => i.id === coverId)
      if (chosen) return chosen
    }
    return catItems[0] || null
  }

  const openCategory = (slug, coverItem) => {
    const catItems = getItemsForCat(slug)
    if (catItems.length === 0) return
    setActiveSlug(slug)
    setSelected(coverItem || catItems[0])
  }

  const closeModal = () => { setSelected(null); setActiveSlug(null) }

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

  const displayCats = FIXED_CATEGORIES.map(cat => ({
    ...cat,
    cover: getCoverItem(cat.slug),
  }))

  return (
    <>
      <section id="portfolio">
        <div className="container">
          <div className="portfolio-header">
            <div>
              <div className="section-label">{t.portfolio.label}</div>
              <a href="/portfolio" className="portfolio-title-link">
                <h2 className="section-title">{t.portfolio.title}</h2>
              </a>
            </div>
          </div>

          <div className="port-cat-grid">
            {displayCats.map(cat => {
              const label    = lang === 'hu' ? cat.label_hu : cat.label_en
              const catItems = getItemsForCat(cat.slug)
              const isEmpty  = catItems.length === 0

              return (
                <a
                  key={cat.slug}
                  href={isEmpty ? undefined : `/portfolio/${cat.slug}`}
                  className={`port-cat-card ${isEmpty ? 'port-cat-card--empty' : ''}`}
                  aria-disabled={isEmpty || undefined}
                >
                  <div className="port-cat-img-wrap">
                    {cat.cover?.cloudinaryUrl ? (
                      <img
                        src={cat.cover.cloudinaryUrl}
                        alt={label}
                        className="port-cat-img"
                        loading="lazy"
                      />
                    ) : (
                      <div className="port-cat-placeholder">{isEmpty ? '—' : '?'}</div>
                    )}
                  </div>
                  <div className="port-cat-label">{label}</div>
                </a>
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
