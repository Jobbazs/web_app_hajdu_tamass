import { useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useServices } from '../../hooks'
import SortableList, { SortableItem } from './SortableList'
import '../../Styles/AdminServices.css'

const EMPTY_FORM = {
  number: '', name_hu: '', name_en: '',
  desc_hu: '', desc_en: '', sort_order: 0,
  extra_fields: [],
}

// Extra mező típusok
const FIELD_TYPES = [
  { value: 'text',     label: 'Szöveg' },
  { value: 'number',   label: 'Szám' },
  { value: 'textarea', label: 'Hosszú szöveg' },
]

export default function AdminServices() {
  const { services, loading, refetch } = useServices()
  const [pendingOrder, setPendingOrder] = useState(null)

  // Optimista sorrend: húzás után azonnal ezt mutatjuk, míg a refetch beér
  const displayServices = pendingOrder
    ? pendingOrder.map((id) => services.find((s) => s.id === id)).filter(Boolean)
    : services

  const reorderServices = async (ids) => {
    setPendingOrder(ids)
    await Promise.all(ids.map((id, i) => supabase.from('services').update({ sort_order: i }).eq('id', id)))
    await refetch()
    setPendingOrder(null)
  }
  const [showForm, setShowForm] = useState(false)
  const [editing,  setEditing]  = useState(null)
  const [form,     setForm]     = useState(EMPTY_FORM)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  const openNew = () => {
    setEditing(null)
    setForm({ ...EMPTY_FORM, number: `0${services.length + 1}`.slice(-2), sort_order: services.length + 1 })
    setError('')
    setShowForm(true)
  }

  const openEdit = (s) => {
    setEditing(s.id)
    setForm({
      number:       s.number,
      name_hu:      s.name_hu,
      name_en:      s.name_en,
      desc_hu:      s.desc_hu,
      desc_en:      s.desc_en,
      sort_order:   s.sort_order,
      extra_fields: s.extra_fields || [],
    })
    setError('')
    setShowForm(true)
  }

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  // ── Extra mezők kezelése ────────────────────────────────
  const addExtraField = () => {
    setForm(prev => ({
      ...prev,
      extra_fields: [
        ...prev.extra_fields,
        { key: `field_${Date.now()}`, label_hu: '', label_en: '', value: '', type: 'text' }
      ]
    }))
  }

  const updateExtraField = (idx, prop, val) => {
    setForm(prev => {
      const fields = [...prev.extra_fields]
      fields[idx] = { ...fields[idx], [prop]: val }
      return { ...prev, extra_fields: fields }
    })
  }

  const removeExtraField = (idx) => {
    setForm(prev => ({
      ...prev,
      extra_fields: prev.extra_fields.filter((_, i) => i !== idx)
    }))
  }

  // ── Mentés ──────────────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.name_hu.trim() || !form.name_en.trim()) {
      setError('A HU és EN név kötelező.'); return
    }
    setSaving(true); setError('')

    const payload = {
      number:       form.number.trim(),
      name_hu:      form.name_hu.trim(),
      name_en:      form.name_en.trim(),
      desc_hu:      form.desc_hu.trim(),
      desc_en:      form.desc_en.trim(),
      sort_order:   parseInt(form.sort_order) || 0,
      extra_fields: form.extra_fields,
    }

    const { error } = editing
      ? await supabase.from('services').update(payload).eq('id', editing)
      : await supabase.from('services').insert(payload)

    if (error) { setError('Hiba: ' + error.message); setSaving(false); return }
    await refetch()
    setShowForm(false)
    setSaving(false)
  }

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Törlöd: "${name}"?`)) return
    await supabase.from('services').delete().eq('id', id)
    await refetch()
  }

  return (
    <div className="acms-section">
      <div className="acms-section-header">
        <div>
          <div className="acms-section-title">Szolgáltatások</div>
          <div className="acms-section-sub">{services.length} szolgáltatás</div>
        </div>
        <button className="acms-btn-primary" onClick={openNew}>+ Új szolgáltatás</button>
      </div>

      {loading ? (
        <div className="admin-empty">Betöltés...</div>
      ) : services.length === 0 ? (
        <div className="admin-empty">Még nincs szolgáltatás.</div>
      ) : (
        <SortableList items={displayServices.map((s) => s.id)} onReorder={reorderServices}>
          <div className="acms-services-list">
            {displayServices.map(s => (
              <SortableItem key={s.id} id={s.id}>
                <div className="acms-srv-item">
                  <div className="acms-srv-num">{s.number}</div>
                  <div className="acms-srv-info">
                    <div className="acms-srv-name">{s.name_hu}</div>
                    <div className="acms-srv-desc">{s.desc_hu}</div>
                    {s.extra_fields?.length > 0 && (
                      <div className="acms-srv-extras">
                        {s.extra_fields.map(f => (
                          <span key={f.key} className="acms-tag">
                            {f.label_hu}{f.value ? `: ${f.value}` : ''}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="acms-list-actions">
                    <button className="acms-btn-sm" onClick={() => openEdit(s)}>Szerkeszt</button>
                    <button className="acms-btn-sm acms-btn-danger" onClick={() => handleDelete(s.id, s.name_hu)}>Töröl</button>
                  </div>
                </div>
              </SortableItem>
            ))}
          </div>
        </SortableList>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="acms-modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="acms-modal acms-modal--wide" onClick={e => e.stopPropagation()}>
            <div className="acms-modal-header">
              <span>{editing ? 'Szolgáltatás szerkesztése' : 'Új szolgáltatás'}</span>
              <button className="acms-modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>

            <form onSubmit={handleSave} className="acms-form">

              <div className="acms-form-row">
                <div className="acms-form-group">
                  <label>Sorszám</label>
                  <input name="number" className="acms-input" value={form.number} onChange={handleChange} placeholder="01" />
                </div>
                <div className="acms-form-group">
                  <label>Sorrend</label>
                  <input name="sort_order" type="number" className="acms-input" value={form.sort_order} onChange={handleChange} min="0" />
                </div>
              </div>

              <div className="acms-form-divider">Magyar</div>
              <div className="acms-form-group">
                <label>Név – Magyar *</label>
                <input name="name_hu" className="acms-input" value={form.name_hu} onChange={handleChange} placeholder="pl. Rendezvény & Buli" />
              </div>
              <div className="acms-form-group">
                <label>Leírás – Magyar</label>
                <textarea name="desc_hu" className="acms-input acms-textarea" value={form.desc_hu} onChange={handleChange} rows={3} />
              </div>

              <div className="acms-form-divider">English</div>
              <div className="acms-form-group">
                <label>Name – English *</label>
                <input name="name_en" className="acms-input" value={form.name_en} onChange={handleChange} placeholder="e.g. Event & Party" />
              </div>
              <div className="acms-form-group">
                <label>Description – English</label>
                <textarea name="desc_en" className="acms-input acms-textarea" value={form.desc_en} onChange={handleChange} rows={3} />
              </div>

              {/* Extra mezők */}
              <div className="acms-form-divider">
                Extra mezők
                <span className="acms-hint" style={{ marginLeft: '0.5rem' }}>pl. Ár, Időtartam – szabadon bővíthető</span>
              </div>

              {form.extra_fields.map((field, idx) => (
                <div key={field.key} className="acms-extra-field">
                  <div className="acms-extra-field-row">
                    <div className="acms-form-group" style={{ flex: 1 }}>
                      <label>Magyar felirat</label>
                      <input className="acms-input" value={field.label_hu}
                        onChange={e => updateExtraField(idx, 'label_hu', e.target.value)}
                        placeholder="pl. Ár" />
                    </div>
                    <div className="acms-form-group" style={{ flex: 1 }}>
                      <label>English label</label>
                      <input className="acms-input" value={field.label_en}
                        onChange={e => updateExtraField(idx, 'label_en', e.target.value)}
                        placeholder="e.g. Price" />
                    </div>
                    <div className="acms-form-group" style={{ flex: 1 }}>
                      <label>Típus</label>
                      <select className="acms-input" value={field.type}
                        onChange={e => updateExtraField(idx, 'type', e.target.value)}>
                        {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <div className="acms-form-group" style={{ flex: 1 }}>
                      <label>Értéke</label>
                      {field.type === 'textarea' ? (
                        <textarea className="acms-input acms-textarea" value={field.value}
                          onChange={e => updateExtraField(idx, 'value', e.target.value)} rows={2} />
                      ) : (
                        <input className="acms-input" type={field.type} value={field.value}
                          onChange={e => updateExtraField(idx, 'value', e.target.value)}
                          placeholder="pl. 50.000 Ft-tól" />
                      )}
                    </div>
                    <button type="button" className="acms-btn-sm acms-btn-danger acms-extra-remove"
                      onClick={() => removeExtraField(idx)} title="Mező törlése">✕</button>
                  </div>
                </div>
              ))}

              <button type="button" className="acms-btn-secondary acms-add-field-btn" onClick={addExtraField}>
                + Új mező hozzáadása
              </button>

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
