import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../supabaseClient'
import SortableList, { SortableItem } from './SortableList'

const TYPE_OPTIONS = [
  { value: 'text_images', label: 'Szöveg + 2×2 kép' },
  { value: 'images_text', label: '2×2 kép + szöveg' },
  { value: 'text_only',   label: 'Csak szöveg' },
  { value: 'images_only', label: 'Csak képek (max 4/sor)' },
]
const ALIGN_OPTIONS = [
  { value: 'left',   label: '← Bal' },
  { value: 'center', label: '↔ Közép' },
  { value: 'right',  label: 'Jobb →' },
]
const SIZE_OPTIONS = [
  { value: 'small',  label: 'Kis' },
  { value: 'normal', label: 'Normál' },
  { value: 'large',  label: 'Nagy' },
]
const TYPE_LABEL = Object.fromEntries(TYPE_OPTIONS.map((o) => [o.value, o.label]))

function thumb(url, w = 200) {
  if (!url || !url.includes('/upload/')) return url
  if (/\/upload\/[^/]*(?:w_|q_|f_)/.test(url)) return url
  return url.replace('/upload/', `/upload/f_auto,q_auto,w_${w}/`)
}

function Picker({ options, value, onChange }) {
  return (
    <div className="acms-align-picker">
      {options.map((o) => (
        <button key={o.value} type="button"
          className={`acms-align-btn ${value === o.value ? 'active' : ''}`}
          onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  )
}

const emptySection = (categoryId, sort) => ({
  category_id: categoryId, sort_order: sort, type: 'text_images',
  title_hu: '', title_en: '', body_hu: '', body_en: '',
  image_ids: [], title_align: 'left', title_size: 'large',
  body_align: 'left', body_size: 'normal', visible: true,
})

export default function AdminCategorySections({ categoryId, categoryItems, lang }) {
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('category_sections')
      .select('*')
      .eq('category_id', categoryId)
      .order('sort_order', { ascending: true })
    setSections(data || [])
    setLoading(false)
  }, [categoryId])

  useEffect(() => { setEditingId(null); load() }, [load])

  const openEdit = (s) => {
    setEditingId(s.id)
    setForm({ ...s, image_ids: s.image_ids || [] })
    setError('')
  }

  const addSection = async () => {
    const maxSort = sections.reduce((m, s) => Math.max(m, s.sort_order), -1)
    const { data, error: err } = await supabase
      .from('category_sections')
      .insert(emptySection(categoryId, maxSort + 1))
      .select()
      .single()
    if (err) { setError('Hozzáadási hiba: ' + err.message); return }
    await load()
    if (data) openEdit(data)
  }

  const save = async () => {
    if (!form) return
    setSaving(true); setError('')
    const payload = {
      type: form.type,
      title_hu: form.title_hu, title_en: form.title_en,
      body_hu: form.body_hu, body_en: form.body_en,
      image_ids: form.image_ids,
      title_align: form.title_align, title_size: form.title_size,
      body_align: form.body_align, body_size: form.body_size,
      visible: form.visible,
    }
    const { error: err } = await supabase.from('category_sections').update(payload).eq('id', editingId)
    setSaving(false)
    if (err) { setError('Mentési hiba: ' + err.message); return }
    setEditingId(null)
    load()
  }

  const del = async (id) => {
    if (!window.confirm('Törlöd ezt a szekciót?')) return
    await supabase.from('category_sections').delete().eq('id', id)
    if (editingId === id) setEditingId(null)
    load()
  }

  const persistOrder = async (orderedIds) => {
    // optimista UI + minden sor sort_order-ének újraszámozása
    const byId = new Map(sections.map((s) => [s.id, s]))
    setSections(orderedIds.map((id, i) => ({ ...byId.get(id), sort_order: i })))
    await Promise.all(
      orderedIds.map((id, i) =>
        supabase.from('category_sections').update({ sort_order: i }).eq('id', id))
    )
    load()
  }

  const toggleVisible = async (s) => {
    await supabase.from('category_sections').update({ visible: !s.visible }).eq('id', s.id)
    load()
  }

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const toggleImg = (id) =>
    setForm((f) => ({
      ...f,
      image_ids: f.image_ids.includes(id) ? f.image_ids.filter((x) => x !== id) : [...f.image_ids, id],
    }))

  const showImages = form && form.type !== 'text_only'
  const showText = form && form.type !== 'images_only'

  return (
    <div className="acms-secs">
      <div className="acms-secs-head">
        <h3 className="acms-secs-title">Szekciók</h3>
        <button className="acms-btn-primary acms-btn-sm" onClick={addSection}>+ Új szekció</button>
      </div>
      <p className="acms-hint">
        Ha nincs szekció, az aloldal a teljes képgridet mutatja. Szekciókkal váltakozó
        blokkokat építhetsz. A képeknél: kijelölés = kézi sorrend; üresen hagyva
        automatikusan a kategória képeiből tölt.
      </p>

      {loading ? (
        <div className="acms-loading">Betöltés…</div>
      ) : sections.length === 0 ? (
        <div className="acms-secs-empty">Még nincs szekció ebben a kategóriában.</div>
      ) : (
        <SortableList items={sections.map((s) => s.id)} onReorder={persistOrder}>
          <div className="acms-secs-list">
            {sections.map((s) => (
              <SortableItem key={s.id} id={s.id}>
                <div className={`acms-sec-row ${!s.visible ? 'is-hidden' : ''}`}>
                  <div className="acms-sec-info">
                    <span className="acms-sec-type">{TYPE_LABEL[s.type] || s.type}</span>
                    <span className="acms-sec-name">{s.title_hu || '(cím nélkül)'}</span>
                    <span className="acms-sec-meta">
                      {s.type === 'text_only'
                        ? 'szöveg'
                        : (s.image_ids?.length ? `${s.image_ids.length} kézi kép` : 'auto képek')}
                    </span>
                  </div>
                  <div className="acms-sec-actions">
                    <button className="acms-chip" onClick={() => toggleVisible(s)}>
                      {s.visible ? 'Látható' : 'Rejtett'}
                    </button>
                    <button className="acms-chip" onClick={() => openEdit(s)}>Szerkeszt</button>
                    <button className="acms-chip acms-chip--danger" onClick={() => del(s.id)}>Töröl</button>
                  </div>
                </div>
              </SortableItem>
            ))}
          </div>
        </SortableList>
      )}

      {/* Szerkesztő panel */}
      {form && (
        <div className="acms-sec-editor">
          <div className="acms-sec-editor-head">
            <strong>Szekció szerkesztése</strong>
            <button className="acms-chip" onClick={() => setEditingId(null)}>Bezár</button>
          </div>

          <div className="acms-form-group">
            <label className="acms-label">Típus</label>
            <select className="acms-input" value={form.type} onChange={(e) => set('type', e.target.value)}>
              {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {showText && (
            <>
              <div className="acms-form-group">
                <label className="acms-label">Cím ({lang.toUpperCase()})</label>
                <input className="acms-input"
                  value={lang === 'hu' ? form.title_hu : form.title_en}
                  onChange={(e) => set(lang === 'hu' ? 'title_hu' : 'title_en', e.target.value)}
                  placeholder="Szekció címe (elhagyható)" />
              </div>
              <div className="acms-form-group">
                <label className="acms-label">Szöveg ({lang.toUpperCase()})</label>
                <textarea className="acms-input acms-textarea" rows={5}
                  value={lang === 'hu' ? form.body_hu : form.body_en}
                  onChange={(e) => set(lang === 'hu' ? 'body_hu' : 'body_en', e.target.value)}
                  placeholder="Új bekezdés = Enter" />
              </div>
              <div className="acms-preset-grid">
                <div className="acms-form-group">
                  <label className="acms-label">Cím igazítás</label>
                  <Picker options={ALIGN_OPTIONS} value={form.title_align} onChange={(v) => set('title_align', v)} />
                </div>
                <div className="acms-form-group">
                  <label className="acms-label">Cím méret</label>
                  <Picker options={SIZE_OPTIONS} value={form.title_size} onChange={(v) => set('title_size', v)} />
                </div>
                <div className="acms-form-group">
                  <label className="acms-label">Szöveg igazítás</label>
                  <Picker options={ALIGN_OPTIONS} value={form.body_align} onChange={(v) => set('body_align', v)} />
                </div>
                <div className="acms-form-group">
                  <label className="acms-label">Szöveg méret</label>
                  <Picker options={SIZE_OPTIONS} value={form.body_size} onChange={(v) => set('body_size', v)} />
                </div>
              </div>
            </>
          )}

          {showImages && (
            <div className="acms-form-group">
              <label className="acms-label">
                Képek — {form.image_ids.length ? `${form.image_ids.length} kijelölve (kézi sorrend)` : 'üres → automatikus'}
              </label>
              {categoryItems.length === 0 ? (
                <div className="acms-hint">Ehhez a kategóriához még nincs kép (a Portfólió fülön adhatsz).</div>
              ) : (
                <div className="acms-img-picker">
                  {categoryItems.map((it) => {
                    const i = form.image_ids.indexOf(it.id)
                    return (
                      <button key={it.id} type="button"
                        className={`acms-img-cell ${i >= 0 ? 'selected' : ''}`}
                        onClick={() => toggleImg(it.id)} title={it.title || ''}>
                        <img src={thumb(it.cloudinary_url, 200)} alt={it.title || ''} loading="lazy" />
                        {i >= 0 && <span className="acms-img-badge">{i + 1}</span>}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {error && <div className="acms-error">{error}</div>}
          <div className="acms-cat-actions">
            <button className="acms-btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Mentés…' : 'Szekció mentése'}
            </button>
            <button className="acms-chip" onClick={() => setEditingId(null)}>Mégse</button>
          </div>
        </div>
      )}
    </div>
  )
}
