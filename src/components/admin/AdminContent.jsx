import { useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useSiteContent } from '../../hooks'

// Csoportok – melyik kulcsok tartoznak össze
const GROUPS = [
  {
    id: 'hero',
    label: 'Hero szekció',
    fields: [
      { key: 'hero_line1_hu',    label: 'Főcím 1. sor – Magyar',  type: 'text' },
      { key: 'hero_line2_hu',    label: 'Főcím 2. sor – Magyar',  type: 'text' },
      { key: 'hero_subtitle_hu', label: 'Alcím – Magyar',          type: 'textarea' },
      { key: 'hero_cta_hu',      label: 'CTA gomb – Magyar',       type: 'text' },
      { key: 'hero_line1_en',    label: 'Main title line 1 – EN',  type: 'text' },
      { key: 'hero_line2_en',    label: 'Main title line 2 – EN',  type: 'text' },
      { key: 'hero_subtitle_en', label: 'Subtitle – EN',           type: 'textarea' },
      { key: 'hero_cta_en',      label: 'CTA button – EN',         type: 'text' },
    ],
  },
  {
    id: 'about',
    label: 'Rólam szekció',
    fields: [
      { key: 'about_bio1_hu', label: 'Bio 1. bekezdés – Magyar', type: 'textarea' },
      { key: 'about_bio2_hu', label: 'Bio 2. bekezdés – Magyar', type: 'textarea' },
      { key: 'about_bio3_hu', label: 'Bio 3. bekezdés – Magyar', type: 'textarea' },
      { key: 'about_bio1_en', label: 'Bio paragraph 1 – EN',     type: 'textarea' },
      { key: 'about_bio2_en', label: 'Bio paragraph 2 – EN',     type: 'textarea' },
      { key: 'about_bio3_en', label: 'Bio paragraph 3 – EN',     type: 'textarea' },
    ],
  },
]

export default function AdminContent() {
  const { content, loading, refetch } = useSiteContent()
  const [edits,  setEdits]  = useState({})   // { key: newValue }
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [error,  setError]  = useState('')

  const getValue = (key) =>
    key in edits ? edits[key] : (content[key] || '')

  const handleChange = (key, value) => {
    setSaved(false)
    setEdits(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    const keys = Object.keys(edits)
    if (keys.length === 0) return

    setSaving(true)
    setError('')

    // Minden módosított kulcsot upsert-tel mentünk
    const upserts = keys.map(key => ({ key, value: edits[key] }))
    const { error } = await supabase
      .from('site_content')
      .upsert(upserts, { onConflict: 'key' })

    if (error) { setError('Mentési hiba: ' + error.message) }
    else {
      setSaved(true)
      setEdits({})
      await refetch()
    }
    setSaving(false)
  }

  const hasChanges = Object.keys(edits).length > 0

  if (loading) return <div className="admin-empty">Betöltés...</div>

  return (
    <div className="acms-section">
      <div className="acms-section-header">
        <div>
          <div className="acms-section-title">Oldal tartalom</div>
          <div className="acms-section-sub">Hero és Rólam szövegek</div>
        </div>
        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
          {saved && !hasChanges && <span className="acms-success">✓ Mentve</span>}
          {hasChanges && (
            <button className="acms-btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Mentés...' : `Mentés (${Object.keys(edits).length} változás)`}
            </button>
          )}
        </div>
      </div>

      {error && <div className="acms-error" style={{ margin: '0 0 1rem' }}>{error}</div>}

      {GROUPS.map(group => (
        <div key={group.id} className="acms-content-group">
          <div className="acms-content-group-label">{group.label}</div>
          <div className="acms-content-fields">
            {group.fields.map(field => (
              <div key={field.key} className="acms-form-group">
                <label>
                  {field.label}
                  {edits[field.key] !== undefined && (
                    <span className="acms-changed-dot" title="Nem mentett változás" />
                  )}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    className="acms-input acms-textarea"
                    value={getValue(field.key)}
                    onChange={e => handleChange(field.key, e.target.value)}
                    rows={3}
                  />
                ) : (
                  <input
                    type="text"
                    className="acms-input"
                    value={getValue(field.key)}
                    onChange={e => handleChange(field.key, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Sticky mentés gomb alul */}
      {hasChanges && (
        <div className="acms-sticky-save">
          <button className="acms-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Mentés...' : `Változások mentése (${Object.keys(edits).length})`}
          </button>
        </div>
      )}
    </div>
  )
}
