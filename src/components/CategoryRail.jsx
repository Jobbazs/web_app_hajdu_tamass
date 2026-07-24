import { useLang } from '../LangContext'
import { catLabel } from '../lib/portfolioPages'

// Bal oldali (desktop, fix) / felső (mobil, vízszintes) kategória-sáv.
// Az "összes" a hub oldalra visz.
// variant="bottom" → az oldal aljára, a Kapcsolat fölé kerülő második példány
// (csak reszponzív nézetben látszik; desktopon a bal oldali sáv végig ott van).
export default function CategoryRail({ categories, activeSlug, variant = 'top' }) {
  const { lang } = useLang()
  const allLabel = lang === 'hu' ? 'Mind' : 'All'
  const isBottom = variant === 'bottom'
  const label = lang === 'hu' ? 'Kategóriák' : 'Categories'

  return (
    <nav
      className={`cat-rail${isBottom ? ' cat-rail--bottom' : ''}`}
      aria-label={isBottom ? `${label} (${lang === 'hu' ? 'oldal alja' : 'bottom'})` : label}
    >
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
