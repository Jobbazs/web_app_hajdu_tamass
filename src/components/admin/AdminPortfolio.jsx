import { useState } from 'react'
import { supabase } from '../../supabaseClient'
import { usePortfolio, useCategories } from '../../hooks'
import '../../Styles/AdminPortfolio.css'

const EMPTY_ITEM = {
  title: '', category_id: '', cloudinary_url: '',
  video_url: '', span: 'medium', visible: true, sort_order: 0,
}

const EMPTY_CAT = { slug: '', label_hu: '', label_en: '', sort_order: 0 }
const SPANS = ['large', 'medium', 'small']

export default function AdminPortfolio() {
  const { items,      loading,      refetch }                      = usePortfolio()
  const { categories, loading: catLoading, refetch: refetchCats } = useCategories()

  const [showForm,   setShowForm]   = useState(false)
  const [editing,    setEditing]    = useState(null)
  const [form,       setForm]       = useState(EMPTY_ITEM)
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState('')

  const [showCats,   setShowCats]   = useState(false)
  const [editingCat, setEditingCat] = useState(null)
  const [catForm,    setCatForm]    = useState(EMPTY_CAT)
  const [catSaving,  setCatSaving]  = useState(false)
  const [catError,   setCatError]   = useState('')

  // ── Portfolio item műveletek ─────────────────────────────────
  const openNew = () => {
    setEditing(null)
    setForm({ ...EMPTY_ITEM, category_id: categories[0]?.id || '' })
    setError('')
    setShowForm(true)
  }

  const openEdit = (item) => {
    setEditing(item.id)
    setForm({
      title:          item.title,
      category_id:    item.category_id,
      cloudinary_url: item.cloudinary_url,
      video_url:      item.video_url || '',
      span:           item.span,
      visible:        item.visible,
      sort_order:     item.sort_order,
    })
    setError('')
    setShowForm(true)
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.title.trim())          { setError('A cím kötelező.'); return }
    if (!form.cloudinary_url.trim()) { setError('A kép URL kötelező.'); return }
    if (!form.category_id)           { setError('Válassz kategóriát.'); return }

    setSaving(true); setError('')
    const payload = {
      title:          form.title.trim(),
      category_id:    form.category_id,
      cloudinary_url: form.cloudinary_url.trim(),
      video_url:      form.video_url.trim() || null,
      span:           form.span,
      visible:        form.visible,
      sort_order:     parseInt(form.sort_order) || 0,
    }

    const { error } = editing
      ? await supabase.from('portfolio_items').update(payload).eq('id', editing)
      : await supabase.from('portfolio_items').insert(payload)

    if (error) { setError('Mentési hiba: ' + error.message); setSaving(false); return }
    await refetch()
    setShowForm(false)
    setSaving(false)
  }

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Törlöd: "${title}"?`)) return
    await supabase.from('portfolio_items').delete().eq('id', id)
    await refetch()
  }

  const toggleVisible = async (id, current) => {
    await supabase.from('portfolio_items').update({ visible: !current }).eq('id', id)
    await refetch()
  }

  // ── Kategória műveletek ──────────────────────────────────────
  const openNewCat  = () => { setEditingCat(null); setCatForm(EMPTY_CAT); setCatError('') }
  const openEditCat = (cat) => {
    setEditingCat(cat.id)
    setCatForm({ slug: cat.slug, label_hu: cat.label_hu, label_en: cat.label_en, sort_order: cat.sort_order })
    setCatError('')
  }
  const handleCatChange = (e) => setCatForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleCatSave = async (e) => {
    e.preventDefault()
    if (!catForm.slug.trim())     { setCatError('A slug kötelező.'); return }
    if (!catForm.label_hu.trim()) { setCatError('A magyar név kötelező.'); return }
    if (!catForm.label_en.trim()) { setCatError('Az angol név kötelező.'); return }
    if (!/^[a-z0-9-]+$/.test(catForm.slug)) { setCatError('Slug: csak kisbetű, szám, kötőjel.'); return }

    setCatSaving(true); setCatError('')
    const payload = {
      slug: catForm.slug.trim(), label_hu: catForm.label_hu.trim(),
      label_en: catForm.label_en.trim(), sort_order: parseInt(catForm.sort_order) || 0,
    }
    const { error } = editingCat
      ? await supabase.from('portfolio_categories').update(payload).eq('id', editingCat)
      : await supabase.from('portfolio_categories').insert(payload)
    if (error) { setCatError('Hiba: ' + error.message); setCatSaving(false); return }
    await refetchCats()
    setEditingCat(null); setCatForm(EMPTY_CAT); setCatSaving(false)
  }

  const handleCatDelete = async (id, slug) => {
    const { data } = await supabase.from('portfolio_items').select('id').eq('category_id', id).limit(1)
    if (data && data.length > 0) { alert('Nem törölhető: vannak portfólió elemek ebben a kategóriában.'); return }
    if (!window.confirm(`Törlöd a "${slug}" kategóriát?`)) return
    await supabase.from('portfolio_categories').delete().eq('id', id)
    await refetchCats()
  }

  const getCatLabel = (id) => categories.find(c => c.id === id)?.label_hu || 'Ismeretlen'

  return (
    <div className="acms-section">

      {/* Fejléc */}
      <div className="acms-section-header">
        <div>
          <div className="acms-section-title">Portfólió elemek</div>
          <div className="acms-section-sub">{items.length} elem · {categories.length} kategória</div>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button className="acms-btn-secondary" onClick={() => setShowCats(v => !v)}>
            {showCats ? '← Vissza' : '⚙ Kategóriák'}
          </button>
          <button className="acms-btn-primary" onClick={openNew}>+ Új elem</button>
        </div>
      </div>

      {/* ── KATEGÓRIA KEZELŐ ── */}
      {showCats && (
        <div className="acms-cat-panel">
          <div className="acms-cat-panel-title">Kategóriák kezelése</div>
          <div className="acms-cat-list">
            {categories.map(cat => (
              <div key={cat.id} className="acms-cat-item">
                {editingCat === cat.id ? (
                  <form onSubmit={handleCatSave} className="acms-cat-form">
                    <input name="slug"       className="acms-input acms-input--sm" value={catForm.slug}       onChange={handleCatChange} placeholder="slug" />
                    <input name="label_hu"   className="acms-input acms-input--sm" value={catForm.label_hu}   onChange={handleCatChange} placeholder="Magyar" />
                    <input name="label_en"   className="acms-input acms-input--sm" value={catForm.label_en}   onChange={handleCatChange} placeholder="English" />
                    <input name="sort_order" type="number" className="acms-input acms-input--sm acms-input--num" value={catForm.sort_order} onChange={handleCatChange} placeholder="0" />
                    {catError && <div className="acms-error acms-error--inline">{catError}</div>}
                    <button type="submit" className="acms-btn-sm" disabled={catSaving}>Ment</button>
                    <button type="button" className="acms-btn-sm" onClick={() => setEditingCat(null)}>Mégse</button>
                  </form>
                ) : (
                  <>
                    <span className="acms-cat-slug">{cat.slug}</span>
                    <span className="acms-cat-label">{cat.label_hu}</span>
                    <span className="acms-cat-label acms-cat-label--en">{cat.label_en}</span>
                    <span className="acms-cat-order">#{cat.sort_order}</span>
                    <button className="acms-btn-sm" onClick={() => openEditCat(cat)}>Szerkeszt</button>
                    <button className="acms-btn-sm acms-btn-danger" onClick={() => handleCatDelete(cat.id, cat.slug)}>Töröl</button>
                  </>
                )}
              </div>
            ))}
          </div>
          {editingCat === null && (
            <form onSubmit={handleCatSave} className="acms-cat-form acms-cat-form--new">
              <div className="acms-cat-form-label">+ Új kategória</div>
              <input name="slug"       className="acms-input acms-input--sm" value={catForm.slug}       onChange={handleCatChange} placeholder="pl. wedding (a-z, 0-9, -)" />
              <input name="label_hu"   className="acms-input acms-input--sm" value={catForm.label_hu}   onChange={handleCatChange} placeholder="Magyar felirat" />
              <input name="label_en"   className="acms-input acms-input--sm" value={catForm.label_en}   onChange={handleCatChange} placeholder="English label" />
              <input name="sort_order" type="number" className="acms-input acms-input--sm acms-input--num" value={catForm.sort_order} onChange={handleCatChange} placeholder="Sorrend" />
              {catError && <div className="acms-error acms-error--inline">{catError}</div>}
              <button type="submit" className="acms-btn-primary" disabled={catSaving}>
                {catSaving ? 'Mentés...' : 'Hozzáad'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* ── PORTFOLIO LISTA ── */}
      {!showCats && (
        loading ? (
          <div className="admin-empty">Betöltés...</div>
        ) : items.length === 0 ? (
          <div className="admin-empty">Még nincs portfólió elem. Adj hozzá egyet!</div>
        ) : (
          <div className="acms-list">
            {items.map(item => (
              <div key={item.id} className={`acms-list-item ${!item.visible ? 'acms-hidden' : ''}`}>
                <div className="acms-thumb">
                  {item.cloudinary_url ? (
                    <img src={item.cloudinary_url.replace(/w_\d+/, 'w_80').replace(/q_\d+/, 'q_50')} alt={item.title} />
                  ) : (
                    <div className="acms-thumb-ph">?</div>
                  )}
                </div>
                <div className="acms-list-info">
                  <div className="acms-list-name">{item.title}</div>
                  <div className="acms-list-meta">
                    <span className="acms-tag">{getCatLabel(item.category_id)}</span>
                    <span className="acms-tag">{item.span}</span>
                    {item.video_url && <span className="acms-tag">▶ videó</span>}
                    {!item.visible && <span className="acms-tag acms-tag--dim">rejtett</span>}
                  </div>
                </div>
                <div className="acms-list-actions">
                  <button className="acms-btn-sm" onClick={() => toggleVisible(item.id, item.visible)}>
                    {item.visible ? 'Elrejt' : 'Megjelenit'}
                  </button>
                  <button className="acms-btn-sm" onClick={() => openEdit(item)}>Szerkeszt</button>
                  <button className="acms-btn-sm acms-btn-danger" onClick={() => handleDelete(item.id, item.title)}>Töröl</button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── ITEM FORM MODAL ── */}
      {showForm && (
        <div className="acms-modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="acms-modal" onClick={e => e.stopPropagation()}>
            <div className="acms-modal-header">
              <span>{editing ? 'Elem szerkesztése' : 'Új portfólió elem'}</span>
              <button className="acms-modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form onSubmit={handleSave} className="acms-form">
              <div className="acms-form-group">
                <label>Cím *</label>
                <input name="title" className="acms-input" value={form.title} onChange={handleChange} placeholder="pl. Arsenal — 2024.03" />
              </div>
              <div className="acms-form-row">
                <div className="acms-form-group">
                  <label>Kategória</label>
                  <select name="category_id" className="acms-input" value={form.category_id} onChange={handleChange}>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.label_hu}</option>)}
                  </select>
                </div>
                <div className="acms-form-group">
                  <label>Sorrend</label>
                  <input name="sort_order" type="number" className="acms-input" value={form.sort_order} onChange={handleChange} min="0" />
                </div>
              </div>
              <div className="acms-form-group">
                <label>Cloudinary kép URL *</label>
                <input name="cloudinary_url" className="acms-input" value={form.cloudinary_url} onChange={handleChange} placeholder="https://res.cloudinary.com/..." />
                <span className="acms-hint">Ez lesz a kép az oldalon és a lightboxban</span>
              </div>
              <div className="acms-form-group">
                <label>Videó URL (opcionális)</label>
                <input name="video_url" className="acms-input" value={form.video_url} onChange={handleChange} placeholder="https://res.cloudinary.com/.../video.mp4" />
              </div>
              <div className="acms-form-group acms-form-group--check">
                <label>
                  <input name="visible" type="checkbox" checked={form.visible} onChange={handleChange} />
                  <span>Látható az oldalon</span>
                </label>
              </div>
              {form.cloudinary_url && (
                <div className="acms-preview">
                  <img src={form.cloudinary_url.replace(/w_\d+/, 'w_200')} alt="előnézet" />
                </div>
              )}
              {error && <div className="acms-error">{error}</div>}
              <div className="acms-form-actions">
                <button type="button" className="acms-btn-secondary" onClick={() => setShowForm(false)}>Mégse</button>
                <button type="submit" className="acms-btn-primary" disabled={saving}>
                  {saving ? 'Mentés...' : 'Mentés'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
