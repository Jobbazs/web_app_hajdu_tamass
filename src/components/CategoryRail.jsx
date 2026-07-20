import { useLang } from '../LangContext'
import { catLabel } from '../lib/PortfolioPages'

// Bal oldali (desktop, fix) / alsó (mobil, sticky vízszintes) kategória-sáv.
// Az "összes" a hub oldalra visz.
export default function CategoryRail({ categories, activeSlug }) {
  const { lang } = useLang()
  const allLabel = lang === 'hu' ? 'Mind' : 'All'

  return (
    <nav className="cat-rail" aria-label={lang === 'hu' ? 'Kategóriák' : 'Categories'}>
      <div className="cat-rail-inner">
        <a
          href="/portfolio"
          className={`cat-rail-link cat-rail-all ${!activeSlug ? 'active' : ''}`}
        >
          {allLabel}
        </a>
        {categories.map((c) => (
          <a
            key={c.slug}
            href={`/portfolio/${c.slug}`}
            className={`cat-rail-link ${activeSlug === c.slug ? 'active' : ''}`}
          >
            {catLabel(c, lang)}
          </a>
        ))}
      </div>
    </nav>
  )
}
