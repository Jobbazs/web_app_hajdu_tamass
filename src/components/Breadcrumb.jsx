// Csak JSON-LD BreadcrumbList (SEO) – LÁTHATÓ útvonal NINCS.
// A morzsa vizuálisan el lett rejtve; a strukturált adat viszont megmarad
// a keresőknek. A prerender is injektálja a statikus oldalra.
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
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
    />
  )
}
