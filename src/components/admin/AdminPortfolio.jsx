import { useState, useMemo } from 'react'
import { supabase } from '../../supabaseClient'
import { usePortfolio, useCategories } from '../../hooks'
import SortableList, { SortableItem } from './SortableList'

const EMPTY_ITEM = {
  title: '', category_id: '', cloudinary_url: '',
  video_url: '', visible: true, sort_order: 0,
}
const EMPTY_CAT = { slug: '', label_hu: '', label_en: '', sort_order: 0 }

export default function AdminPortfolio() {
  const { items,      loading,      refetch }                      = usePortfolio()
  const { categories, loading: catLoading, refetch: refetchCats } = useCategories()

  const [pendingCatOrder, setPendingCatOrder] = useState(null)
  const displayCats = pendingCatOrder
    ? pendingCatOrder.map((id) => categories.find((c) => c.id === id)).filter(Boolean)
    : categories
  const reorderCats = async (ids) => {
    setPendingCatOrder(ids)
    await Promise.all(ids.map((id, i) => supabase.from('portfolio_categories').update({ sort_order: i }).eq('id', id)))
    await refetchCats()
    setPendingCatOrder(null)
  }

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

  // Kategória szűrő
  const [filterCat, setFilterCat] = useState('all')

  // Normalizált elemek kategória szerint csoportosítva
  const normalized = useMemo(() => items.map(item => ({
    ...item,
    categorySlug: item.portfolio_categories?.slug || item.category || '',
    categoryLabel: categories.find(c => c.id === item.category_id)?.label_hu || '—',
  })), [items, categories])

  const filtered = filterCat === 'all'
    ? normalized
    : normalized.filter(i => i.category_id === filterCat)

  // ── Portfolio item műveletek ─────────────────────────────────
  const openNew = () => {
    setEditing(null)
    setForm({ ...EMPTY_ITEM, category_id: categories[0]?.id || '' })
    setError(''); setShowForm(true)
  }

  const openEdit = (item) => {
    setEditing(item.id)
    setForm({
      title:          item.title,
      category_id:    item.category_id,
      cloudinary_url: item.cloudinary_url,
      video_url:      item.video_url || '',
      visible:        item.visible,
      sort_order:     item.sort_order,
    })
    setError(''); setShowForm(true)
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }))
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
      visible:        form.visible,
      sort_order:     parseInt(form.sort_order) || 0,
    }
    const { error } = editing
      ? await supabase.from('portfolio_items').update(payload).eq('id', editing)
      : await supabase.from('portfolio_items').insert(payload)
    if (error) { setError('Hiba: ' + error.message); setSaving(false); return }
    await refetch(); setShowForm(false); setSaving(false)
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
  const handleCatChange = (e) => setCatForm(p => ({ ...p, [e.target.name]: e.target.value }))

  const handleCatSave = async (e) => {
    e.preventDefault()
    if (!catForm.slug.trim())     { setCatError('A slug kötelező.'); return }
    if (!catForm.label_hu.trim()) { setCatError('A magyar név kötelező.'); return }
    if (!catForm.label_en.trim()) { setCatError('Az angol név kötelező.'); return }
    if (!/^[a-z0-9-]+$/.test(catForm.slug)) { setCatError('Slug: csak kisbetű, szám, kötőjel.'); return }
    setCatSaving(true); setCatError('')
    const payload = { slug: catForm.slug.trim(), label_hu: catForm.label_hu.trim(), label_en: catForm.label_en.trim(), sort_order: parseInt(catForm.sort_order) || 0 }
    const { error } = editingCat
      ? await supabase.from('portfolio_categories').update(payload).eq('id', editingCat)
      : await supabase.from('portfolio_categories').insert(payload)
    if (error) { setCatError('Hiba: ' + error.message); setCatSaving(false); return }
    await refetchCats(); setEditingCat(null); setCatForm(EMPTY_CAT); setCatSaving(false)
  }

  const handleCatDelete = async (id, slug) => {
    const { data } = await supabase.from('portfolio_items').select('id').eq('category_id', id).limit(1)
    if (data && data.length > 0) { alert('Nem törölhető: vannak elemek ebben a kategóriában.'); return }
    if (!window.confirm(`Törlöd: "${slug}"?`)) return
    await supabase.from('portfolio_categories').delete().eq('id', id)
    await refetchCats()
  }

  return (
    <div className="acms-section">
      {/* Fejléc */}
      <div className="acms-section-header">
        <div>
          <div className="acms-section-title">Portfólió elemek</div>
          <div className="acms-section-sub">{items.length} elem · {categories.length} kategória</div>
        </div>
        <div style={{ display:'flex', gap:'0.6rem', flexWrap:'wrap' }}>
          <button className="acms-btn-secondary" onClick={() => { setShowCats(v => !v) }}>
            {showCats ? '← Vissza' : '⚙ Kategóriák'}
          </button>
          <button className="acms-btn-primary" onClick={openNew}>+ Új elem</button>
        </div>
      </div>

      {/* ── KATEGÓRIA KEZELŐ ── */}
      {showCats && (
        <div className="acms-cat-panel">
          <div className="acms-cat-panel-title">Kategóriák kezelése</div>
          <SortableList items={displayCats.map((c) => c.id)} onReorder={reorderCats}>
            <div className="acms-cat-list">
              {displayCats.map(cat => (
                <SortableItem key={cat.id} id={cat.id}>
                  <div className="acms-cat-item">
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
                </SortableItem>
              ))}
            </div>
          </SortableList>
          {editingCat === null && (
            <form onSubmit={handleCatSave} className="acms-cat-form acms-cat-form--new">
              <div className="acms-cat-form-label">+ Új kategória</div>
              <input name="slug"       className="acms-input acms-input--sm" value={catForm.slug}       onChange={handleCatChange} placeholder="pl. wedding" />
              <input name="label_hu"   className="acms-input acms-input--sm" value={catForm.label_hu}   onChange={handleCatChange} placeholder="Magyar felirat" />
              <input name="label_en"   className="acms-input acms-input--sm" value={catForm.label_en}   onChange={handleCatChange} placeholder="English label" />
              <input name="sort_order" type="number" className="acms-input acms-input--sm acms-input--num" value={catForm.sort_order} onChange={handleCatChange} placeholder="Sorrend" />
              {catError && <div className="acms-error acms-error--inline">{catError}</div>}
              <button type="submit" className="acms-btn-primary" disabled={catSaving}>{catSaving ? 'Mentés...' : 'Hozzáad'}</button>
            </form>
          )}
        </div>
      )}

      {/* ── PORTFÓLIÓ GRID ── */}
      {!showCats && (
        <>
          {/* Kategória szűrő legördülő */}
          <div className="acms-port-filter-row">
            <select
              className="acms-input acms-port-cat-filter"
              value={filterCat}
              onChange={e => setFilterCat(e.target.value)}
            >
              <option value="all">Mind ({items.length})</option>
              {categories.map(c => {
                const cnt = normalized.filter(i => i.category_id === c.id).length
                return <option key={c.id} value={c.id}>{c.label_hu} ({cnt})</option>
              })}
            </select>
            <span className="acms-hint">{filtered.length} elem látható</span>
          </div>

          {loading || catLoading ? (
            <div className="admin-empty">Betöltés...</div>
          ) : filtered.length === 0 ? (
            <div className="admin-empty">Nincs elem ebben a kategóriában.</div>
          ) : (
            /* Kártyás grid – 8 oszlop desktopon */
            <div className="acms-port-grid">
              {filtered.map(item => (
                <div key={item.id} className={`acms-port-card ${!item.visible ? 'acms-port-card--hidden' : ''}`}>
                  {/* Kép – 4:3 arány, crop */}
                  <div className="acms-port-card-img">
                    {item.cloudinary_url ? (
                      <img
                        src={item.cloudinary_url}
                        alt={item.title}
                        loading="lazy"
                      />
                    ) : (
                      <div className="acms-port-card-ph">?</div>
                    )}
                    {!item.visible && (
                      <div className="acms-port-card-hidden-badge">Rejtett</div>
                    )}
                  </div>
                  {/* Gombok */}
                  <div className="acms-port-card-actions">
                    <div className="acms-port-card-title" title={item.title}>{item.title}</div>
                    <div className="acms-port-card-btns">
                      <button className="acms-btn-sm" onClick={() => toggleVisible(item.id, item.visible)}>
                        {item.visible ? 'Elrejt' : 'Megjelenit'}
                      </button>
                      <button className="acms-btn-sm" onClick={() => openEdit(item)}>Szerkeszt</button>
                      <button className="acms-btn-sm acms-btn-danger" onClick={() => handleDelete(item.id, item.title)}>Töröl</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
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
                  <img src={form.cloudinary_url} alt="előnézet" />
                </div>
              )}
              {error && <div className="acms-error">{error}</div>}
              <div className="acms-form-actions">
                <button type="button" className="acms-btn-secondary" onClick={() => setShowForm(false)}>Mégse</button>
                <button type="submit" className="acms-btn-primary" disabled={saving}>{saving ? 'Mentés...' : 'Mentés'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
