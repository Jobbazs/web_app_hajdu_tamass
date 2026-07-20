import { useMemo, useEffect, useRef } from 'react'
import { useLang } from '../LangContext'
import { usePortfolio, useCategories, useSiteContent } from '../hooks'
import { cldThumb, catLabel } from '../lib/portfolioPages'
import Navbar from './Navbar'
import Contact from './Contact'
import Footer from './Footer'
import Breadcrumb from './Breadcrumb'
import HeroWords from './HeroWords'
import '../Styles/Category.css'
import '../Styles/Portfolio.css'

const SITE = 'https://hajdutamas.hu'

export default function PortfolioHub() {
  const { lang, t } = useLang()
  const { items } = usePortfolio()
  const { categories } = useCategories()
  const { content } = useSiteContent()
  const heroTextRef = useRef(null)

  const heroWords = useMemo(() => {
    const all = categories.flatMap((c) => c.hero_words || [])
    return [...new Set(all)].sort(() => Math.random() - 0.5).slice(0, 12)
  }, [categories])

  useEffect(() => {
    document.title = 'Portfólió — Hajdú Tamás Fotós & Videós | Budapest'
    const link = document.head.querySelector('link[rel="canonical"]')
    if (link) link.setAttribute('href', `${SITE}/portfolio`)
  }, [])

  const normalized = useMemo(
    () =>
      items.map((it) => ({
        ...it,
        cloudinaryUrl: it.cloudinary_url,
        categorySlug: it.portfolio_categories?.slug || it.category || '',
      })),
    [items]
  )

  const cards = useMemo(() => {
    return categories.map((cat) => {
      const catItems = normalized.filter((i) => i.categorySlug === cat.slug)
      const coverId = content[`portfolio_cover_${cat.slug}`]
      const cover =
        cat.cover_url ||
        (coverId && catItems.find((i) => i.id === coverId)?.cloudinaryUrl) ||
        catItems[0]?.cloudinaryUrl ||
        null
      return { ...cat, cover, count: catItems.length }
    })
  }, [categories, normalized, content])

  return (
    <>
      <Navbar subpage />
      <main className="cat-main hub-main">
        <div className="cat-hero-band cat-hero-band--tall">
          <HeroWords words={heroWords} keepOutRef={heroTextRef} />
          <div className="cat-band-inner" ref={heroTextRef}>
            <Breadcrumb
              items={[
                { label: lang === 'hu' ? 'Főoldal' : 'Home', href: '/' },
                { label: lang === 'hu' ? 'Portfólió' : 'Portfolio' },
              ]}
            />

            <header className="cat-hero">
              <div style={{ textAlign: 'center', maxWidth: '100%' }}>
                <div className="cat-hero-eyebrow" style={{ justifyContent: 'center' }}>
                  {t.portfolio.label || (lang === 'hu' ? 'Munkáim' : 'My work')}
                </div>
                <h1 className="cat-hero-title pp-sz-large">{t.portfolio.title}</h1>
                <p className="cat-hero-sub pp-sz-normal">
                  {lang === 'hu'
                    ? 'Válassz kategóriát, és merülj el a munkáimban.'
                    : 'Pick a category and dive into the work.'}
                </p>
              </div>
            </header>
          </div>
        </div>

        <div className="cat-content-band">
          <div className="cat-band-inner">
            <div className="port-cat-grid">
              {cards.map((c) => (
                <a key={c.slug} href={`/portfolio/${c.slug}`} className="port-cat-card">
                  <div className="port-cat-img-wrap">
                    {c.cover ? (
                      <img className="port-cat-img" src={cldThumb(c.cover, 700)} alt={catLabel(c, lang)} loading="lazy" />
                    ) : (
                      <div className="port-cat-placeholder">—</div>
                    )}
                  </div>
                  <div className="port-cat-label">{catLabel(c, lang)}</div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </main>

      <Contact />
      <Footer />
    </>
  )
}
