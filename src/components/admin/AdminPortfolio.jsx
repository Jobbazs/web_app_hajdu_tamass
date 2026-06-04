import { useState } from 'react'
import { supabase } from '../../supabaseClient'
import { usePortfolio } from '../../hooks'

const EMPTY_FORM = {
  title: '', category: 'event', cloudinary_url: '',
  video_url: '', span: 'medium', visible: true, sort_order: 0,
}

const CATEGORIES = ['event', 'portrait', 'video', 'urbex']
const SPANS      = ['large', 'medium', 'small']

export default function AdminPortfolio() {
  const { items, loading, refetch } = usePortfolio()
  const [showForm, setShowForm] = useState(false)
  const [editing,  setEditing]  = useState(null) // null = new, id = edit
  const [form,     setForm]     = useState(EMPTY_FORM)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  const openNew = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setError('')
    setShowForm(true)
  }

  const openEdit = (item) => {
    setEditing(item.id)
    setForm({
      title:          item.title,
      category:       item.category,
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
    if (!form.title.trim())         { setError('A cím kötelező.'); return }
    if (!form.cloudinary_url.trim()){ setError('A kép URL kötelező.'); return }

    setSaving(true)
    setError('')

    const payload = {
      title:          form.title.trim(),
      category:       form.category,
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

  return (
    <div className="acms-section">
      {/* Fejléc */}
      <div className="acms-section-header">
        <div>
          <div className="acms-section-title">Portfólió elemek</div>
          <div className="acms-section-sub">{items.length} elem</div>
        </div>
        <button className="acms-btn-primary" onClick={openNew}>+ Új elem</button>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="admin-empty">Betöltés...</div>
      ) : items.length === 0 ? (
        <div className="admin-empty">Még nincs portfólió elem. Adj hozzá egyet!</div>
      ) : (
        <div className="acms-list">
          {items.map(item => (
            <div key={item.id} className={`acms-list-item ${!item.visible ? 'acms-hidden' : ''}`}>
              {/* Thumbnail */}
              <div className="acms-thumb">
                {item.cloudinary_url ? (
                  <img
                    src={item.cloudinary_url.replace(/w_\d+/, 'w_80').replace(/q_\d+/, 'q_50')}
                    alt={item.title}
                  />
                ) : (
                  <div className="acms-thumb-ph">?</div>
                )}
              </div>
              {/* Info */}
              <div className="acms-list-info">
                <div className="acms-list-name">{item.title}</div>
                <div className="acms-list-meta">
                  <span className="acms-tag">{item.category}</span>
                  <span className="acms-tag">{item.span}</span>
                  {item.video_url && <span className="acms-tag">▶ videó</span>}
                  {!item.visible && <span className="acms-tag acms-tag--dim">rejtett</span>}
                </div>
              </div>
              {/* Műveletek */}
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
      )}

      {/* Form modal */}
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
                  <select name="category" className="acms-input" value={form.category} onChange={handleChange}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="acms-form-group">
                  <label>Méret (grid)</label>
                  <select name="span" className="acms-input" value={form.span} onChange={handleChange}>
                    {SPANS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="acms-form-group">
                <label>Cloudinary kép URL *</label>
                <input name="cloudinary_url" className="acms-input" value={form.cloudinary_url} onChange={handleChange} placeholder="https://res.cloudinary.com/..." />
                <span className="acms-hint">Thumbnail és lightbox képként jelenik meg</span>
              </div>

              <div className="acms-form-group">
                <label>Videó URL (opcionális)</label>
                <input name="video_url" className="acms-input" value={form.video_url} onChange={handleChange} placeholder="https://res.cloudinary.com/.../video.mp4" />
                <span className="acms-hint">Csak videó kategóriánál töltsd ki</span>
              </div>

              <div className="acms-form-row">
                <div className="acms-form-group">
                  <label>Sorrend</label>
                  <input name="sort_order" type="number" className="acms-input" value={form.sort_order} onChange={handleChange} min="0" />
                </div>
                <div className="acms-form-group acms-form-group--check">
                  <label>
                    <input name="visible" type="checkbox" checked={form.visible} onChange={handleChange} />
                    <span>Látható az oldalon</span>
                  </label>
                </div>
              </div>

              {/* Előnézet */}
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
