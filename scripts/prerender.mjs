// ============================================================
// Build-idejű prerender
// A vite build után fut: Supabase-ből lekéri a tartalmat,
// és statikus HTML-t injektál a #root-ba.
//
// Miért: a Google első kérésre üres <div id="root"></div>-ot kapott.
// Ez a szkript valódi szöveggel tölti fel, a CMS adataiból.
//
// React createRoot-tal indul, ami törli a #root tartalmát és
// újrarendereli -> nincs hydration mismatch, a látogató ugyanazt látja.
// ============================================================

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST_DIR = resolve(__dirname, '..', 'dist')
const DIST = resolve(DIST_DIR, 'index.html')
const SITE = 'https://hajdutamas.hu'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY

// ── HTML escape – XSS és törött markup ellen ────────────────
const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

// ── Supabase REST lekérés ──────────────────────────────────
async function fetchTable(table, query = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${query}`
  const res = await fetch(url, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  })
  if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`)
  return res.json()
}

// ── Fallback szövegek (LangContext-tel egyezőek) ────────────
const FB = {
  hero_line1: 'Ahol a fény',
  hero_line2: 'meghal.',
  hero_subtitle:
    'Rendezvények, underground helyszínek, portrék és urbex — a képek, amelyek megmaradnak.',
  about_label: 'Rólam',
  about_title1: 'A kamera',
  about_title2: 'mögött',
  about_bio1:
    'Budapesti fotós és videós vagyok, aki bulik, rendezvények és underground helyszínek dokumentálására specializálódott.',
  about_bio2:
    'Kezdő videoklipp-forgató – hiszek abban, hogy a mozgókép ugyanolyan nyers igazságot tud mutatni, mint egy jó állókép.',
  about_bio3: 'Nem szépítem az életet. Megmutatom, ahogy van.',
  portfolio_label: 'Munkáim',
  portfolio_title: 'Portfólió',
  services_label: 'Mit kínálok',
  services_title: 'Szolgáltatások',
  contact_label: 'Írj nekem',
  contact_title: 'Kapcsolat',
}

const DEFAULT_ORDER = [
  { key: 'about', visible: true },
  { key: 'portfolio', visible: true },
  { key: 'services', visible: true },
  { key: 'booking', visible: true },
  { key: 'custom', visible: true },
  { key: 'contact', visible: true },
]

// ── Szekció-generátorok ────────────────────────────────────
function heroHtml(c) {
  const l1 = c.hero_line1_hu || FB.hero_line1
  const l2 = c.hero_line2_hu || FB.hero_line2
  const sub = c.hero_subtitle_hu || FB.hero_subtitle
  return `<section id="hero">
<h1>${esc(l1)} ${esc(l2)}</h1>
<p>${esc(sub)}</p>
</section>`
}

