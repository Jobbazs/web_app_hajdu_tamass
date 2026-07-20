import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabaseClient'
import { useCategories } from '../../hooks'
import { usePortfolio } from '../../hooks'
import AdminCategorySections from './AdminCategorySections'

// 3 igazítási preset (a spec szerint: bal 0-75%, közép 0-100%, jobb 25-100%)
const ALIGN_OPTIONS = [
  { value: 'left',   label: '← Bal' },
  { value: 'center', label: '↔ Közép' },
  { value: 'right',  label: 'Jobb →' },
]
const SIZE_OPTIONS = [
  { value: 'small',  label: 'Kis' },
  { value: 'normal', label: 'Normál' },
  { value: 'large',  label: 'Nagy' },
]

// A szerkeszthető mezők – csak ezeket írjuk a DB-be
const editableFields = (cat) => ({
  hero_subtitle_hu:   cat.hero_subtitle_hu   || '',
  hero_subtitle_en:   cat.hero_subtitle_en   || '',
  intro_hu:           cat.intro_hu           || '',
  intro_en:           cat.intro_en           || '',
  cover_url:          cat.cover_url          || '',
  hero_align:         cat.hero_align         || 'center',
  hero_title_size:    cat.hero_title_size    || 'large',
  hero_subtitle_size: cat.hero_subtitle_size || 'normal',
  intro_align:        cat.intro_align        || 'left',
  intro_size:         cat.intro_size         || 'normal',
})

// Előnézet-segédek (a Category.css logikájával egyezőek)
const alignStyle = (a) =>
  a === 'left'  ? { textAlign: 'left',  marginRight: 'auto', maxWidth: '75%' } :
  a === 'right' ? { textAlign: 'right', marginLeft: 'auto', maxWidth: '75%' } :
                  { textAlign: 'center', marginLeft: 'auto', marginRight: 'auto', maxWidth: '100%' }
const sizeScale = (s) => (s === 'small' ? 0.82 : s === 'large' ? 1.32 : 1)

function cldThumb(url, w = 500) {
  if (!url || !url.includes('/upload/')) return url
  if (/\/upload\/[^/]*(?:w_|q_|f_)/.test(url)) return url
  return url.replace('/upload/', `/upload/f_auto,q_auto,w_${w}/`)
}

