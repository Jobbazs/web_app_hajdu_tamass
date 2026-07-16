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

import { readFile, writeFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST = resolve(__dirname, '..', 'dist', 'index.html')

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

// ── Fő futás ───────────────────────────────────────────────
async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn('[prerender] Nincs Supabase env – kihagyva, a build folytatódik.')
    return
  }

  const [contentRows, services, cats, items, customSections] = await Promise.all([
    fetchTable('site_content', 'select=key,value'),
    fetchTable('services', 'select=number,name_hu,desc_hu&order=sort_order.asc'),
    fetchTable('portfolio_categories', 'select=id,slug,label_hu&order=sort_order.asc'),
    fetchTable('portfolio_items', 'select=id,category_id,cloudinary_url,title&visible=eq.true&order=sort_order.asc'),
    fetchTable('custom_sections', 'select=title_hu,body_hu,visible&visible=eq.true&order=sort_order.asc'),
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

  let html = await readFile(DIST, 'utf8')
  const before = html

  // Inline stílus: a React indulásáig (~100-300ms) ez a tartalom látszik.
  // NEM rejtjük el (az cloaking lenne) – a témához igazítjuk, hogy a
  // villanás ne legyen zavaró. A React createRoot úgyis kitörli.
  const shell =
    'background:#1a1510;color:#C8B89A;font-family:sans-serif;' +
    'padding:2rem;max-width:1200px;margin:0 auto;'

  html = html.replace(
    '<div id="root"></div>',
    `<div id="root"><div style="${shell}">\n${body}\n</div></div>`
  )

  if (html === before) {
    console.warn('[prerender] A <div id="root"></div> nem található – kihagyva.')
    return
  }

  await writeFile(DIST, html, 'utf8')
  console.log(`[prerender] Kész – ${body.length} karakter beinjektálva a #root-ba.`)
}

main().catch((err) => {
  // A prerender hibája NE bontsa el a deployt – rosszabb egy nem elérhető
  // oldal, mint egy SEO szempontból gyengébb.
  console.error('[prerender] Hiba, a build folytatódik:', err.message)
})
