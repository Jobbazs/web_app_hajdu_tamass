import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useCategories } from '../../hooks'

// A portfólió-áttekintő csempéinek borítóképe kategóriánként.
// Tárolás: site_content `portfolio_cover_<slug>` kulcs. A lista az ÉLŐ
// kategóriákból generálódik. Van egy lépés visszaállítás (mentés előtti állapot).
function cldThumb(url, w = 300) {
  if (!url || !url.includes('/upload/')) return url
  return url.replace('/upload/', `/upload/w_${w},c_fill,q_auto,f_auto/`)
}

export default function AdminCovers() {
  const { categories } = useCategories()
  const [covers,   setCovers]   = useState({})   // { slug: url } – szerkesztett
  const [original, setOriginal] = useState({})   // utolsó mentett (DB) állapot
  const [lastSnapshot, setLastSnapshot] = useState(null)  // mentés előtti állapot (undo)
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('site_content')
        .select('key, value')
        .like('key', 'portfolio_cover_%')
      const map = {}
      for (const r of data || []) map[r.key.replace('portfolio_cover_', '')] = r.value
      setCovers(map)
      setOriginal(map)
      setLoading(false)
    })()
  }, [])

  const setCover = (slug, url) => {
    setCovers(prev => ({ ...prev, [slug]: url }))
    setSaved(false)
  }

  const upsertCovers = (map) => {
    const rows = categories.map(c => ({
      key:   `portfolio_cover_${c.slug}`,
      value: map[c.slug] || '',
    }))
    return supabase.from('site_content').upsert(rows, { onConflict: 'key' })
  }

  const save = async () => {
    setSaving(true); setSaved(false)
    const snapshot = { ...original }   // mentés ELŐTTI állapot
    const { error } = await upsertCovers(covers)
    setSaving(false)
    if (!error) {
      setSaved(true)
      setLastSnapshot(snapshot)
      setOriginal({ ...covers })
    }
  }

  const restorePrev = async () => {
    if (!lastSnapshot) return
    if (!window.confirm('Visszaállítod a legutóbbi mentés előtti borítókat?')) return
    setSaving(true)
    const { error } = await upsertCovers(lastSnapshot)
    setSaving(false)
    if (!error) {
      setCovers({ ...lastSnapshot })
      setOriginal({ ...lastSnapshot })
      setLastSnapshot(null)
      setSaved(false)
    }
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

      <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="acms-btn-primary" onClick={save} disabled={saving}>
          {saving ? 'Mentés...' : 'Borítók mentése'}
        </button>
        {lastSnapshot && (
          <button className="acms-btn-sm" onClick={restorePrev} disabled={saving}
            title="A legutóbbi mentés előtti borítók visszaállítása">
            ↶ Előző verzió visszaállítása
          </button>
        )}
        {saved && <span className="acms-saved-badge">✓ Mentve</span>}
      </div>
    </div>
  )
}