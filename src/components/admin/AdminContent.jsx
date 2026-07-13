import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { useSiteContent, useAllCustomSections } from '../../hooks'
import '../../Styles/AdminContent.css'

// ── Rögzített szöveg csoportok ───────────────────────────────
const FIXED_GROUPS = [
  {
    id: 'hero', label: 'Hero szekció',
    fields: [
      { key: 'hero_line1_hu',    label: 'Főcím 1. sor – Magyar',  type: 'text',     hasAlign: true,  hasSize: false },
      { key: 'hero_line2_hu',    label: 'Főcím 2. sor – Magyar',  type: 'text',     hasAlign: true,  hasSize: false },
      { key: 'hero_subtitle_hu', label: 'Alcím – Magyar',          type: 'textarea', hasAlign: true,  hasSize: true  },
      { key: 'hero_cta_hu',      label: 'CTA gomb – Magyar',       type: 'text',     hasAlign: false, hasSize: false },
      { key: 'hero_line1_en',    label: 'Main title line 1 – EN',  type: 'text',     hasAlign: true,  hasSize: false },
      { key: 'hero_line2_en',    label: 'Main title line 2 – EN',  type: 'text',     hasAlign: true,  hasSize: false },
      { key: 'hero_subtitle_en', label: 'Subtitle – EN',           type: 'textarea', hasAlign: true,  hasSize: true  },
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
    hasTags: true,   // különleges flag: a TagEditor komponenst rendereli
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

// ── Kép elhelyezés opciók ────────────────────────────────────
const POS_OPTIONS = [
  { value: 'above', label: '⬆ Szöveg felett',     side: false },
  { value: 'below', label: '⬇ Szöveg alatt',       side: false },
  { value: 'left',  label: '⬅ Szöveg bal oldala',  side: true  },
  { value: 'right', label: '➡ Szöveg jobb oldala', side: true  },
]

// Kép szélesség opciók oldalnézethez (user-barát nevek)
// Oldalkép szélessége mindig 25% (Kis sáv) – fix érték

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
  images:       [],
}

// ── blockStyle – azonos logika mint CustomSections.jsx ───────
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

// ── AlignPicker ───────────────────────────────────────────────
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

// ── Cloudinary URL → kisbélyegkép URL ────────────────────────
function thumbUrl(url) {
  if (!url) return ''
  // Beillesztjük a w_80,h_60,c_fill transzformációt az upload/ után
  return url.replace('/upload/', '/upload/w_80,h_60,c_fill,f_auto,q_auto/')
}

// ── Live előnézet ─────────────────────────────────────────────
function SectionPreview({ form }) {
  const fontSize = form.font_size === 'small' ? '0.9rem'
    : form.font_size === 'large' ? '1.2rem' : '1rem'

  const renderText = (text) =>
    text
      ? text.split('\n').map((line, i, arr) => (
          <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
        ))
      : <em style={{ opacity: 0.35 }}>A szöveg itt jelenik meg...</em>

  const images     = Array.isArray(form.images) ? form.images : []
  const aboveImgs  = images.filter(img => img.position === 'above')
  const belowImgs  = images.filter(img => img.position === 'below')
  const leftImgs   = images.filter(img => img.position === 'left')
  const rightImgs  = images.filter(img => img.position === 'right')
  const hasLeft    = leftImgs.length  > 0
  const hasRight   = rightImgs.length > 0
  const leftW      = hasLeft  ? (leftImgs[0].width  || 38) : 0
  const rightW     = hasRight ? (rightImgs[0].width || 38) : 0

  let gridCols = ''
  if (hasLeft && hasRight) gridCols = `${leftW}% 1fr ${rightW}%`
  else if (hasLeft)  gridCols = `${leftW}% 1fr`
  else if (hasRight) gridCols = `1fr ${rightW}%`

  const textBlock = (
    <div>
      {form.title_hu && (
        <div className="acms-sect-preview-title" style={{
          ...blockStyle(form.title_align), fontSize, marginBottom: '1.4rem',
        }}>{form.title_hu}</div>
      )}
      <div className="acms-sect-preview-body" style={{
        ...blockStyle(form.body_align), lineHeight: form.line_height, fontSize, whiteSpace: 'pre-wrap',
      }}>
        {renderText(form.body_hu)}
      </div>
      {form.fields.length > 0 && (
        <div className="acms-sect-preview-fields" style={{ marginTop: '1rem' }}>
          {form.fields.map((f, i) => f.value && (
            <div key={i} className="acms-sect-preview-field"
              style={{ ...blockStyle(f.align || form.body_align), marginBottom: '0.3rem' }}>
              {f.label_hu && <span className="acms-sect-field-label">{f.label_hu}:&nbsp;</span>}
              <span className="acms-sect-field-value">{f.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className="acms-sect-live-preview">
      {/* Felette */}
      {aboveImgs.length > 0 && (
        <div className="acms-prev-img-row" style={{ marginBottom: '1rem' }}>
          {aboveImgs.map(img => (
            <img key={img.id} src={thumbUrl(img.url)} alt="" className="acms-prev-img" />
          ))}
        </div>
      )}

      {/* Fő tartalom: oldalkép + szöveg */}
      {(hasLeft || hasRight) ? (
        <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '0.8rem', alignItems: 'start' }}>
          {hasLeft && (
            <div className="acms-prev-side-imgs">
              {leftImgs.map(img => (
                <img key={img.id} src={thumbUrl(img.url)} alt="" className="acms-prev-img acms-prev-img--side" />
              ))}
            </div>
          )}
          {textBlock}
          {hasRight && (
            <div className="acms-prev-side-imgs">
              {rightImgs.map(img => (
                <img key={img.id} src={thumbUrl(img.url)} alt="" className="acms-prev-img acms-prev-img--side" />
              ))}
            </div>
          )}
        </div>
      ) : textBlock}

      {/* Alatta */}
      {belowImgs.length > 0 && (
        <div className="acms-prev-img-row" style={{ marginTop: '1rem' }}>
          {belowImgs.map(img => (
            <img key={img.id} src={thumbUrl(img.url)} alt="" className="acms-prev-img" />
          ))}
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════

// ── TagEditor – Rólam szekció tag kezelő ────────────────────
function TagEditor({ getValue, handleChange }) {
  const [newTagHu, setNewTagHu] = useState('')
  const [newTagEn, setNewTagEn] = useState('')

  // Tagek kiolvasása (vesszővel elválasztott string → tömb)
  const tagsHu = getValue('about_tags_hu')
    ? getValue('about_tags_hu').split(',').map(t => t.trim()).filter(Boolean)
    : []
  const tagsEn = getValue('about_tags_en')
    ? getValue('about_tags_en').split(',').map(t => t.trim()).filter(Boolean)
    : []

  const saveHu = (arr) => handleChange('about_tags_hu', arr.join(', '))
  const saveEn  = (arr) => handleChange('about_tags_en', arr.join(', '))

  const addTag = () => {
    const hu = newTagHu.trim()
    const en = newTagEn.trim()
    if (!hu) return
    saveHu([...tagsHu, hu])
    saveEn([...tagsEn, en || hu])   // ha nincs EN verzió, a HU-t duplikálja
    setNewTagHu('')
    setNewTagEn('')
  }

  const removeTag = (idx) => {
    saveHu(tagsHu.filter((_, i) => i !== idx))
    saveEn(tagsEn.filter((_, i) => i !== idx))
  }

  return (
    <div className="acms-tag-editor">
      <div className="acms-tag-editor-label">
        Tagek (pl. Rendezvény, Urbex, Portré)
      </div>

      {/* Meglévő tagek */}
      <div className="acms-tag-list">
        {tagsHu.length === 0 && (
          <span className="acms-tag-empty">Még nincs tag</span>
        )}
        {tagsHu.map((tag, idx) => (
          <div key={idx} className="acms-tag-item">
            <span className="acms-tag-hu">{tag}</span>
            {tagsEn[idx] && tagsEn[idx] !== tag && (
              <span className="acms-tag-en">/ {tagsEn[idx]}</span>
            )}
            <button
              type="button"
              className="acms-tag-remove"
              onClick={() => removeTag(idx)}
              title="Törlés"
            >✕</button>
          </div>
        ))}
      </div>

      {/* Új tag hozzáadása */}
      <div className="acms-tag-add-row">
        <input
          type="text"
          className="acms-input acms-input--sm"
          placeholder="Új tag – Magyar"
          value={newTagHu}
          onChange={e => setNewTagHu(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
        />
        <input
          type="text"
          className="acms-input acms-input--sm"
          placeholder="New tag – English"
          value={newTagEn}
          onChange={e => setNewTagEn(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
        />
        <button
          type="button"
          className="acms-btn-secondary"
          onClick={addTag}
          style={{ whiteSpace: 'nowrap' }}
        >+ Hozzáad</button>
      </div>
      <span className="acms-hint">Enter vagy + Hozzáad gomb – HU és EN egyszerre szerkeszthető</span>
    </div>
  )
}

export default function AdminContent() {
  const { content, loading: contentLoading, refetch: refetchContent } = useSiteContent()
  const [edits,  setEdits]  = useState({})
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [error,  setError]  = useState('')

  const { sections, loading: sectLoading, refetch: refetchSections } = useAllCustomSections()
  const [showSectForm, setShowSectForm] = useState(false)
  const [editingSect,  setEditingSect]  = useState(null)
  const [sectForm,     setSectForm]     = useState(EMPTY_SECTION)
  const [sectSaving,   setSectSaving]   = useState(false)
  const [sectError,    setSectError]    = useState('')

  const [tab, setTab] = useState('fixed')

  // Szekció sorrend state
  const SECTION_LABELS = {
    about:     'Rólam',
    portfolio: 'Portfólió',
    services:  'Szolgáltatások',
    booking:   'Időpontfoglalás',
    custom:    'Egyedi szekciók',
    contact:   'Kapcsolat',
  }

  const DEFAULT_SECTIONS = [
    { key: 'about',     visible: true },
    { key: 'portfolio', visible: true },
    { key: 'services',  visible: true },
    { key: 'booking',   visible: true },
    { key: 'custom',    visible: true },
    { key: 'contact',   visible: true },
  ]

  const [sectionOrder, setSectionOrder] = useState(null)   // null = betöltés alatt
  const [sectSavingO,  setSectSavingO]  = useState(false)
  const [dragIdx,      setDragIdx]      = useState(null)

  // Betöltés site_content-ből
  useEffect(() => {
    const raw = content['sections_order']
    if (raw) {
      try { setSectionOrder(JSON.parse(raw)) } catch { setSectionOrder(DEFAULT_SECTIONS) }
    } else {
      setSectionOrder(DEFAULT_SECTIONS)
    }
  }, [content])

  const saveSectionsOrder = async (newOrder) => {
    setSectSavingO(true)
    await supabase.from('site_content')
      .upsert({ key: 'sections_order', value: JSON.stringify(newOrder) }, { onConflict: 'key' })
    await refetchContent()
    setSectSavingO(false)
  }

  const toggleSectionVisible = (idx) => {
    const updated = (sectionOrder || DEFAULT_SECTIONS).map((s, i) => i === idx ? { ...s, visible: !s.visible } : s)
    setSectionOrder(updated)
    saveSectionsOrder(updated)
  }

  // Drag and drop
  const handleDragStart = (idx) => setDragIdx(idx)
  const handleDragOver  = (e, idx) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === idx) return
    const updated = [...(sectionOrder || DEFAULT_SECTIONS)]
    const [moved] = updated.splice(dragIdx, 1)
    updated.splice(idx, 0, moved)
    setSectionOrder(updated)
    setDragIdx(idx)
  }
  const handleDragEnd = () => {
    setDragIdx(null)
    saveSectionsOrder(sectionOrder || DEFAULT_SECTIONS)
  }

  // Footer social state
  const [socialSaving, setSocialSaving] = useState(false)
  const [socialError,  setSocialError]  = useState('')
  const getSocials = () => {
    try { const r = getValue('footer_socials'); return r ? JSON.parse(r) : [] }
    catch { return [] }
  }
  const saveSocials = async (arr) => {
    setSocialSaving(true); setSocialError('')
    const { error } = await supabase.from('site_content')
      .upsert({ key: 'footer_socials', value: JSON.stringify(arr) }, { onConflict: 'key' })
    if (error) setSocialError('Hiba: ' + error.message)
    else { await refetchContent() }
    setSocialSaving(false)
  }

  // Új kép hozzáadás state
  const [newImgUrl,   setNewImgUrl]   = useState('')
  const [newImgPos,   setNewImgPos]   = useState('above')
  const [imgError,    setImgError]    = useState('')

  // ── Rögzített szövegek ──────────────────────────────────
  const getValue     = (key)        => key in edits ? edits[key] : (content[key] || '')
  const handleChange = (key, val)   => { setSaved(false); setEdits(p => ({ ...p, [key]: val })) }
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

  // ── Section kezelés ─────────────────────────────────────
  const openNewSect = () => {
    setEditingSect(null)
    setSectForm({ ...EMPTY_SECTION, sort_order: sections.length })
    setSectError(''); setNewImgUrl(''); setNewImgPos('above'); setImgError('')
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
      images:      Array.isArray(s.images) ? JSON.parse(JSON.stringify(s.images)) : [],
    })
    setSectError(''); setNewImgUrl(''); setNewImgPos('above'); setImgError('')
    setShowSectForm(true)
  }

  const handleSectChange = (e) => {
    const { name, value, type, checked } = e.target
    setSectForm(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }))
  }

  const setAlign = (field, value) => setSectForm(p => ({ ...p, [field]: value }))

  // ── Extra mezők ──────────────────────────────────────────
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

  // ── Képkezelés ───────────────────────────────────────────
  const addImage = () => {
    const url = newImgUrl.trim()
    if (!url) { setImgError('Add meg a kép Cloudinary URL-jét.'); return }
    if (!url.startsWith('http')) { setImgError('Érvénytelen URL.'); return }

    const isSide = POS_OPTIONS.find(p => p.value === newImgPos)?.side
    const existing = sectForm.images

    // Limit check
    if (isSide) {
      const thisSideCount = existing.filter(img => img.position === newImgPos).length
      if (thisSideCount >= 3) {
        setImgError(`${newImgPos === 'left' ? 'Bal oldalon' : 'Jobb oldalon'} maximum 3 kép helyezhető el.`)
        return
      }
    } else {
      const posCount = existing.filter(img => img.position === newImgPos).length
      if (posCount >= 3) {
        setImgError(`${newImgPos === 'above' ? 'Fent' : 'Lent'} maximum 3 kép helyezhető el.`)
        return
      }
    }

    setImgError('')
    setSectForm(p => ({
      ...p,
      images: [
        ...p.images,
        {
          id:       `img_${Date.now()}`,
          url,
          position: newImgPos,
          width:    isSide ? 25 : null,
        }
      ]
    }))
    setNewImgUrl('')
  }

  const removeImage = (imgId) => {
    setSectForm(p => ({ ...p, images: p.images.filter(img => img.id !== imgId) }))
  }

  // ── Section mentés ───────────────────────────────────────
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
        {(tab === 'fixed' || tab === 'footer' || tab === 'portfolio' || tab === 'popup') && hasChanges && (
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
        <button className={`acms-subtab ${tab === 'footer' ? 'active' : ''}`} onClick={() => setTab('footer')}>
          Footer & Portré
        </button>
        <button className={`acms-subtab ${tab === 'portfolio' ? 'active' : ''}`} onClick={() => setTab('portfolio')}>
          Portfólió coverek
        </button>
        <button className={`acms-subtab ${tab === 'popup' ? 'active' : ''}`} onClick={() => setTab('popup')}>
          Popup szövegek
        </button>
        <button className={`acms-subtab ${tab === 'order' ? 'active' : ''}`} onClick={() => setTab('order')}>
          Szekció sorrend
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
                    {field.hasAlign && (
                      <div className="acms-field-options">
                        <span className="acms-field-opt-label">Igazítás:</span>
                        <AlignPicker
                          value={getValue(field.key + '_align') || 'left'}
                          onChange={v => handleChange(field.key + '_align', v)}
                        />
                      </div>
                    )}
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
              {/* Tag szerkesztő – csak a Rólam szekciónál */}
              {group.hasTags && (
                <TagEditor
                  getValue={getValue}
                  handleChange={handleChange}
                />
              )}
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
                      {s.images?.length > 0 && <span className="acms-tag">{s.images.length} kép</span>}
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



      {/* ── FOOTER & PORTRÉ ── */}
      {tab === 'footer' && (
        <>
          <div className="acms-content-group">
            <div className="acms-content-group-label">Portré kép (Rólam szekció)</div>
            <div className="acms-form-group">
              <label>Cloudinary kép URL</label>
              <input type="text" className="acms-input"
                value={getValue('about_portrait_url')}
                onChange={e => handleChange('about_portrait_url', e.target.value)}
                placeholder="https://res.cloudinary.com/..." />
              <span className="acms-hint">Ez jelenik meg a Rólam szekció bal oldalán</span>
            </div>
            {getValue('about_portrait_url') && (
              <div className="acms-preview" style={{width:100,height:130}}>
                <img src={getValue('about_portrait_url')} alt="előnézet" style={{width:'100%',height:'100%',objectFit:'cover'}} />
              </div>
            )}
          </div>

          <div className="acms-content-group">
            <div className="acms-content-group-label">Footer – Social linkek</div>
            <div className="acms-hint" style={{marginBottom:'1rem'}}>
              Hozzáadhatsz bármilyen platformot (Instagram, TikTok, Behance, YouTube stb.)
            </div>
            {getSocials().length === 0 && (
              <div className="admin-empty" style={{marginBottom:'1rem'}}>Még nincs social link</div>
            )}
            {getSocials().map((s, idx) => (
              <div key={idx} className="acms-social-row">
                <input type="text" className="acms-input acms-input--sm"
                  placeholder="Felirat (pl. Instagram)"
                  value={s.label}
                  onChange={e => {
                    const arr = [...getSocials()]
                    arr[idx] = { ...arr[idx], label: e.target.value }
                    handleChange('footer_socials', JSON.stringify(arr))
                  }} />
                <input type="text" className="acms-input acms-input--sm"
                  placeholder="URL (pl. https://instagram.com/...)"
                  value={s.url}
                  onChange={e => {
                    const arr = [...getSocials()]
                    arr[idx] = { ...arr[idx], url: e.target.value }
                    handleChange('footer_socials', JSON.stringify(arr))
                  }} />
                <button type="button" className="acms-btn-sm acms-btn-danger"
                  onClick={() => {
                    const arr = getSocials().filter((_, i) => i !== idx)
                    handleChange('footer_socials', JSON.stringify(arr))
                  }}>✕</button>
              </div>
            ))}
            <button type="button" className="acms-btn-secondary" style={{marginTop:'0.6rem'}}
              onClick={() => {
                const arr = [...getSocials(), { label: '', url: '' }]
                handleChange('footer_socials', JSON.stringify(arr))
              }}>
              + Új social link
            </button>
            {socialError && <div className="acms-error">{socialError}</div>}
          </div>
        </>
      )}

      {/* ── PORTFÓLIÓ COVEREK ── */}
      {tab === 'portfolio' && (
        <div className="acms-content-group">
          <div className="acms-content-group-label">Kategória borítóképek</div>
          <div className="acms-hint" style={{marginBottom:'1.2rem'}}>
            Minden kategóriához kiválaszthatod melyik kép jelenjen meg borítóként.
            Cloudinary URL-t adj meg – ha üresen hagyod, az első feltöltött kép lesz a borító.
          </div>
          {[
            {slug:'nightlife',     label:'Nightlife'},
            {slug:'studio',        label:'Studio'},
            {slug:'rendezveny',    label:'Rendezvény'},
            {slug:'sport-kultura', label:'Sport & Kultúra'},
            {slug:'kreativ',       label:'Kreatív'},
          ].map(cat => (
            <div key={cat.slug} className="acms-form-group acms-cover-row">
              <label>{cat.label}</label>
              <div className="acms-cover-input-wrap">
                <input type="text" className="acms-input"
                  value={getValue(`portfolio_cover_${cat.slug}`)}
                  onChange={e => handleChange(`portfolio_cover_${cat.slug}`, e.target.value)}
                  placeholder="Cloudinary kép URL (üresen = első kép)" />
                {getValue(`portfolio_cover_${cat.slug}`) && (
                  <div className="acms-cover-thumb">
                    <img src={getValue(`portfolio_cover_${cat.slug}`)} alt={cat.label} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── POPUP SZÖVEGEK ── */}
      {tab === 'popup' && (
        <div className="acms-content-group">
          <div className="acms-content-group-label">Köszönő popup szövegek</div>
          <div className="acms-content-fields">
            {[
              {key:'thankyou_eyebrow_hu',   label:'Eyebrow – Magyar',         type:'text'},
              {key:'thankyou_title1_hu',    label:'Cím 1. sor – Magyar',      type:'text'},
              {key:'thankyou_title2_hu',    label:'Cím 2. sor – Magyar',      type:'text'},
              {key:'thankyou_body_hu',      label:'Szöveg – Magyar',          type:'textarea'},
              {key:'thankyou_body_name_hu', label:'Szöveg névvel – Magyar',   type:'textarea'},
              {key:'thankyou_closebtn_hu',  label:'Gomb felirat – Magyar',    type:'text'},
              {key:'thankyou_dismiss_hu',   label:'Bezárás felirat – Magyar', type:'text'},
              {key:'thankyou_eyebrow_en',   label:'Eyebrow – EN',             type:'text'},
              {key:'thankyou_title1_en',    label:'Title line 1 – EN',        type:'text'},
              {key:'thankyou_title2_en',    label:'Title line 2 – EN',        type:'text'},
              {key:'thankyou_body_en',      label:'Body – EN',                type:'textarea'},
              {key:'thankyou_body_name_en', label:'Body with name – EN',      type:'textarea'},
              {key:'thankyou_closebtn_en',  label:'Button label – EN',        type:'text'},
              {key:'thankyou_dismiss_en',   label:'Dismiss label – EN',       type:'text'},
            ].map(field => (
              <div key={field.key} className="acms-form-group">
                <label>
                  {field.label}
                  {edits[field.key] !== undefined && <span className="acms-changed-dot" />}
                </label>
                {field.type === 'textarea' ? (
                  <textarea className="acms-input acms-textarea"
                    value={getValue(field.key)}
                    onChange={e => handleChange(field.key, e.target.value)}
                    rows={2} />
                ) : (
                  <input type="text" className="acms-input"
                    value={getValue(field.key)}
                    onChange={e => handleChange(field.key, e.target.value)} />
                )}
              </div>
            ))}
          </div>
          <div className="acms-hint" style={{marginTop:'0.8rem'}}>
            A névvel ellátott szövegben a <code>&#123;name&#125;</code> helyére a küldő neve kerül.
          </div>
        </div>
      )}

      {/* ── SZEKCIÓ SORREND ── */}
      {tab === 'order' && (
        <div className="acms-content-group">
          <div className="acms-content-group-label">Szekció sorrend & láthatóság</div>
          <div className="acms-hint" style={{marginBottom:'1.2rem'}}>
            Húzd át a szekciókat a kívánt sorrendbe. A Hero mindig az oldal tetején marad.
            {sectSavingO && <span style={{marginLeft:'1rem', color:'var(--accent)'}}>Mentés...</span>}
          </div>

          {/* Hero – fix, nem mozgatható */}
          <div className="acms-order-item acms-order-item--fixed">
            <span className="acms-order-handle">⠿</span>
            <span className="acms-order-label">Hero</span>
            <span className="acms-order-badge">Fix – nem mozgatható</span>
          </div>

          {/* Többi szekció – drag-and-drop */}
          {(sectionOrder || DEFAULT_SECTIONS).map((s, idx) => (
            <div
              key={s.key}
              className={`acms-order-item ${dragIdx === idx ? 'acms-order-item--dragging' : ''} ${!s.visible ? 'acms-hidden' : ''}`}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={e => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
            >
              <span className="acms-order-handle" title="Húzd ide">⠿</span>
              <span className="acms-order-label">{SECTION_LABELS[s.key] || s.key}</span>
              <div style={{display:'flex', gap:'0.5rem', marginLeft:'auto'}}>
                <button
                  className="acms-btn-sm"
                  onClick={() => toggleSectionVisible(idx)}
                >
                  {s.visible ? 'Elrejt' : 'Megjelenit'}
                </button>
              </div>
            </div>
          ))}
        </div>
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
                        <input className="acms-input"
                          type={field.type === 'number' ? 'number' : 'text'}
                          value={field.value}
                          onChange={e => updateField(idx, 'value', e.target.value)}
                          placeholder="pl. 50.000 Ft-tól" />
                      )}
                    </div>
                    <div className="acms-form-group" style={{ flex: 3 }}>
                      <label>Igazítás</label>
                      <AlignPicker value={field.align || sectForm.body_align}
                        onChange={v => updateField(idx, 'align', v)} />
                    </div>
                  </div>
                </div>
              ))}

              <button type="button" className="acms-btn-secondary acms-add-field-btn" onClick={addField}>
                + Új mező hozzáadása
              </button>

              {/* ── KÉPEK ── */}
              <div className="acms-form-divider">
                Képek
                <span className="acms-hint" style={{ marginLeft: '0.6rem' }}>
                  Fent / Lent: max 3 · Bal / Jobb: max 3
                </span>
              </div>

              {/* Meglévő képek listája */}
              {sectForm.images.length > 0 && (
                <div className="acms-img-list">
                  {sectForm.images.map(img => {
                    const posLabel = POS_OPTIONS.find(p => p.value === img.position)?.label || img.position
                    const isSide   = POS_OPTIONS.find(p => p.value === img.position)?.side
                    return (
                      <div key={img.id} className="acms-img-item">
                        <img
                          src={thumbUrl(img.url)}
                          alt=""
                          className="acms-img-thumb"
                          onError={e => { e.target.style.display = 'none' }}
                        />
                        <div className="acms-img-meta">
                          <span className="acms-tag">{posLabel}</span>
                        </div>
                        <button type="button" className="acms-btn-sm acms-btn-danger"
                          onClick={() => removeImage(img.id)}>
                          ✕ Töröl
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Új kép hozzáadása */}
              <div className="acms-img-upload">
                <div className="acms-form-group">
                  <label>Hová kerüljön a kép?</label>
                  <div className="acms-align-picker">
                    {POS_OPTIONS.map(p => (
                      <button key={p.value} type="button"
                        className={`acms-align-btn ${newImgPos === p.value ? 'active' : ''}`}
                        onClick={() => setNewImgPos(p.value)}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="acms-form-group">
                  <label>Cloudinary URL</label>
                  <input
                    className="acms-input"
                    value={newImgUrl}
                    onChange={e => { setNewImgUrl(e.target.value); setImgError('') }}
                    placeholder="https://res.cloudinary.com/dpeavk0xh/image/upload/..."
                  />
                </div>

                {imgError && <div className="acms-error acms-error--inline">{imgError}</div>}

                <button type="button" className="acms-btn-secondary" onClick={addImage}>
                  + Kép hozzáadása
                </button>
              </div>

              {/* Élő előnézet */}
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
