import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useLang } from '../LangContext'
import { usePortfolio, useCategories } from '../hooks'
import { useCategorySections } from '../hooks'
import CategorySections from './CategorySections'
import HeroWords from './HeroWords'
import { cldThumb, alignStyle, sizeClass, catLabel, catIntro, catSubtitle } from '../lib/portfolioPages'
import Navbar from './Navbar'
import Contact from './Contact'
import Footer from './Footer'
import CategoryRail from './CategoryRail'
import Breadcrumb from './Breadcrumb'
import MediaModal from './MediaModal'
import '../Styles/Category.css'

const SITE = 'https://hajdutamas.hu'

function useSeo({ title, description, url }) {
  useEffect(() => {
    if (title) document.title = title
    const setMeta = (sel, attr, val) => {
      let el = document.head.querySelector(sel)
      if (!el) {
        el = document.createElement('meta')
        const [k, v] = sel.replace(/meta\[|\]/g, '').split('=')
        el.setAttribute(k, v.replace(/["']/g, ''))
        document.head.appendChild(el)
      }
      el.setAttribute(attr, val)
    }
    if (description) {
      setMeta('meta[name="description"]', 'content', description)
      setMeta('meta[property="og:description"]', 'content', description)
    }
    if (title) setMeta('meta[property="og:title"]', 'content', title)
    if (url) {
      setMeta('meta[property="og:url"]', 'content', url)
      let link = document.head.querySelector('link[rel="canonical"]')
      if (link) link.setAttribute('href', url)
    }
  }, [title, description, url])
}

export default function CategoryPage({ slug }) {
  const { lang } = useLang()
  const { items, loading: itemsLoading } = usePortfolio()
  const { categories, loading: catsLoading } = useCategories()
  const { sections: allSections } = useCategorySections()

  const [selected, setSelected] = useState(null)
  const heroTextRef = useRef(null)

  const category = useMemo(
    () => categories.find((c) => c.slug === slug) || null,
    [categories, slug]
  )

  const catItems = useMemo(() => {
    return items
      .map((it) => ({
        ...it,
        cloudinaryUrl: it.cloudinary_url,
        videoUrl: it.video_url,
        categorySlug: it.portfolio_categories?.slug || it.category || '',
      }))
      .filter((i) => i.categorySlug === slug)
  }, [items, slug])

  const label = catLabel(category, lang)
  const subtitle = catSubtitle(category, lang)
  const intro = catIntro(category, lang)

  const catSections = useMemo(
    () => (category ? allSections.filter((s) => s.category_id === category.id) : []),
    [allSections, category]
  )

  useSeo({
    title: label ? `${label} — Hajdú Tamás Fotós & Videós | Budapest` : 'Portfólió — Hajdú Tamás',
    description:
      subtitle ||
      (intro ? intro.slice(0, 155) : `${label} fotók — Hajdú Tamás, budapesti fotós és videós.`),
    url: `${SITE}/portfolio/${slug}`,
  })

  const goNext = useCallback(() => {
    if (!selected || !catItems.length) return
    const idx = catItems.findIndex((i) => i.id === selected.id)
    setSelected(catItems[(idx + 1) % catItems.length])
  }, [selected, catItems])

  const goPrev = useCallback(() => {
    if (!selected || !catItems.length) return
    const idx = catItems.findIndex((i) => i.id === selected.id)
    setSelected(catItems[(idx - 1 + catItems.length) % catItems.length])
  }, [selected, catItems])

  const loading = itemsLoading || catsLoading

  // Nem létező kategória (a betöltés után)
  if (!loading && !category) {
    return (
      <>
        <Navbar subpage />
        <main className="cat-main">
          <div className="cat-notfound">
            <h1>{lang === 'hu' ? 'Nincs ilyen kategória' : 'Category not found'}</h1>
            <a href="/portfolio" className="cat-back-link">
              ← {lang === 'hu' ? 'Összes kategória' : 'All categories'}
            </a>
          </div>
        </main>
        <Contact />
        <Footer />
      </>
    )
  }

  return (
    <>
      <Navbar subpage />
      <CategoryRail categories={categories} activeSlug={slug} />

      <main className="cat-main">
        <div className="cat-hero-band">
          <HeroWords words={category?.hero_words || []} keepOutRef={heroTextRef} />
          <div className="cat-band-inner" ref={heroTextRef}>
            <Breadcrumb
              items={[
                { label: lang === 'hu' ? 'Főoldal' : 'Home', href: '/' },
                { label: lang === 'hu' ? 'Portfólió' : 'Portfolio', href: '/portfolio' },
                { label: label || slug },
              ]}
            />

            {/* Hero – kis narancs eyebrow + nagy fehér cím */}
            <header className="cat-hero">
              <div style={alignStyle(category?.hero_align)}>
                <div className="cat-hero-eyebrow">{lang === 'hu' ? 'Portfólió' : 'Portfolio'}</div>
                <h1 className={`cat-hero-title ${sizeClass(category?.hero_title_size)}`}>{label}</h1>
                {subtitle && (
                  <p className={`cat-hero-sub ${sizeClass(category?.hero_subtitle_size)}`}>{subtitle}</p>
                )}
              </div>
            </header>

            {/* Intro szöveg */}
            {intro && (
              <section className="cat-intro">
                <div className={sizeClass(category?.intro_size)} style={alignStyle(category?.intro_align)}>
                  {intro.split('\n').map((s) => s.trim()).filter(Boolean).map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>

        {/* Tartalom sáv (világosabb háttér, hogy a képek elváljanak a herótól) */}
        <div className="cat-content-band">
          <div className="cat-band-inner">
            {loading ? (
              <div className="cat-empty">{lang === 'hu' ? 'Betöltés…' : 'Loading…'}</div>
            ) : catSections.length > 0 ? (
              <CategorySections sections={catSections} catItems={catItems} onImageClick={setSelected} />
            ) : (
              <section className="cat-grid-wrap" aria-label={label}>
                {catItems.length === 0 ? (
                  <div className="cat-empty">
                    {lang === 'hu' ? 'Ebben a kategóriában még nincs kép.' : 'No photos in this category yet.'}
                  </div>
                ) : (
                  <div className="cat-grid">
                    {catItems.map((it) => (
                      <button
                        key={it.id}
                        className="cat-tile"
                        onClick={() => setSelected(it)}
                        aria-label={it.title || label}
                      >
                        <img
                          src={cldThumb(it.cloudinaryUrl, 800)}
                          alt={it.title ? `${it.title} — ${label}` : `${label} — Hajdú Tamás fotós`}
                          loading="lazy"
                        />
                        {it.videoUrl && <span className="cat-tile-play">▶</span>}
                      </button>
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      </main>

      <Contact />
      <Footer />

      <MediaModal
        item={selected}
        items={catItems}
        onClose={() => setSelected(null)}
        onNext={goNext}
        onPrev={goPrev}
      />
    </>
  )
}
