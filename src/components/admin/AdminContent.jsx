import { useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useSiteContent, useAllCustomSections } from '../../hooks'

// ── Rögzített szöveg csoportok – most már igazítással és betűmérettel ───────
// A site_content-ben minden mező egy key-value pár.
// Az igazítás és betűméret beállításait külön key-ként tároljuk:
// hero_line1_hu_align, hero_subtitle_hu_size, stb.
const FIXED_GROUPS = [
  {
    id: 'hero', label: 'Hero szekció',
    fields: [
      { key: 'hero_line1_hu',    label: 'Főcím 1. sor – Magyar',  type: 'text',     hasAlign: true, hasSize: false },
      { key: 'hero_line2_hu',    label: 'Főcím 2. sor – Magyar',  type: 'text',     hasAlign: true, hasSize: false },
      { key: 'hero_subtitle_hu', label: 'Alcím – Magyar',          type: 'textarea', hasAlign: true, hasSize: true  },
      { key: 'hero_cta_hu',      label: 'CTA gomb – Magyar',       type: 'text',     hasAlign: false, hasSize: false },
      { key: 'hero_line1_en',    label: 'Main title line 1 – EN',  type: 'text',     hasAlign: true, hasSize: false },
      { key: 'hero_line2_en',    label: 'Main title line 2 – EN',  type: 'text',     hasAlign: true, hasSize: false },
      { key: 'hero_subtitle_en', label: 'Subtitle – EN',           type: 'textarea', hasAlign: true, hasSize: true  },
      { key: 'hero_cta_en',      label: 'CTA button – EN',         type: 'text',     hasAlign: false, hasSize: false },
    ],
  },
  {
    id: 'about', label: 'Rólam szekció',
    fields: [
      { key: 'about_bio1_hu', label: 'Bio 1. bekezdés – Magyar', type: 'textarea', hasAlign: true, hasSize: true },
      { key: 'about_bio2_hu', label: 'Bio 2. bekezdés – Magyar', type: 'textarea', hasAlign: true, hasSize: true },
      { key: 'about_bio3_hu', label: 'Bio 3. bekezdés – Magyar', type: 'textarea', hasAlign: true, hasSize: true },
      { key: 'about_bio1_en', label: 'Bio paragraph 1 – EN',     type: 'textarea', hasAlign: true, hasSize: true },
      { key: 'about_bio2_en', label: 'Bio paragraph 2 – EN',     type: 'textarea', hasAlign: true, hasSize: true },
      { key: 'about_bio3_en', label: 'Bio paragraph 3 – EN',     type: 'textarea', hasAlign: true, hasSize: true },
    ],
  },
]

const ALIGN_OPTIONS = [
  { value: 'left',         label: '← Bal' },
  { value: 'center-left',  label: '↖ Bal-közép' },
  { value: 'center',       label: '↔ Közép' },
  { value: 'center-right', label: '↗ Jobb-közép' },
  { value: 'right',        label: 'Jobb →' },
]