function aboutHtml(c) {
  const bios = [
    c.about_bio1_hu || FB.about_bio1,
    c.about_bio2_hu || FB.about_bio2,
    c.about_bio3_hu || FB.about_bio3,
  ]
  const tags = (c.about_tags_hu || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
  return `<section id="about">
<h2>${esc(FB.about_title1)} ${esc(FB.about_title2)}</h2>
${bios.map((b) => `<p>${esc(b)}</p>`).join('\n')}
${tags.length ? `<ul>${tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
</section>`
}

function portfolioHtml(cats, items, content) {
  const cards = cats
    .map((cat) => {
      const catItems = items.filter((i) => i.category_id === cat.id)
      if (!catItems.length) return ''
      const coverUrl = content[`portfolio_cover_${cat.slug}`] || catItems[0].cloudinary_url
      return `<article>
<h3>${esc(cat.label_hu)}</h3>
<img src="${esc(coverUrl)}" alt="${esc(cat.label_hu)} — Hajdú Tamás fotós, Budapest" loading="lazy" width="600" height="400" />
<p>${catItems.length} kép</p>
</article>`
    })
    .filter(Boolean)
    .join('\n')
  return `<section id="portfolio">
<h2>${esc(FB.portfolio_title)}</h2>
${cards}
</section>`
}

function servicesHtml(services) {
  const cards = services
    .map(
      (s) => `<article>
<h3>${esc(s.name_hu)}</h3>
<p>${esc(s.desc_hu)}</p>
</article>`
    )
    .join('\n')
  return `<section id="services">
<h2>${esc(FB.services_title)}</h2>
${cards}
</section>`
}

function customHtml(sections) {
  return sections
    .filter((s) => s.visible)
    .map((s) => {
      const title = s.title_hu ? `<h2>${esc(s.title_hu)}</h2>` : ''
      const body = s.body_hu
        ? s.body_hu
            .split('\n')
            .filter(Boolean)
            .map((l) => `<p>${esc(l)}</p>`)
            .join('\n')
        : ''
      return title || body ? `<section>\n${title}\n${body}\n</section>` : ''
    })
    .filter(Boolean)
    .join('\n')
}

// ── Aloldal-segédek ────────────────────────────────────────
function cldThumb(url, w = 800) {
  if (!url || !url.includes('/upload/')) return url
  if (/\/upload\/[^/]*(?:w_|q_|f_)/.test(url)) return url
  return url.replace('/upload/', `/upload/f_auto,q_auto,w_${w}/`)
}

// Egy head-tag lecserélése (multiline-biztos). Ha nincs találat, változatlan.
function replaceTag(html, regex, replacement) {
  return regex.test(html) ? html.replace(regex, replacement) : html
}

// Per-oldal head: title, description, canonical, og:*
function setHead(html, { title, description, url }) {
  html = replaceTag(html, /<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
  html = replaceTag(html, /<meta\s+name="description"[\s\S]*?\/>/,
    `<meta name="description" content="${esc(description)}" />`)
  html = replaceTag(html, /<meta\s+property="og:title"[\s\S]*?\/>/,
    `<meta property="og:title" content="${esc(title)}" />`)
  html = replaceTag(html, /<meta\s+property="og:description"[\s\S]*?\/>/,
    `<meta property="og:description" content="${esc(description)}" />`)
  html = replaceTag(html, /<meta\s+property="og:url"[\s\S]*?\/>/,
    `<meta property="og:url" content="${esc(url)}" />`)
  html = replaceTag(html, /<link\s+rel="canonical"[\s\S]*?\/>/,
    `<link rel="canonical" href="${esc(url)}" />`)
  return html
}

function injectLd(html, obj) {
  const tag = `<script type="application/ld+json">${JSON.stringify(obj)}</script>`
  return html.replace('</head>', `${tag}\n</head>`)
}

function injectRoot(template, bodyHtml) {
  const shell =
    'background:#1a1510;color:#C8B89A;font-family:sans-serif;' +
    'padding:2rem;max-width:1400px;margin:0 auto;'
  return template.replace(
    '<div id="root"></div>',
    `<div id="root"><div style="${shell}">\n${bodyHtml}\n</div></div>`
  )
}

// Bal sáv (belső linkek – SEO)
function railHtml(cats, activeSlug) {
  const links = [`<a href="/portfolio">Mind</a>`]
    .concat(cats.map((c) => `<a href="/portfolio/${esc(c.slug)}"${c.slug === activeSlug ? ' aria-current="page"' : ''}>${esc(c.label_hu)}</a>`))
  return `<nav aria-label="Kategóriák">${links.join('\n')}</nav>`
}

function breadcrumbHtml(items) {
  const parts = items.map((it, i) =>
    it.href && i < items.length - 1
      ? `<a href="${esc(it.href)}">${esc(it.label)}</a>`
      : `<span>${esc(it.label)}</span>`
  )
  return `<nav aria-label="Breadcrumb">${parts.join(' › ')}</nav>`
}

const SEC_IMG_COUNT = { text_images: 4, images_text: 4, images_only: 8, text_only: 0 }

function sectionsHtml(sections, catItems, catLabel) {
  const byId = new Map(catItems.map((i) => [i.id, i]))
  let cursor = 0
  return sections
    .map((s) => {
      const count = SEC_IMG_COUNT[s.type] ?? 4
      let imgs = []
      if (count > 0) {
        if (s.image_ids && s.image_ids.length) {
          imgs = s.image_ids.map((id) => byId.get(id)).filter(Boolean)
        } else {
          imgs = catItems.slice(cursor, cursor + count)
          cursor += count
        }
      }
      const title = s.title_hu ? `<h2>${esc(s.title_hu)}</h2>` : ''
      const body = (s.body_hu || '')
        .split('\n').map((p) => p.trim()).filter(Boolean)
        .map((p) => `<p>${esc(p)}</p>`).join('\n')
      const grid = imgs
        .map((it) => `<img src="${esc(cldThumb(it.cloudinary_url, 800))}" alt="${esc((it.title || catLabel) + ' — Hajdú Tamás fotós')}" loading="lazy" />`)
        .join('\n')
      if (s.type === 'text_only') return `<section>${title}\n${body}</section>`
      if (s.type === 'images_only') return `<section>${title}\n${grid}</section>`
      return `<section>${title}\n${body}\n${grid}</section>`
    })
    .join('\n')
}

function categoryPageHtml(cat, catItems, catSections) {
  const rail = railHtml(cat._allCats, cat.slug)
  const crumbs = breadcrumbHtml([
    { label: 'Főoldal', href: '/' },
    { label: 'Portfólió', href: '/portfolio' },
    { label: cat.label_hu },
  ])
  const introParas = (cat.intro_hu || '')
    .split('\n').map((s) => s.trim()).filter(Boolean)
    .map((p) => `<p>${esc(p)}</p>`).join('\n')

  // Ha vannak szekciók, azokat rendereljük; különben az egyszerű képgrid.
  const content =
    catSections && catSections.length
      ? sectionsHtml(catSections, catItems, cat.label_hu)
      : `<section aria-label="${esc(cat.label_hu)}">\n${catItems
          .map((it) => `<img src="${esc(cldThumb(it.cloudinary_url, 800))}" alt="${esc((it.title ? it.title + ' — ' : '') + cat.label_hu + ' — Hajdú Tamás fotós')}" loading="lazy" />`)
          .join('\n')}\n</section>`

  return `${rail}
<main>
<header><h1>${esc(cat.label_hu)}</h1>${cat.hero_subtitle_hu ? `<p>${esc(cat.hero_subtitle_hu)}</p>` : ''}</header>
${introParas ? `<section>${introParas}</section>` : ''}
${content}
</main>
<section id="contact"><h2>${esc(FB.contact_title)}</h2></section>`
}

function hubPageHtml(cats, items, content) {
  const crumbs = breadcrumbHtml([
    { label: 'Főoldal', href: '/' },
    { label: 'Portfólió' },
  ])
  const cards = cats.map((cat) => {
    const catItems = items.filter((i) => i.category_id === cat.id)
    const cover = cat.cover_url || content[`portfolio_cover_${cat.slug}`] || catItems[0]?.cloudinary_url
    return `<a href="/portfolio/${esc(cat.slug)}">
<img src="${esc(cldThumb(cover, 700))}" alt="${esc(cat.label_hu)} — Hajdú Tamás" loading="lazy" />
<h2>${esc(cat.label_hu)}</h2>
<p>${catItems.length} kép</p>
</a>`
  }).join('\n')
  return `<main>
<header><h1>Portfólió</h1><p>Válassz kategóriát, és merülj el a munkáimban.</p></header>
<section>
${cards}
</section>
</main>
<section id="contact"><h2>${esc(FB.contact_title)}</h2></section>`
}

function sitemapXml(cats) {
  const urls = [
    { loc: `${SITE}/`, pri: '1.0' },
    { loc: `${SITE}/portfolio`, pri: '0.9' },
    ...cats.map((c) => ({ loc: `${SITE}/portfolio/${c.slug}`, pri: '0.8' })),
  ]
  const body = urls
    .map((u) => `  <url>\n    <loc>${u.loc}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>${u.pri}</priority>\n  </url>`)
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`
}

async function writePage(relPath, html) {
  const outPath = join(DIST_DIR, relPath, 'index.html')
  await mkdir(dirname(outPath), { recursive: true })
  await writeFile(outPath, html, 'utf8')
}

// ── Fő futás ───────────────────────────────────────────────
async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn('[prerender] Nincs Supabase env – kihagyva, a build folytatódik.')
    return
  }

  const [contentRows, services, cats, items, customSections, categorySections] = await Promise.all([
    fetchTable('site_content', 'select=key,value'),
    fetchTable('services', 'select=number,name_hu,desc_hu&order=sort_order.asc'),
    fetchTable('portfolio_categories', 'select=id,slug,label_hu,hero_subtitle_hu,intro_hu,cover_url&order=sort_order.asc'),
    fetchTable('portfolio_items', 'select=id,category_id,cloudinary_url,title&visible=eq.true&order=sort_order.asc'),
    fetchTable('custom_sections', 'select=title_hu,body_hu,visible&visible=eq.true&order=sort_order.asc'),
    fetchTable('category_sections', 'select=*&visible=eq.true&order=sort_order.asc'),
  ])

  const content = Object.fromEntries(contentRows.map((r) => [r.key, r.value]))

  let order = DEFAULT_ORDER
  if (content.sections_order) {
    try {
      order = JSON.parse(content.sections_order)
    } catch {
      /* marad a default */
    }
  }

  const builders = {
    about: () => aboutHtml(content),
    portfolio: () => portfolioHtml(cats, items, content),
    services: () => servicesHtml(services),
    custom: () => customHtml(customSections),
    booking: () => `<section id="booking"><h2>Időpontfoglalás</h2></section>`,
    contact: () => `<section id="contact"><h2>${esc(FB.contact_title)}</h2></section>`,
  }

  const body =
    heroHtml(content) +
    '\n' +
    order
      .filter((s) => s.visible && builders[s.key])
      .map((s) => builders[s.key]())
      .join('\n')

  // Template EGYSZER beolvasva (üres #root), minden oldal ebből készül
  const template = await readFile(DIST, 'utf8')
  if (!template.includes('<div id="root"></div>')) {
    console.warn('[prerender] A <div id="root"></div> nem található – kihagyva.')
    return
  }

  // 1) Főoldal
  await writeFile(DIST, injectRoot(template, body), 'utf8')
  let pageCount = 1

  // 2) Portfólió hub
  {
    let html = injectRoot(template, hubPageHtml(cats, items, content))
    html = setHead(html, {
      title: 'Portfólió — Hajdú Tamás Fotós & Videós | Budapest',
      description: (() => {
        const list = cats.map((c) => c.label_hu).filter(Boolean).join(', ')
        const full = `Válogatás Hajdú Tamás munkáiból kategóriánként: ${list}.`
        // 160 karakter felett a keresők levágják – ilyenkor általános szöveg
        return full.length <= 160 ? full : 'Válogatás Hajdú Tamás fotós és videós munkáiból, kategóriánként rendezve.'
      })(),
      url: `${SITE}/portfolio`,
    })
    html = injectLd(html, { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Portfólió', url: `${SITE}/portfolio` })
    await writePage('portfolio', html)
    pageCount++
  }

  // 3) Kategória-oldalak
  for (const cat of cats) {
    cat._allCats = cats
    const catItems = items.filter((i) => i.category_id === cat.id)
    const catSecs = categorySections.filter((s) => s.category_id === cat.id)
    let html = injectRoot(template, categoryPageHtml(cat, catItems, catSecs))
    const desc = cat.hero_subtitle_hu || (cat.intro_hu ? cat.intro_hu.slice(0, 155) : `${cat.label_hu} fotók — Hajdú Tamás, budapesti fotós és videós.`)
    html = setHead(html, {
      title: `${cat.label_hu} — Hajdú Tamás Fotós & Videós | Budapest`,
      description: desc,
      url: `${SITE}/portfolio/${cat.slug}`,
    })
    html = injectLd(html, {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Főoldal', item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: 'Portfólió', item: `${SITE}/portfolio` },
        { '@type': 'ListItem', position: 3, name: cat.label_hu, item: `${SITE}/portfolio/${cat.slug}` },
      ],
    })
    if (catItems.length) {
      html = injectLd(html, {
        '@context': 'https://schema.org',
        '@type': 'ImageGallery',
        name: `${cat.label_hu} — Hajdú Tamás`,
        url: `${SITE}/portfolio/${cat.slug}`,
        image: catItems.slice(0, 30).map((i) => cldThumb(i.cloudinary_url, 1200)),
      })
    }
    await writePage(`portfolio/${cat.slug}`, html)
    pageCount++
  }

  // 4) Sitemap
  await writeFile(join(DIST_DIR, 'sitemap.xml'), sitemapXml(cats), 'utf8')

  console.log(`[prerender] Kész – ${pageCount} oldal prerenderelve + sitemap frissítve.`)
}

main().catch((err) => {
  // A prerender hibája NE bontsa el a deployt – rosszabb egy nem elérhető
  // oldal, mint egy SEO szempontból gyengébb.
  console.error('[prerender] Hiba, a build folytatódik:', err.message)
})
