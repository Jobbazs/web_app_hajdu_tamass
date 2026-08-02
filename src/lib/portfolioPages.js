// Segédek a portfólió aloldalakhoz (kategória-oldal + hub)

// Cloudinary URL optimalizálás: automata formátum + agresszív (de rács-méretben
// nem feltűnő) minőség + méretkorlát. c_limit → sosem nagyít fel az eredeti fölé.
// Nem duplázza, ha már van transzformáció a /upload/ után.
export function cldThumb(url, w = 800) {
  if (!url || !url.includes('/upload/')) return url
  if (/\/upload\/[^/]*(?:w_|q_|f_)/.test(url)) return url
  return url.replace('/upload/', `/upload/f_auto,q_auto:eco,c_limit,w_${w}/`)
}

// Nagy (modal) nézet: garantáltan méret- és minőség-cap, akkor is ha a tárolt
// URL nyers (/upload/<id>) VAGY már tartalmaz transzformációt. A modalban q_auto
// (jó) minőséget hagyunk, mert itt egy hibás pixel is látszana.
export function cldLarge(url, w = 1600) {
  if (!url || !url.includes('/upload/')) return url
  const seg = url.match(/\/upload\/([^/]+)\//)
  const isTransform = seg && /(?:^|,)(?:w_|h_|c_|q_|f_|e_|dpr_|ar_)/.test(seg[1])
  if (isTransform) {
    let s = seg[1]
    s = /(?:^|,)w_\d+/.test(s)   ? s.replace(/w_\d+/, `w_${w}`)      : `${s},w_${w}`
    s = /(?:^|,)q_[^,]+/.test(s) ? s.replace(/q_[^,]+/, 'q_auto')    : `${s},q_auto`
    s = /(?:^|,)f_[^,]+/.test(s) ? s                                 : `f_auto,${s}`
    s = /(?:^|,)c_[^,]+/.test(s) ? s                                 : `${s},c_limit`
    return url.replace(/\/upload\/[^/]+\//, `/upload/${s}/`)
  }
  return url.replace('/upload/', `/upload/f_auto,q_auto,c_limit,w_${w}/`)
}

// ── Modal-méretű kép háttér-előtöltés ──────────────────────
const _prefetched = new Set()

function _conn() {
  if (typeof navigator === 'undefined') return null
  return navigator.connection || navigator.mozConnection || navigator.webkitConnection || null
}

// Jó kapcsolat? Csak 4g-n és ha nincs Save-Data → biztonságos tömeges előtöltés.
// Ha nincs Network Information API (pl. Safari desktop), OK-nak vesszük.
export function goodConnection() {
  const c = _conn()
  if (!c) return true
  if (c.saveData) return false
  return (c.effectiveType || '4g') === '4g'
}

// Egy nagy (modal) kép előtöltése – dedup + Save-Data tisztelet.
export function prefetchLarge(url) {
  if (!url || typeof Image === 'undefined') return
  const c = _conn()
  if (c && c.saveData) return
  const large = cldLarge(url, 1600)
  if (_prefetched.has(large)) return
  _prefetched.add(large)
  const im = new Image()
  im.src = large
}

// Igazítási presetek (bal 0-75%, közép 0-100%, jobb 25-100%)
export const ALIGN_STYLE = {
  left:   { textAlign: 'left',   marginRight: 'auto', maxWidth: '75%'  },
  center: { textAlign: 'center', marginLeft: 'auto', marginRight: 'auto', maxWidth: '100%' },
  right:  { textAlign: 'right',  marginLeft: 'auto', maxWidth: '75%'  },
}
export const alignStyle = (a) => ALIGN_STYLE[a] || ALIGN_STYLE.center

// Betűméret presetek → CSS osztály
export const sizeClass = (s) => `pp-sz-${s || 'normal'}`

export function catLabel(cat, lang) {
  if (!cat) return ''
  return (lang === 'hu' ? cat.label_hu : cat.label_en) || cat.label_hu || cat.slug || ''
}

export function catIntro(cat, lang) {
  if (!cat) return ''
  return (lang === 'hu' ? cat.intro_hu : cat.intro_en) || cat.intro_hu || ''
}

export function catSubtitle(cat, lang) {
  if (!cat) return ''
  return (lang === 'hu' ? cat.hero_subtitle_hu : cat.hero_subtitle_en) || cat.hero_subtitle_hu || ''
}