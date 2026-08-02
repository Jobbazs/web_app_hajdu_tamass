// Segédek a portfólió aloldalakhoz (kategória-oldal + hub)

// Cloudinary URL optimalizálás: automata formátum/minőség + méret.
// Nem duplázza, ha már van transzformáció a /upload/ után.
export function cldThumb(url, w = 800) {
  if (!url || !url.includes('/upload/')) return url
  if (/\/upload\/[^/]*(?:w_|q_|f_)/.test(url)) return url
  return url.replace('/upload/', `/upload/f_auto,q_auto:eco,c_limit,w_${w}/`)
}

// Nagy (modal) nézet: garantált méret- és minőség-cap nyers ÉS már transzformált URL-re is.
export function cldLarge(url, w = 1600) {
  if (!url || !url.includes('/upload/')) return url
  const seg = url.match(/\/upload\/([^/]+)\//)
  const isTransform = seg && /(?:^|,)(?:w_|h_|c_|q_|f_|e_|dpr_|ar_)/.test(seg[1])
  if (isTransform) {
    let s = seg[1]
    s = /(?:^|,)w_\d+/.test(s)   ? s.replace(/w_\d+/, `w_${w}`)   : `${s},w_${w}`
    s = /(?:^|,)q_[^,]+/.test(s) ? s.replace(/q_[^,]+/, 'q_auto') : `${s},q_auto`
    s = /(?:^|,)f_[^,]+/.test(s) ? s                              : `f_auto,${s}`
    s = /(?:^|,)c_[^,]+/.test(s) ? s                              : `${s},c_limit`
    return url.replace(/\/upload\/[^/]+\//, `/upload/${s}/`)
  }
  return url.replace('/upload/', `/upload/f_auto,q_auto,c_limit,w_${w}/`)
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