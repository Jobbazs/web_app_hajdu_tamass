// Morzsa (Főoldal › Portfólió › Kategória) + JSON-LD BreadcrumbList.
// A JSON-LD kliensoldalon is bekerül; a prerender a statikus oldalra külön
// injektálja (ld. scripts/prerender.mjs).
const SITE = 'https://hajdutamas.hu'

export default function Breadcrumb({ items }) {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.label,
      item: it.href ? `${SITE}${it.href}` : undefined,
    })),
  }

  return (
    <nav className="pp-breadcrumb" aria-label="Breadcrumb">
      <ol>
        {items.map((it, i) => (
          <li key={i}>
            {it.href && i < items.length - 1 ? (
              <a href={it.href}>{it.label}</a>
            ) : (
              <span aria-current="page">{it.label}</span>
            )}
            {i < items.length - 1 && <span className="pp-bc-sep">›</span>}
          </li>
        ))}
      </ol>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
      />
    </nav>
  )
}
