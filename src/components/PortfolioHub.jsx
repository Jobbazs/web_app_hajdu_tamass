import { useMemo, useEffect } from 'react'
import { useLang } from '../LangContext'
import { usePortfolio, useCategories, useSiteContent } from '../hooks'
import { cldThumb, catLabel } from '../lib/portfolioPages'
import Navbar from './Navbar'
import Contact from './Contact'
import Footer from './Footer'
import Breadcrumb from './Breadcrumb'
import '../Styles/Category.css'

const SITE = 'https://hajdutamas.hu'

export default function PortfolioHub() {
  const { lang, t } = useLang()
  const { items } = usePortfolio()
  const { categories } = useCategories()
  const { content } = useSiteContent()

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
        <div className="cat-hero-band">
          <div className="cat-band-inner">
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
            <section className="hub-grid-wrap">
              <div className="hub-grid">
                {cards.map((c) => (
                  <a key={c.slug} href={`/portfolio/${c.slug}`} className="hub-card">
                    <div className="hub-card-img">
                      {c.cover ? (
                        <img src={cldThumb(c.cover, 700)} alt={catLabel(c, lang)} loading="lazy" />
                      ) : (
                        <div className="hub-card-ph">—</div>
                      )}
                    </div>
                    <div className="hub-card-meta">
                      <span className="hub-card-label">{catLabel(c, lang)}</span>
                      <span className="hub-card-count">
                        {c.count} {lang === 'hu' ? 'kép' : 'photos'}
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>

      <Contact />
      <Footer />
    </>
  )
}
