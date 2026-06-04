import { useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useServices } from '../../hooks'

export default function AdminServices() {
  const { services, loading, refetch } = useServices()
  const [editing, setEditing] = useState(null)
  const [form,    setForm]    = useState({})
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  const [saved,   setSaved]   = useState(false)

  const openEdit = (s) => {
    setEditing(s.id)
    setForm({
      number:    s.number,
      name_hu:   s.name_hu,
      name_en:   s.name_en,
      desc_hu:   s.desc_hu,
      desc_en:   s.desc_en,
      sort_order: s.sort_order,
    })
    setError('')
    setSaved(false)
  }

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.name_hu.trim() || !form.name_en.trim()) {
      setError('A név (HU és EN) kötelező.'); return
    }
    setSaving(true)
    setError('')

    const { error } = await supabase
      .from('services')
      .update({
        number:     form.number,
        name_hu:    form.name_hu.trim(),
        name_en:    form.name_en.trim(),
        desc_hu:    form.desc_hu.trim(),
        desc_en:    form.desc_en.trim(),
        sort_order: parseInt(form.sort_order) || 0,
      })
      .eq('id', editing)

    if (error) { setError('Mentési hiba: ' + error.message) }
    else { setSaved(true); await refetch() }
    setSaving(false)
  }

  return (
    <div className="acms-section">
      <div className="acms-section-header">
        <div>
          <div className="acms-section-title">Szolgáltatások</div>
          <div className="acms-section-sub">HU/EN szövegek szerkesztése</div>
        </div>
      </div>

      {loading ? (
        <div className="admin-empty">Betöltés...</div>
      ) : (
        <div className="acms-services-grid">
          {services.map(s => (
            <div
              key={s.id}
              className={`acms-service-card ${editing === s.id ? 'acms-service-card--active' : ''}`}
              onClick={() => editing !== s.id && openEdit(s)}
            >
              <div className="acms-service-num">{s.number}</div>

              {editing === s.id ? (
                /* Szerkesztő form */
                <form onSubmit={handleSave} onClick={e => e.stopPropagation()}>
                  <div className="acms-form-group">
                    <label>Név – Magyar</label>
                    <input name="name_hu" className="acms-input" value={form.name_hu} onChange={handleChange} />
                  </div>
                  <div className="acms-form-group">
                    <label>Leírás – Magyar</label>
                    <textarea name="desc_hu" className="acms-input acms-textarea" value={form.desc_hu} onChange={handleChange} rows={3} />
                  </div>
                  <div className="acms-form-group">
                    <label>Név – English</label>
                    <input name="name_en" className="acms-input" value={form.name_en} onChange={handleChange} />
                  </div>
                  <div className="acms-form-group">
                    <label>Description – English</label>
                    <textarea name="desc_en" className="acms-input acms-textarea" value={form.desc_en} onChange={handleChange} rows={3} />
                  </div>
                  {error && <div className="acms-error">{error}</div>}
                  {saved && <div className="acms-success">✓ Mentve</div>}
                  <div className="acms-form-actions">
                    <button type="button" className="acms-btn-secondary" onClick={() => setEditing(null)}>Mégse</button>
                    <button type="submit" className="acms-btn-primary" disabled={saving}>{saving ? 'Mentés...' : 'Mentés'}</button>
                  </div>
                </form>
              ) : (
                /* Megjelenítés */
                <>
                  <div className="acms-service-name">{s.name_hu}</div>
                  <div className="acms-service-desc">{s.desc_hu}</div>
                  <div className="acms-service-en">{s.name_en}</div>
                  <div className="acms-edit-hint">Kattints a szerkesztéshez</div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
