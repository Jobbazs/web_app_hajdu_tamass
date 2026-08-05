import { useState, useMemo } from 'react'
import { supabase } from '../../supabaseClient'
import { usePortfolio, useCategories } from '../../hooks'
import { cldThumb } from '../../lib/portfolioPages'
import { deleteCloudinaryAssets } from '../../lib/cloudinaryDelete'
import SortableList, { SortableItem } from './SortableList'
import CloudinaryUpload from './CloudinaryUpload'

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
    await Promise.all(ids.map((id, i) => supabase.from('portfolio_categories').update({ sort_order: i + 1 }).eq('id', id)))
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

  // Törlés-modal + tömeges kijelölés
  const [deleteCat,   setDeleteCat]   = useState(null)
  const [selectMode,  setSelectMode]  = useState(false)
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [assignTo,    setAssignTo]    = useState('')
  const [undoStack,   setUndoStack]   = useState([])

  // Normalizált elemek kategória szerint csoportosítva
  const normalized = useMemo(() => items.map(item => ({
    ...item,
    categorySlug: item.portfolio_categories?.slug || '',
    categoryLabel: categories.find(c => c.id === item.category_id)?.label_hu || '—',
  })), [items, categories])

  const uncategorizedCount = useMemo(() => normalized.filter(i => !i.category_id).length, [normalized])

  const filtered = filterCat === 'all'
    ? normalized
    : filterCat === 'uncategorized'
      ? normalized.filter(i => !i.category_id)
      : normalized.filter(i => i.category_id === filterCat)

  // Kategórián belüli kép-sorrend (drag-and-drop). Csak akkor aktív, ha egy
  // konkrét kategória van kiválasztva a szűrőben.
  const [pendingImgOrder, setPendingImgOrder] = useState(null)
  const canReorderImages = filterCat !== 'all'
  const displayItems = pendingImgOrder
    ? pendingImgOrder.map(id => filtered.find(i => i.id === id)).filter(Boolean)
    : filtered
  const reorderImages = async (ids) => {
    setPendingImgOrder(ids)
    await Promise.all(ids.map((id, i) => supabase.from('portfolio_items').update({ sort_order: i }).eq('id', id)))
    await refetch()
    setPendingImgOrder(null)
  }

  const renderCard = (item) => (
    <div key={item.id} className={`acms-port-card ${!item.visible ? 'acms-port-card--hidden' : ''} ${selectedIds.has(item.id) ? 'acms-port-card--selected' : ''}`}>
      {selectMode && (
        <label className="acms-port-select">
          <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} />
        </label>
      )}
      <div className="acms-port-card-img">
        {item.cloudinary_url ? (
          <img src={cldThumb(item.cloudinary_url, 400)} alt={item.title} loading="lazy" decoding="async" />
        ) : (
          <div className="acms-port-card-ph">?</div>
        )}
        {!item.visible && <div className="acms-port-card-hidden-badge">Rejtett</div>}
      </div>
      <div className="acms-port-card-actions">
        <div className="acms-port-card-title" title={item.title}>{item.title}</div>
        <div className="acms-port-card-btns">
          <button className="acms-btn-sm" onClick={() => toggleVisible(item.id, item.visible)}>
            {item.visible ? 'Elrejt' : 'Megjelenit'}
          </button>
          <button className="acms-btn-sm" onClick={() => openEdit(item)}>Szerkeszt</button>
          <button className="acms-btn-sm acms-btn-danger" onClick={() => handleDelete(item.id, item.title, item.cloudinary_url)}>Töröl</button>
        </div>
      </div>
    </div>
  )

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
    }
    // Új kép: a kiválasztott kategória VÉGÉRE kerül (utána húzással rendezhető).
    // Szerkesztésnél a meglévő sort_order marad (nincs a payloadban).
    if (!editing) {
      payload.sort_order = normalized.filter(i => i.category_id === form.category_id).length
    }
    const { error } = editing
      ? await supabase.from('portfolio_items').update(payload).eq('id', editing)
      : await supabase.from('portfolio_items').insert(payload)
    if (error) { setError('Hiba: ' + error.message); setSaving(false); return }
    await refetch(); setShowForm(false); setSaving(false)
  }

  const handleDelete = async (id, title, cloudinaryUrl) => {
    if (!window.confirm(`Törlöd: "${title}"?`)) return
    const { error } = await supabase.from('portfolio_items').delete().eq('id', id)
    if (error) { alert('Törlési hiba: ' + error.message); return }
    if (cloudinaryUrl) await deleteCloudinaryAssets(cloudinaryUrl)
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
    const payload = { slug: catForm.slug.trim(), label_hu: catForm.label_hu.trim(), label_en: catForm.label_en.trim() }
    const { error } = editingCat
      ? await supabase.from('portfolio_categories').update(payload).eq('id', editingCat)
      : await supabase.from('portfolio_categories').insert(payload)
    if (error) { setCatError('Hiba: ' + error.message); setCatSaving(false); return }
    await refetchCats(); setEditingCat(null); setCatForm(EMPTY_CAT); setCatSaving(false)
  }

  const deleteCategoryOnly = async () => {
    if (!deleteCat) return
    const { error } = await supabase.from('portfolio_categories').delete().eq('id', deleteCat.id)
    if (error) { alert('Törlési hiba: ' + error.message); return }
    setDeleteCat(null); await refetchCats(); await refetch()
  }
  const deleteCategoryWithImages = async () => {
    if (!deleteCat) return
    const urls = normalized.filter(i => i.category_id === deleteCat.id).map(i => i.cloudinary_url).filter(Boolean)
    const { error: e1 } = await supabase.from('portfolio_items').delete().eq('category_id', deleteCat.id)
    if (e1) { alert('Képek törlési hiba: ' + e1.message); return }
    const { error: e2 } = await supabase.from('portfolio_categories').delete().eq('id', deleteCat.id)
    if (e2) { alert('Törlési hiba: ' + e2.message); return }
    if (urls.length) await deleteCloudinaryAssets(urls)
    setDeleteCat(null); await refetchCats(); await refetch()
  }

  // Tömeges kijelölés + kategóriához rendelés + univerzális visszavonás
  const pushUndo      = (entry) => setUndoStack(s => [...s, entry])
  const snapSelection = () => pushUndo({ type: 'selection', prev: new Set(selectedIds) })

  const toggleSelect = (id) => {
    snapSelection()
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  const allSelected = filtered.length > 0 && filtered.every(i => selectedIds.has(i.id))
  const toggleAll = () => {
    snapSelection()
    setSelectedIds(allSelected ? new Set() : new Set(filtered.map(i => i.id)))
  }
  const clearSelection = () => { setSelectMode(false); setSelectedIds(new Set()); setAssignTo(''); setUndoStack([]) }

  // Visszavonás: kijelölés VAGY áthelyezés (a legutolsó művelettől visszafelé)
  const undo = async () => {
    const entry = undoStack[undoStack.length - 1]
    if (!entry) return
    setUndoStack(s => s.slice(0, -1))
    if (entry.type === 'selection') {
      setSelectedIds(new Set(entry.prev))
    } else if (entry.type === 'move') {
      await Promise.all(entry.changes.map(c =>
        supabase.from('portfolio_items').update({ category_id: c.prev }).eq('id', c.id)
      ))
      await refetch()
    }
  }

  const bulkAssign = async () => {
    if (!assignTo || selectedIds.size === 0) return
    const ids = [...selectedIds]
    const changes = normalized.filter(i => selectedIds.has(i.id)).map(i => ({ id: i.id, prev: i.category_id ?? null }))
    const { error } = await supabase.from('portfolio_items').update({ category_id: assignTo }).in('id', ids)
    if (error) { alert('Áthelyezési hiba: ' + error.message); return }
    pushUndo({ type: 'move', changes })
    setSelectedIds(new Set()); setAssignTo('')
    await refetch()
  }

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return
    if (!window.confirm(`Véglegesen törlöd a kijelölt ${selectedIds.size} képet?\n\nEz NEM vonható vissza (a Cloudinary-fájlok is törlődnek).`)) return
    const ids  = [...selectedIds]
    const urls = normalized.filter(i => selectedIds.has(i.id)).map(i => i.cloudinary_url).filter(Boolean)
    const { error } = await supabase.from('portfolio_items').delete().in('id', ids)
    if (error) { alert('Törlési hiba: ' + error.message); return }
    if (urls.length) await deleteCloudinaryAssets(urls)
    setSelectedIds(new Set())
    await refetch()
  }

  return (
    <div className="acms-section acms-section--wide">
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
                        <button className="acms-btn-sm acms-btn-danger" onClick={() => setDeleteCat(cat)}>Töröl</button>
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
              onChange={e => { setFilterCat(e.target.value); setPendingImgOrder(null); clearSelection() }}
            >
              <option value="all">Mind ({items.length})</option>
              {categories.map(c => {
                const cnt = normalized.filter(i => i.category_id === c.id).length
                return <option key={c.id} value={c.id}>{c.label_hu} ({cnt})</option>
              })}
              {uncategorizedCount > 0 && (
                <option value="uncategorized">⚠ Kategória nélküli képek ({uncategorizedCount})</option>
              )}
            </select>
            <span className="acms-hint">{filtered.length} elem látható</span>
            {filtered.length > 0 && (
              selectMode
                ? <button className="acms-btn-sm" onClick={clearSelection}>Mégse</button>
                : <button className="acms-btn-sm" onClick={() => setSelectMode(true)}>Kiválasztás</button>
            )}
          </div>

          {selectMode && (
            <div className="acms-bulk-bar">
              <span className="acms-bulk-count">{selectedIds.size} kijelölve</span>

              <label className="acms-switch" title="Összes ki/be">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                <span className="acms-switch-track"><span className="acms-switch-thumb" /></span>
                <span>Mind kijelöl</span>
              </label>

              <button className="acms-btn-sm" onClick={undo} disabled={undoStack.length === 0}>↶ Visszavonás</button>

              <span className="acms-bulk-sep" />

              <select className="acms-input acms-input--sm" value={assignTo} onChange={e => setAssignTo(e.target.value)}>
                <option value="">Kategória kiválasztása…</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.label_hu}</option>)}
              </select>
              <button className="acms-btn-primary" disabled={!assignTo || selectedIds.size === 0} onClick={bulkAssign}>Áthelyezés</button>
              <button className="acms-btn-danger"  disabled={selectedIds.size === 0} onClick={bulkDelete}>Törlés</button>
            </div>
          )}

          {loading || catLoading ? (
            <div className="admin-empty">Betöltés...</div>
          ) : filtered.length === 0 ? (
            <div className="admin-empty">Nincs elem ebben a kategóriában.</div>
          ) : canReorderImages ? (
            /* Egy kategória kiválasztva → húzható rács */
            <>
              <div className="acms-hint" style={{ marginBottom: '0.7rem' }}>
                Húzd a képeket a ⠿ fogantyúval a kívánt sorrendbe (ebben a kategóriában).
              </div>
              <SortableList items={displayItems.map(i => i.id)} onReorder={reorderImages} strategy="grid">
                <div className="acms-port-grid">
                  {displayItems.map(item => (
                    <SortableItem key={item.id} id={item.id} variant="grid">
                      {renderCard(item)}
                    </SortableItem>
                  ))}
                </div>
              </SortableList>
            </>
          ) : (
            /* "Összes" nézet → nincs húzás (a sorrend kategóriánként értelmezett) */
            <>
              <div className="acms-hint" style={{ marginBottom: '0.7rem' }}>
                A képek sorrendjének húzásához válassz egy kategóriát a fenti szűrőben.
              </div>
              <div className="acms-port-grid">
                {displayItems.map(item => renderCard(item))}
              </div>
            </>
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
              <div className="acms-form-group">
                <label>Kategória</label>
                <select name="category_id" className="acms-input" value={form.category_id} onChange={handleChange}>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.label_hu}</option>)}
                </select>
              </div>
              <div className="acms-form-group">
                <label>Cloudinary kép URL *</label>
                <CloudinaryUpload onUploaded={(url) => setForm(f => ({ ...f, cloudinary_url: url }))} />
                <input name="cloudinary_url" className="acms-input" value={form.cloudinary_url} onChange={handleChange} placeholder="…vagy illeszd be az URL-t" style={{ marginTop: '0.5rem' }} />
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
                  <img src={cldThumb(form.cloudinary_url, 600)} alt="előnézet" />
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

      {/* ── KATEGÓRIA TÖRLÉS: 2 opció ── */}
      {deleteCat && (() => {
        const imgCount = normalized.filter(i => i.category_id === deleteCat.id).length
        return (
          <div className="acms-modal-backdrop" onClick={() => setDeleteCat(null)}>
            <div className="acms-modal acms-modal--sm" onClick={e => e.stopPropagation()}>
              <div className="acms-modal-header">
                <span>Kategória törlése: „{deleteCat.label_hu}"</span>
                <button className="acms-modal-close" onClick={() => setDeleteCat(null)}>✕</button>
              </div>
              <div className="acms-del-options">
                <div className="acms-del-option">
                  <button className="acms-btn-secondary" onClick={deleteCategoryOnly}>Kategória törlése</button>
                  <p className="acms-hint">
                    Csak a kategória törlődik, a képek ({imgCount} db) az adatbázisban maradnak.
                    A kategória nélküli képek csak az admin felületen látszanak, a „Kategória nélküli
                    képek" nézetben.
                  </p>
                </div>
                <div className="acms-del-option">
                  <button className="acms-btn-danger" onClick={deleteCategoryWithImages}>
                    Kategória törlése képekkel ({imgCount} kép)
                  </button>
                  <p className="acms-hint">
                    A kategóriával együtt minden kép törlődik az adatbázisból. Ha meg akarod tartani
                    a képeket, válaszd a „Kategória törlése" opciót.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}