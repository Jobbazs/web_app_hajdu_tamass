import { useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useSiteContent, useCustomSections } from '../../hooks'

const FIXED_GROUPS = [
  {
    id: 'hero', label: 'Hero szekció',
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
    id: 'about', label: 'Rólam szekció',
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

const ALIGN_OPTIONS = [
  { value: 'left',         label: '← Bal' },
  { value: 'center-left',  label: '← Bal-közép' },
  { value: 'center',       label: '↔ Közép' },
  { value: 'center-right', label: 'Jobb-közép →' },
  { value: 'right',        label: 'Jobb →' },
]

const LINE_HEIGHT_OPTIONS = [
  { value: '1.4',  label: 'Szűk (1.4)' },
  { value: '1.6',  label: 'Normal (1.6)' },
  { value: '1.75', label: 'Kényelmes (1.75)' },
  { value: '2.0',  label: 'Tágas (2.0)' },
  { value: '2.4',  label: 'Levegős (2.4)' },
]

const FONT_SIZE_OPTIONS = [
  { value: 'small',  label: 'Kis' },
  { value: 'normal', label: 'Normál' },
  { value: 'large',  label: 'Nagy' },
]

const EMPTY_SECTION = {
  title_hu: '', title_en: '', body_hu: '', body_en: '',
  align: 'left', line_height: '1.75', font_size: 'normal',
  visible: true, sort_order: 0,
}

export default function AdminContent() {
  // ── Rögzített szövegek (hero/about) ─────────────────────
  const { content, loading: contentLoading, refetch: refetchContent } = useSiteContent()
  const [edits,   setEdits]   = useState({})
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState('')

  // ── Custom sections ──────────────────────────────────────
  const { sections, loading: sectLoading, refetch: refetchSections } = useCustomSections()
  const [showSectForm, setShowSectForm] = useState(false)
  const [editingSect,  setEditingSect]  = useState(null)
  const [sectForm,     setSectForm]     = useState(EMPTY_SECTION)
  const [sectSaving,   setSectSaving]   = useState(false)
  const [sectError,    setSectError]    = useState('')

  // ── Active tab ───────────────────────────────────────────
  const [tab, setTab] = useState('fixed') // 'fixed' | 'sections'

  // ── Rögzített szöveg kezelés ─────────────────────────────
  const getValue = (key) => key in edits ? edits[key] : (content[key] || '')

  const handleChange = (key, value) => {
    setSaved(false)
    setEdits(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    const keys = Object.keys(edits)
    if (keys.length === 0) return
    setSaving(true); setError('')
    const { error } = await supabase
      .from('site_content')
      .upsert(keys.map(key => ({ key, value: edits[key] })), { onConflict: 'key' })
    if (error) setError('Mentési hiba: ' + error.message)
    else { setSaved(true); setEdits({}); await refetchContent() }
    setSaving(false)
  }

  const hasChanges = Object.keys(edits).length > 0

  // ── Custom section kezelés ───────────────────────────────
  const openNewSect = () => {
    setEditingSect(null)
    setSectForm({ ...EMPTY_SECTION, sort_order: sections.length })
    setSectError('')
    setShowSectForm(true)
  }

  const openEditSect = (s) => {
    setEditingSect(s.id)
    setSectForm({
      title_hu:    s.title_hu,
      title_en:    s.title_en,
      body_hu:     s.body_hu,
      body_en:     s.body_en,
      align:       s.align,
      line_height: s.line_height,
      font_size:   s.font_size,
      visible:     s.visible,
      sort_order:  s.sort_order,
    })
    setSectError('')
    setShowSectForm(true)
  }

  const handleSectChange = (e) => {
    const { name, value, type, checked } = e.target
    setSectForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSectSave = async (e) => {
    e.preventDefault()
    if (!sectForm.body_hu.trim()) { setSectError('A magyar szöveg kötelező.'); return }
    setSectSaving(true); setSectError('')
    const { error } = editingSect
      ? await supabase.from('custom_sections').update(sectForm).eq('id', editingSect)
      : await supabase.from('custom_sections').insert(sectForm)
    if (error) { setSectError('Hiba: ' + error.message); setSectSaving(false); return }
    await refetchSections()
    setShowSectForm(false)
    setSectSaving(false)
  }

  const toggleSectVisible = async (id, current) => {
    await supabase.from('custom_sections').update({ visible: !current }).eq('id', id)
    await refetchSections()
  }

  const deleteSect = async (id, title) => {
    if (!window.confirm(`Törlöd: "${title || 'Névtelen szekció'}"?`)) return
    await supabase.from('custom_sections').delete().eq('id', id)
    await refetchSections()
  }

  return (
    <div className="acms-section">
      <div className="acms-section-header">
        <div>
          <div className="acms-section-title">Oldal tartalom</div>
          <div className="acms-section-sub">Szövegek és egyedi szekciók</div>
        </div>
        {tab === 'sections' && (
          <button className="acms-btn-primary" onClick={openNewSect}>+ Új szekció</button>
        )}
        {tab === 'fixed' && hasChanges && (
          <button className="acms-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Mentés...' : `Mentés (${Object.keys(edits).length})`}
          </button>
        )}
      </div>

      {/* Sub-tab */}
      <div className="acms-subtabs">
        <button className={`acms-subtab ${tab === 'fixed' ? 'active' : ''}`} onClick={() => setTab('fixed')}>
          Hero & Rólam
        </button>
        <button className={`acms-subtab ${tab === 'sections' ? 'active' : ''}`} onClick={() => setTab('sections')}>
          Egyedi szekciók {sections.length > 0 && `(${sections.length})`}
        </button>
      </div>

      {/* ── RÖGZÍTETT SZÖVEGEK ── */}
      {tab === 'fixed' && (
        <>
          {error && <div className="acms-error" style={{ marginBottom: '1rem' }}>{error}</div>}
          {saved && !hasChanges && <div className="acms-success" style={{ marginBottom: '1rem' }}>✓ Mentve</div>}

          {contentLoading ? <div className="admin-empty">Betöltés...</div> : FIXED_GROUPS.map(group => (
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
                      <textarea className="acms-input acms-textarea"
                        value={getValue(field.key)}
                        onChange={e => handleChange(field.key, e.target.value)}
                        rows={3} />
                    ) : (
                      <input type="text" className="acms-input"
                        value={getValue(field.key)}
                        onChange={e => handleChange(field.key, e.target.value)} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {hasChanges && (
            <div className="acms-sticky-save">
              <button className="acms-btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Mentés...' : `Változások mentése (${Object.keys(edits).length})`}
              </button>
            </div>
          )}
        </>
      )}

      {/* ── EGYEDI SZEKCIÓK ── */}
      {tab === 'sections' && (
        <>
          {sectLoading ? <div className="admin-empty">Betöltés...</div>
          : sections.length === 0 ? (
            <div className="admin-empty">
              Még nincs egyedi szekció. Hozz létre egyet a "+ Új szekció" gombbal.
              <br /><br />
              <span style={{ fontSize: '0.85rem', opacity: 0.6 }}>
                Az egyedi szekciók a Kapcsolat szekció fölött jelennek meg az oldalon,
                a megadott sorrendben.
              </span>
            </div>
          ) : (
            <div className="acms-sect-list">
              {sections.map(s => (
                <div key={s.id} className={`acms-sect-item ${!s.visible ? 'acms-hidden' : ''}`}>
                  <div className="acms-sect-preview">
                    <div
                      className="acms-sect-preview-text"
                      style={{
                        textAlign: s.align === 'center-left' ? 'left'
                          : s.align === 'center-right' ? 'right'
                          : s.align,
                        lineHeight: s.line_height,
                        fontSize: s.font_size === 'small' ? '0.85rem'
                          : s.font_size === 'large' ? '1.2rem' : '1rem',
                      }}
                    >
                      {s.title_hu && <strong>{s.title_hu}</strong>}
                      {s.title_hu && <br />}
                      {s.body_hu.slice(0, 100)}{s.body_hu.length > 100 ? '...' : ''}
                    </div>
                    <div className="acms-sect-meta">
                      <span className="acms-tag">{ALIGN_OPTIONS.find(a => a.value === s.align)?.label}</span>
                      <span className="acms-tag">sorköz {s.line_height}</span>
                      <span className="acms-tag">{FONT_SIZE_OPTIONS.find(f => f.value === s.font_size)?.label} betű</span>
                      {!s.visible && <span className="acms-tag acms-tag--dim">rejtett</span>}
                    </div>
                  </div>
                  <div className="acms-list-actions">
                    <button className="acms-btn-sm" onClick={() => toggleSectVisible(s.id, s.visible)}>
                      {s.visible ? 'Elrejt' : 'Megjelenit'}
                    </button>
                    <button className="acms-btn-sm" onClick={() => openEditSect(s)}>Szerkeszt</button>
                    <button className="acms-btn-sm acms-btn-danger" onClick={() => deleteSect(s.id, s.title_hu)}>Töröl</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── SECTION FORM MODAL ── */}
      {showSectForm && (
        <div className="acms-modal-backdrop" onClick={() => setShowSectForm(false)}>
          <div className="acms-modal acms-modal--wide" onClick={e => e.stopPropagation()}>
            <div className="acms-modal-header">
              <span>{editingSect ? 'Szekció szerkesztése' : 'Új egyedi szekció'}</span>
              <button className="acms-modal-close" onClick={() => setShowSectForm(false)}>✕</button>
            </div>

            <form onSubmit={handleSectSave} className="acms-form">

              {/* Formázás */}
              <div className="acms-form-divider">Formázás</div>
              <div className="acms-form-row acms-form-row--3">
                <div className="acms-form-group">
                  <label>Igazítás</label>
                  <select name="align" className="acms-input" value={sectForm.align} onChange={handleSectChange}>
                    {ALIGN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="acms-form-group">
                  <label>Sorköz</label>
                  <select name="line_height" className="acms-input" value={sectForm.line_height} onChange={handleSectChange}>
                    {LINE_HEIGHT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="acms-form-group">
                  <label>Betűméret</label>
                  <select name="font_size" className="acms-input" value={sectForm.font_size} onChange={handleSectChange}>
                    {FONT_SIZE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="acms-form-row">
                <div className="acms-form-group">
                  <label>Sorrend</label>
                  <input name="sort_order" type="number" className="acms-input" value={sectForm.sort_order} onChange={handleSectChange} min="0" />
                </div>
                <div className="acms-form-group acms-form-group--check">
                  <label>
                    <input name="visible" type="checkbox" checked={sectForm.visible} onChange={handleSectChange} />
                    <span>Látható az oldalon</span>
                  </label>
                </div>
              </div>

              {/* Magyar */}
              <div className="acms-form-divider">Magyar</div>
              <div className="acms-form-group">
                <label>Cím – Magyar (opcionális)</label>
                <input name="title_hu" className="acms-input" value={sectForm.title_hu} onChange={handleSectChange} placeholder="pl. Díjak & elismerések" />
              </div>
              <div className="acms-form-group">
                <label>Szöveg – Magyar *</label>
                <textarea name="body_hu" className="acms-input acms-textarea acms-textarea--tall"
                  value={sectForm.body_hu} onChange={handleSectChange} rows={6}
                  placeholder="Ide írd a szöveg tartalmát..." />
              </div>

              {/* English */}
              <div className="acms-form-divider">English</div>
              <div className="acms-form-group">
                <label>Title – English (optional)</label>
                <input name="title_en" className="acms-input" value={sectForm.title_en} onChange={handleSectChange} placeholder="e.g. Awards & recognition" />
              </div>
              <div className="acms-form-group">
                <label>Body – English</label>
                <textarea name="body_en" className="acms-input acms-textarea acms-textarea--tall"
                  value={sectForm.body_en} onChange={handleSectChange} rows={6}
                  placeholder="English version of the text..." />
              </div>

              {/* Előnézet */}
              <div className="acms-form-divider">Előnézet</div>
              <div className="acms-sect-live-preview" style={{
                textAlign: sectForm.align === 'center-left' ? 'left'
                  : sectForm.align === 'center-right' ? 'right'
                  : sectForm.align,
                lineHeight: sectForm.line_height,
                fontSize: sectForm.font_size === 'small' ? '0.9rem'
                  : sectForm.font_size === 'large' ? '1.2rem' : '1rem',
              }}>
                {sectForm.title_hu && (
                  <div className="acms-sect-preview-title">{sectForm.title_hu}</div>
                )}
                <div>{sectForm.body_hu || <em style={{ opacity: 0.4 }}>A szöveg itt fog megjelenni...</em>}</div>
              </div>

              {sectError && <div className="acms-error">{sectError}</div>}

              <div className="acms-form-actions">
                <button type="button" className="acms-btn-secondary" onClick={() => setShowSectForm(false)}>Mégse</button>
                <button type="submit" className="acms-btn-primary" disabled={sectSaving}>
                  {sectSaving ? 'Mentés...' : 'Mentés'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