function Picker({ options, value, onChange }) {
  return (
    <div className="acms-align-picker">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={`acms-align-btn ${value === o.value ? 'active' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export default function AdminCategories() {
  const { categories, loading, refetch } = useCategories()
  const { items } = usePortfolio()
  const [activeId, setActiveId] = useState(null)
  const [lang, setLang] = useState('hu')
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // első kategória kiválasztása betöltéskor
  useEffect(() => {
    if (!activeId && categories.length) setActiveId(categories[0].id)
  }, [activeId, categories])

  const activeCat = useMemo(
    () => categories.find((c) => c.id === activeId) || null,
    [categories, activeId]
  )

  const categoryItems = useMemo(
    () =>
      activeCat
        ? items
            .filter((i) => i.category_id === activeCat.id)
            .map((i) => ({ id: i.id, cloudinary_url: i.cloudinary_url, title: i.title }))
        : [],
    [items, activeCat]
  )

  // kategóriaváltáskor a mezők betöltése
  useEffect(() => {
    if (activeCat) {
      setForm(editableFields(activeCat))
      setSaved(false)
      setError('')
    }
  }, [activeCat])

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }))
    setSaved(false)
  }

  const handleSave = async () => {
    if (!activeCat || !form) return
    setSaving(true)
    setError('')
    const { error: err } = await supabase
      .from('portfolio_categories')
      .update(form)
      .eq('id', activeCat.id)
    setSaving(false)
    if (err) {
      setError('Mentési hiba: ' + err.message)
      return
    }
    setSaved(true)
    refetch()
  }

  if (loading || !form || !activeCat) {
    return <div className="acms-loading">Betöltés…</div>
  }

  const subtitleKey = `hero_subtitle_${lang}`
  const introKey = `intro_${lang}`
  const wordCount = (form[introKey] || '').trim().split(/\s+/).filter(Boolean).length

  return (
    <div className="acms-categories">
      <div className="acms-cat-head">
        <div>
          <h2 className="acms-h2">Kategória-oldalak</h2>
          <p className="acms-hint">
            A <code>/portfolio/&lt;slug&gt;</code> aloldalak szövege és megjelenése. A képeket a
            Portfólió fülön rendeled a kategóriához — itt a hero, az intro és a megjelenés állítható.
          </p>
        </div>
        <div className="acms-lang-toggle">
          <button className={lang === 'hu' ? 'active' : ''} onClick={() => setLang('hu')}>HU</button>
          <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
        </div>
      </div>

      {/* Kategória-választó */}
      <div className="acms-cat-tabs">
        {categories.map((c) => (
          <button
            key={c.id}
            className={`acms-cat-tab ${activeId === c.id ? 'active' : ''}`}
            onClick={() => setActiveId(c.id)}
          >
            {c.label_hu}
          </button>
        ))}
      </div>

      <div className="acms-cat-editor">
        {/* BAL: szerkesztő */}
        <div className="acms-cat-fields">
          <div className="acms-form-group">
            <label className="acms-label">Hero alcím ({lang.toUpperCase()})</label>
            <textarea
              className="acms-input acms-textarea"
              rows={2}
              value={form[subtitleKey]}
              onChange={(e) => set(subtitleKey, e.target.value)}
              placeholder="Rövid, egy mondatos alcím a cím alá"
            />
          </div>

          <div className="acms-form-group">
            <label className="acms-label">Bemutatkozó / intro szöveg ({lang.toUpperCase()})</label>
            <textarea
              className="acms-input acms-textarea"
              rows={9}
              value={form[introKey]}
              onChange={(e) => set(introKey, e.target.value)}
              placeholder="200–500 szavas leírás. Új bekezdés = új sor (Enter)."
            />
            <span className="acms-hint">{wordCount} szó · új bekezdés = Enter</span>
          </div>

          <div className="acms-form-group">
            <label className="acms-label">Borítókép URL (hub-kártya + megosztás)</label>
            <input
              className="acms-input"
              value={form.cover_url}
              onChange={(e) => set('cover_url', e.target.value)}
              placeholder="Cloudinary URL – üresen az első kategóriakép lesz a borító"
            />
          </div>

          <div className="acms-preset-grid">
            <div className="acms-form-group">
              <label className="acms-label">Hero igazítás</label>
              <Picker options={ALIGN_OPTIONS} value={form.hero_align} onChange={(v) => set('hero_align', v)} />
            </div>
            <div className="acms-form-group">
              <label className="acms-label">Cím mérete</label>
              <Picker options={SIZE_OPTIONS} value={form.hero_title_size} onChange={(v) => set('hero_title_size', v)} />
            </div>
            <div className="acms-form-group">
              <label className="acms-label">Alcím mérete</label>
              <Picker options={SIZE_OPTIONS} value={form.hero_subtitle_size} onChange={(v) => set('hero_subtitle_size', v)} />
            </div>
            <div className="acms-form-group">
              <label className="acms-label">Intro igazítás</label>
              <Picker options={ALIGN_OPTIONS} value={form.intro_align} onChange={(v) => set('intro_align', v)} />
            </div>
            <div className="acms-form-group">
              <label className="acms-label">Intro mérete</label>
              <Picker options={SIZE_OPTIONS} value={form.intro_size} onChange={(v) => set('intro_size', v)} />
            </div>
          </div>

          {error && <div className="acms-error">{error}</div>}

          <div className="acms-cat-actions">
            <button className="acms-btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Mentés…' : 'Mentés'}
            </button>
            {saved && <span className="acms-success">✓ Mentve</span>}
            <a className="acms-cat-view" href={`/portfolio/${activeCat.slug}`} target="_blank" rel="noreferrer">
              Aloldal megnyitása ↗
            </a>
          </div>
        </div>

        {/* JOBB: élő előnézet */}
        <div className="acms-cat-preview">
          <div className="acms-cat-preview-label">Élő előnézet ({lang.toUpperCase()})</div>
          <div className="acms-cat-preview-box">
            {form.cover_url && (
              <img src={cldThumb(form.cover_url, 500)} alt="" className="acms-cat-preview-cover" />
            )}
            <div style={alignStyle(form.hero_align)}>
              <div
                style={{
                  fontSize: `calc(2rem * ${sizeScale(form.hero_title_size)})`,
                  fontWeight: 'bold',
                  color: '#fff',
                  lineHeight: 1.05,
                  letterSpacing: '0.02em',
                }}
              >
                {activeCat.label_hu}
              </div>
              {form[subtitleKey] && (
                <div
                  style={{
                    fontSize: `calc(1rem * ${sizeScale(form.hero_subtitle_size)})`,
                    color: '#C8B89A',
                    marginTop: '0.35rem',
                  }}
                >
                  {form[subtitleKey]}
                </div>
              )}
            </div>

            {form[introKey] && (
              <div style={{ ...alignStyle(form.intro_align), marginTop: '1.3rem' }}>
                {form[introKey]
                  .split('\n')
                  .filter(Boolean)
                  .map((p, i) => (
                    <p
                      key={i}
                      style={{
                        fontSize: `calc(0.95rem * ${sizeScale(form.intro_size)})`,
                        color: '#C8B89A',
                        lineHeight: 1.75,
                        margin: '0 0 0.6rem',
                      }}
                    >
                      {p}
                    </p>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {activeCat && (
        <AdminCategorySections
          categoryId={activeCat.id}
          categoryItems={categoryItems}
          lang={lang}
        />
      )}
    </div>
  )
}
