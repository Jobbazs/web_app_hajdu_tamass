import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useCategories } from '../../hooks'

// A portfólió-áttekintő csempéinek borítóképe kategóriánként.
// Tárolás: site_content `portfolio_cover_<slug>` kulcs (mint korábban), de a
// lista mostantól az ÉLŐ kategóriákból generálódik (nem hardcode-olt).
function cldThumb(url, w = 300) {
  if (!url || !url.includes('/upload/')) return url
  return url.replace('/upload/', `/upload/w_${w},c_fill,q_auto,f_auto/`)
}

export default function AdminCovers() {
  const { categories } = useCategories()
  const [covers,  setCovers]  = useState({})   // { slug: url }
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('site_content')
        .select('key, value')
        .like('key', 'portfolio_cover_%')
      const map = {}
      for (const r of data || []) map[r.key.replace('portfolio_cover_', '')] = r.value
      setCovers(map)
      setLoading(false)
    })()
  }, [])

  const setCover = (slug, url) => {
    setCovers(prev => ({ ...prev, [slug]: url }))
    setSaved(false)
  }

  const save = async () => {
    setSaving(true); setSaved(false)
    const rows = categories.map(c => ({
      key:   `portfolio_cover_${c.slug}`,
      value: covers[c.slug] || '',
    }))
    const { error } = await supabase.from('site_content').upsert(rows, { onConflict: 'key' })
    setSaving(false)
    if (!error) setSaved(true)
  }

  if (loading) return null

  return (
    <div className="acms-content-group">
      <div className="acms-content-group-label">Portfólió borítóképek (áttekintő csempék)</div>
      <div className="acms-hint" style={{ marginBottom: '1.2rem' }}>
        Minden kategóriához kiválaszthatod, melyik kép jelenjen meg borítóként a portfólió-áttekintőn.
        Cloudinary URL-t adj meg – ha üresen hagyod, az első feltöltött kép lesz a borító.
      </div>

      {categories.map(cat => {
        const label = cat.label_hu || cat.slug
        const url = covers[cat.slug] || ''
        return (
          <div key={cat.slug} className="acms-form-group acms-cover-row">
            <label>{label}</label>
            <div className="acms-cover-input-wrap">
              <input type="text" className="acms-input"
                value={url}
                onChange={e => setCover(cat.slug, e.target.value)}
                placeholder="Cloudinary kép URL (üresen = első kép)" />
              {url && (
                <div className="acms-cover-thumb">
                  <img src={cldThumb(url, 300)} alt={label} loading="lazy" />
                </div>
              )}
            </div>
          </div>
        )
      })}

      <button className="acms-btn-primary" onClick={save} disabled={saving}>
        {saving ? 'Mentés...' : 'Borítók mentése'}
      </button>
      {saved && <span className="acms-hint" style={{ marginLeft: '1rem' }}>Elmentve.</span>}
    </div>
  )
}