const SIZE_OPTIONS = [
  { value: 'small',  label: 'Kis' },
  { value: 'normal', label: 'Normál' },
  { value: 'large',  label: 'Nagy' },
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

const FIELD_TYPES = [
  { value: 'text',     label: 'Szöveg (1 sor)' },
  { value: 'textarea', label: 'Hosszú szöveg' },
  { value: 'number',   label: 'Szám' },
]

const EMPTY_SECTION = {
  title_hu: '', title_en: '',
  body_hu:  '', body_en:  '',
  title_align:  'left',
  body_align:   'left',
  align:        'left',
  line_height:  '1.75',
  font_size:    'normal',
  visible:      true,
  sort_order:   0,
  fields:       [],
}

// ── blockStyle – azonos logika mint CustomSections.jsx ──────────────────────
// center-left:  25%-tól indul jobbra, bal igazítás  (marginLeft:25%, width:75%)
// center-right: 0%-tól 75%-ig, jobb igazítás         (marginRight:25%, width:75%)
const blockStyle = (align) => {
  switch (align) {
    case 'center-left':
      return { marginLeft:'25%', marginRight:'0',    textAlign:'left',   width:'75%', display:'block' }
    case 'center-right':
      return { marginLeft:'0',   marginRight:'25%',  textAlign:'right',  width:'75%', display:'block' }
    case 'center':
      return { marginLeft:'auto', marginRight:'auto', textAlign:'center', width:'100%', display:'block' }
    case 'right':
      return { marginLeft:'auto', marginRight:'0',   textAlign:'right',  width:'100%', display:'block' }
    default:
      return { marginLeft:'0',   marginRight:'auto', textAlign:'left',   width:'100%', display:'block' }
  }
}
// Alias a régi névhez hogy ne kelljen mindenhol átírni
const alignToStyle = (align) => blockStyle(align)

// ── AlignPicker ──────────────────────────────────────────────
function AlignPicker({ value, onChange }) {
  return (
    <div className="acms-align-picker">
      {ALIGN_OPTIONS.map(o => (
        <button key={o.value} type="button"
          className={`acms-align-btn ${value === o.value ? 'active' : ''}`}
          onClick={() => onChange(o.value)} title={o.label}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ── SizePicker ───────────────────────────────────────────────
function SizePicker({ value, onChange }) {
  return (
    <div className="acms-align-picker">
      {SIZE_OPTIONS.map(o => (
        <button key={o.value} type="button"
          className={`acms-align-btn ${value === o.value ? 'active' : ''}`}
          onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  )
}

// ── Live előnézet ────────────────────────────────────────────
function SectionPreview({ form }) {
  const fontSize = form.font_size === 'small' ? '0.9rem'
    : form.font_size === 'large' ? '1.2rem' : '1rem'

  const renderText = (text) =>
    text
      ? text.split('\n').map((line, i, arr) => (
          <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
        ))
      : <em style={{ opacity: 0.35 }}>A szöveg itt jelenik meg...</em>

  return (
    <div className="acms-sect-live-preview">
      {/* Cím */}
      {form.title_hu && (
        <div className="acms-sect-preview-title" style={{
          ...blockStyle(form.title_align),
          fontSize,
          marginBottom: '1.4rem',
        }}>
          {form.title_hu}
        </div>
      )}

      {/* Body */}
      <div className="acms-sect-preview-body" style={{
        ...blockStyle(form.body_align),
        lineHeight: form.line_height,
        fontSize,
        whiteSpace: 'pre-wrap',
      }}>
        {renderText(form.body_hu)}
      </div>

      {/* Extra mezők */}
      {form.fields.length > 0 && (
        <div className="acms-sect-preview-fields" style={{ marginTop: '1rem' }}>
          {form.fields.map((f, i) => f.value && (
            <div key={i} className="acms-sect-preview-field" style={{
              ...blockStyle(f.align || form.body_align),
              marginBottom: '0.3rem',
            }}>
              {f.label_hu && <span className="acms-sect-field-label">{f.label_hu}:&nbsp;</span>}
              <span className="acms-sect-field-value" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                {f.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
export default function AdminContent() {
  const { content, loading: contentLoading, refetch: refetchContent } = useSiteContent()
  const [edits,  setEdits]  = useState({})
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [error,  setError]  = useState('')

  // useAllCustomSections – rejtett szekciók is látszanak az adminban
  const { sections, loading: sectLoading, refetch: refetchSections } = useAllCustomSections()
  const [showSectForm, setShowSectForm] = useState(false)
  const [editingSect,  setEditingSect]  = useState(null)
  const [sectForm,     setSectForm]     = useState(EMPTY_SECTION)
  const [sectSaving,   setSectSaving]   = useState(false)
  const [sectError,    setSectError]    = useState('')

  const [tab, setTab] = useState('fixed')

  // ── Rögzített szövegek ───────────────────────────────────
  const getValue   = (key)        => key in edits ? edits[key] : (content[key] || '')
  const handleChange = (key, val) => { setSaved(false); setEdits(p => ({ ...p, [key]: val })) }
  const hasChanges   = Object.keys(edits).length > 0

  const handleSave = async () => {
    const keys = Object.keys(edits)
    if (!keys.length) return
    setSaving(true); setError('')
    const { error } = await supabase
      .from('site_content')
      .upsert(keys.map(k => ({ key: k, value: edits[k] })), { onConflict: 'key' })
    if (error) setError('Mentési hiba: ' + error.message)
    else { setSaved(true); setEdits({}); await refetchContent() }
    setSaving(false)
  }

  // ── Section kezelés ──────────────────────────────────────
  const openNewSect = () => {
    setEditingSect(null)
    setSectForm({ ...EMPTY_SECTION, sort_order: sections.length })
    setSectError('')
    setShowSectForm(true)
  }

  const openEditSect = (s) => {
    setEditingSect(s.id)
    setSectForm({
      title_hu:    s.title_hu    || '',
      title_en:    s.title_en    || '',
      body_hu:     s.body_hu     || '',
      body_en:     s.body_en     || '',
      title_align: s.title_align || s.align || 'left',
      body_align:  s.body_align  || s.align || 'left',
      align:       s.align       || 'left',
      line_height: s.line_height || '1.75',
      font_size:   s.font_size   || 'normal',
      visible:     s.visible     !== false,
      sort_order:  s.sort_order  ?? 0,
      fields:      Array.isArray(s.fields) ? JSON.parse(JSON.stringify(s.fields)) : [],
    })
    setSectError('')
    setShowSectForm(true)
  }

  const handleSectChange = (e) => {
    const { name, value, type, checked } = e.target
    setSectForm(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }))
  }

  const setAlign = (field, value) => setSectForm(p => ({ ...p, [field]: value }))

  // Extra mezők
  const addField = () => {
    setSectForm(p => ({
      ...p,
      fields: [
        ...p.fields,
        { key: `f_${Date.now()}`, label_hu: '', label_en: '', value: '', type: 'text', align: p.body_align }
      ]
    }))
  }

  const updateField = (idx, prop, val) => {
    setSectForm(p => {
      const fields = p.fields.map((f, i) => i === idx ? { ...f, [prop]: val } : f)
      return { ...p, fields }
    })
  }

  const removeField = (idx) => {
    setSectForm(p => ({ ...p, fields: p.fields.filter((_, i) => i !== idx) }))
  }

  const handleSectSave = async (e) => {
    e.preventDefault()
    if (!sectForm.body_hu.trim() && !sectForm.title_hu.trim()) {
      setSectError('Legalább a cím vagy a szöveg (Magyar) kitöltése kötelező.'); return
    }
    setSectSaving(true); setSectError('')
    const payload = { ...sectForm }
    const { error } = editingSect
      ? await supabase.from('custom_sections').update(payload).eq('id', editingSect)
      : await supabase.from('custom_sections').insert(payload)
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

  // ════════════════════════════════════════════════════════
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

          <div className="acms-fixed-hint">
            Igazítás és betűméret beállítások: minden szöveg alatt megjelenik az igazítás gombsor.
            A változás az oldalon azonnal látható mentés után.
          </div>

          {contentLoading ? <div className="admin-empty">Betöltés...</div> : FIXED_GROUPS.map(group => (
            <div key={group.id} className="acms-content-group">
              <div className="acms-content-group-label">{group.label}</div>
              <div className="acms-content-fields">
                {group.fields.map(field => (
                  <div key={field.key} className="acms-form-group acms-fixed-field">
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
                    {/* Igazítás */}
                    {field.hasAlign && (
                      <div className="acms-field-options">
                        <span className="acms-field-opt-label">Igazítás:</span>
                        <AlignPicker
                          value={getValue(field.key + '_align') || 'left'}
                          onChange={v => handleChange(field.key + '_align', v)}
                        />
                      </div>
                    )}
                    {/* Betűméret */}
                    {field.hasSize && (
                      <div className="acms-field-options">
                        <span className="acms-field-opt-label">Betűméret:</span>
                        <SizePicker
                          value={getValue(field.key + '_size') || 'normal'}
                          onChange={v => handleChange(field.key + '_size', v)}
                        />
                      </div>
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

      {/* ── EGYEDI SZEKCIÓK LISTA ── */}
      {tab === 'sections' && (
        <>
          {sectLoading ? <div className="admin-empty">Betöltés...</div>
          : sections.length === 0 ? (
            <div className="admin-empty">
              Még nincs egyedi szekció.<br /><br />
              <span style={{ fontSize: '0.85rem', opacity: 0.6 }}>
                A szekciók a Szolgáltatások és Kapcsolat között jelennek meg, megadott sorrendben.
              </span>
            </div>
          ) : (
            <div className="acms-sect-list">
              {sections.map(s => (
                <div key={s.id} className="acms-sect-item">
                  {/* Status badge */}
                  <div className="acms-sect-status">
                    <span className={`acms-status-badge ${s.visible ? 'acms-status-visible' : 'acms-status-hidden'}`}>
                      {s.visible ? 'Látható' : 'Elrejtett'}
                    </span>
                  </div>

                  <div className="acms-sect-preview">
                    <div className="acms-sect-preview-text" style={{
                      lineHeight: s.line_height || '1.75',
                      fontSize: s.font_size === 'small' ? '0.82rem' : s.font_size === 'large' ? '1rem' : '0.9rem',
                      whiteSpace: 'pre-wrap',
                    }}>
                      {s.title_hu && <strong style={{ display: 'block', marginBottom: '0.3rem' }}>{s.title_hu}</strong>}
                      {(s.body_hu || '').slice(0, 120)}{(s.body_hu || '').length > 120 ? '…' : ''}
                    </div>
                    <div className="acms-sect-meta">
                      <span className="acms-tag">cím: {ALIGN_OPTIONS.find(a => a.value === (s.title_align || 'left'))?.label}</span>
                      <span className="acms-tag">szöveg: {ALIGN_OPTIONS.find(a => a.value === (s.body_align || 'left'))?.label}</span>
                      <span className="acms-tag">sorköz {s.line_height || '1.75'}</span>
                      <span className="acms-tag">{FONT_SIZE_OPTIONS.find(f => f.value === (s.font_size || 'normal'))?.label} betű</span>
                      {s.fields?.length > 0 && <span className="acms-tag">{s.fields.length} extra mező</span>}
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
              {/* Globális */}
              <div className="acms-form-divider">Globális beállítások</div>
              <div className="acms-form-row acms-form-row--3">
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
                <div className="acms-form-group">
                  <label>Sorrend</label>
                  <input name="sort_order" type="number" className="acms-input" value={sectForm.sort_order} onChange={handleSectChange} min="0" />
                </div>
              </div>
              <div className="acms-form-group acms-form-group--check">
                <label>
                  <input name="visible" type="checkbox" checked={sectForm.visible} onChange={handleSectChange} />
                  <span>Látható az oldalon</span>
                </label>
              </div>

              {/* Magyar */}
              <div className="acms-form-divider">Magyar tartalom</div>
              <div className="acms-form-group">
                <label>Cím igazítása</label>
                <AlignPicker value={sectForm.title_align} onChange={v => setAlign('title_align', v)} />
              </div>
              <div className="acms-form-group">
                <label>Cím – Magyar (opcionális)</label>
                <input name="title_hu" className="acms-input" value={sectForm.title_hu} onChange={handleSectChange} placeholder="pl. Díjak & elismerések" />
              </div>
              <div className="acms-form-group">
                <label>Szöveg igazítása</label>
                <AlignPicker value={sectForm.body_align} onChange={v => setAlign('body_align', v)} />
              </div>
              <div className="acms-form-group">
                <label>Szöveg – Magyar</label>
                <textarea name="body_hu" className="acms-input acms-textarea acms-textarea--tall"
                  value={sectForm.body_hu} onChange={handleSectChange} rows={6}
                  placeholder="Ide írd a szöveg tartalmát...&#10;Enter = új sor" />
                <span className="acms-hint">Enter = új sor az előnézetben és az oldalon is</span>
              </div>

              {/* English */}
              <div className="acms-form-divider">English content</div>
              <div className="acms-form-group">
                <label>Title – English (optional)</label>
                <input name="title_en" className="acms-input" value={sectForm.title_en} onChange={handleSectChange} placeholder="e.g. Awards & recognition" />
              </div>
              <div className="acms-form-group">
                <label>Body – English</label>
                <textarea name="body_en" className="acms-input acms-textarea acms-textarea--tall"
                  value={sectForm.body_en} onChange={handleSectChange} rows={6}
                  placeholder="English version..." />
              </div>

              {/* Extra mezők */}
              <div className="acms-form-divider">
                Extra mezők
                <span className="acms-hint" style={{ marginLeft: '0.6rem' }}>pl. Ár, Dátum, Helyszín</span>
              </div>

              {sectForm.fields.map((field, idx) => (
                <div key={field.key || idx} className="acms-extra-field">
                  <div className="acms-extra-field-header">
                    <span className="acms-extra-field-num">#{idx + 1}</span>
                    <button type="button" className="acms-btn-sm acms-btn-danger" onClick={() => removeField(idx)}>✕ Eltávolít</button>
                  </div>
                  <div className="acms-extra-field-row">
                    <div className="acms-form-group" style={{ flex: 1 }}>
                      <label>Magyar felirat</label>
                      <input className="acms-input" value={field.label_hu}
                        onChange={e => updateField(idx, 'label_hu', e.target.value)} placeholder="pl. Ár" />
                    </div>
                    <div className="acms-form-group" style={{ flex: 1 }}>
                      <label>English label</label>
                      <input className="acms-input" value={field.label_en}
                        onChange={e => updateField(idx, 'label_en', e.target.value)} placeholder="e.g. Price" />
                    </div>
                    <div className="acms-form-group" style={{ flex: 1 }}>
                      <label>Típus</label>
                      <select className="acms-input" value={field.type}
                        onChange={e => updateField(idx, 'type', e.target.value)}>
                        {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="acms-extra-field-row">
                    <div className="acms-form-group" style={{ flex: 2 }}>
                      <label>Értéke</label>
                      {field.type === 'textarea' ? (
                        <textarea className="acms-input acms-textarea" value={field.value}
                          onChange={e => updateField(idx, 'value', e.target.value)} rows={2} />
                      ) : (
                        <input
                          className="acms-input"
                          style={{ wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'normal' }}
                          type={field.type === 'number' ? 'number' : 'text'}
                          value={field.value}
                          onChange={e => updateField(idx, 'value', e.target.value)}
                          placeholder="pl. 50.000 Ft-tól" />
                      )}
                    </div>
                    <div className="acms-form-group" style={{ flex: 3 }}>
                      <label>Igazítás</label>
                      <AlignPicker
                        value={field.align || sectForm.body_align}
                        onChange={v => updateField(idx, 'align', v)} />
                    </div>
                  </div>
                </div>
              ))}

              <button type="button" className="acms-btn-secondary acms-add-field-btn" onClick={addField}>
                + Új mező hozzáadása
              </button>

              <div className="acms-form-divider">Élő előnézet – Magyar</div>
              <SectionPreview form={sectForm} />

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
