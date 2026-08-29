import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useCategories } from '../../hooks'
import '../../Styles/Poll.css'

// Több felugró ablak kezelése lenyíló (táblázatos) listában. Mindegyik: név +
// Kiemelt, elhelyezés (első látogatás / aloldalak), tartalom HU/EN. Mentésre becsukódik.
const emptyPopup = () => ({
  id: null, name: '', enabled: false, featured: false,
  trigger: 'first_visit', pages: [],
  eyebrow_hu: '', eyebrow_en: '', title1_hu: '', title1_en: '',
  title2_hu: '', title2_en: '', body_hu: '', body_en: '',
  button_hu: '', button_en: '', link: '',
})
const FIELDS = ['eyebrow', 'title1', 'title2', 'body', 'button']

export default function AdminPromoPopup() {
  const { categories } = useCategories()
  const [popups, setPopups]   = useState([])
  const [loadingList, setLL]  = useState(true)
  const [selId, setSelId]     = useState(null)
  const [pop, setPop]         = useState(null)
  const [saving, setSaving]   = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  const loadList = async () => {
    const { data } = await supabase.from('site_popups')
      .select('id, name, enabled, featured')
      .order('sort_order', { ascending: true }).order('created_at', { ascending: true })
    setPopups(data || []); setLL(false)
  }
  useEffect(() => { loadList() }, [])

  const openPopup = async (id) => {
    setConfirmDel(false)
    if (id === 'new') { setSelId('new'); setPop(emptyPopup()); return }
    const { data: p } = await supabase.from('site_popups').select('*').eq('id', id).single()
    if (!p) return
    setSelId(id); setPop({ ...p, pages: Array.isArray(p.pages) ? p.pages : [] })
  }
  const closeEditor = () => { setSelId(null); setPop(null); setConfirmDel(false) }
  const setField = (k, v) => setPop(p => ({ ...p, [k]: v }))
  const togglePage = (path) => setPop(p => ({
    ...p, pages: p.pages.includes(path) ? p.pages.filter(x => x !== path) : [...p.pages, path],
  }))

  const publicPages = [
    { path: '/', label: 'Főoldal' },
    { path: '/portfolio', label: 'Portfólió áttekintő' },
    ...categories.map(c => ({ path: `/portfolio/${c.slug}`, label: `Portfólió – ${c.label_hu || c.slug}` })),
    { path: '/adatkezeles', label: 'Adatkezelési tájékoztató' },
    { path: '/impresszum', label: 'Impresszum' },
  ]

  const save = async () => {
    setSaving(true)
    const payload = {
      name: pop.name, enabled: pop.enabled, featured: pop.featured,
      trigger: pop.trigger, pages: pop.pages, link: pop.link, version: Date.now(),
    }
    for (const k of FIELDS) { payload[`${k}_hu`] = pop[`${k}_hu`] || ''; payload[`${k}_en`] = pop[`${k}_en`] || '' }
    let err
    if (pop.id) { const r = await supabase.from('site_popups').update(payload).eq('id', pop.id); err = r.error }
    else { const r = await supabase.from('site_popups').insert(payload).select('id').single(); err = r.error }
    setSaving(false)
    if (!err) { await loadList(); closeEditor() }   // mentésre becsukódik
  }

  const deletePopup = async () => {
    if (!pop.id) { closeEditor(); return }
    await supabase.from('site_popups').delete().eq('id', pop.id)
    await loadList(); closeEditor()
  }

  const editorBlock = pop ? (
    <div className="poll-acc-body">
      <div className="acms-form-group">
        <label>Felugró ablak neve (admin)</label>
        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input className="acms-input" style={{ flex: 1, minWidth: 180 }} value={pop.name}
            onChange={e => setField('name', e.target.value)} placeholder="Pl. Nyári akció" />
          <label style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', whiteSpace: 'nowrap' }}>
            <input type="checkbox" checked={pop.featured} onChange={e => setField('featured', e.target.checked)} />
            <span className="acms-switch-label">Kiemelt</span>
          </label>
        </div>
      </div>

      <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }}>
        <input type="checkbox" checked={pop.enabled} onChange={e => setField('enabled', e.target.checked)} />
        <span className="acms-switch-label">Bekapcsolva (megjelenik a látogatóknak)</span>
      </label>

      <div className="acms-form-group">
        <label>Mikor jelenjen meg?</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input type="radio" name={`trg-${pop.id || 'new'}`} checked={pop.trigger === 'first_visit'} onChange={() => setField('trigger', 'first_visit')} />
            <span>Az oldal első megnyitásakor (főoldal)</span>
          </label>
          <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input type="radio" name={`trg-${pop.id || 'new'}`} checked={pop.trigger === 'subpage'} onChange={() => setField('trigger', 'subpage')} />
            <span>Kiválasztott aloldal(ak) megnyitásakor</span>
          </label>
        </div>
      </div>
      {pop.trigger === 'subpage' && (
        <div className="acms-form-group">
          <label>Mely aloldalakon?</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {publicPages.map(pg => (
              <label key={pg.path} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input type="checkbox" checked={pop.pages.includes(pg.path)} onChange={() => togglePage(pg.path)} />
                <span>{pg.label} <span style={{ opacity: 0.5 }}>({pg.path})</span></span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="acms-form-group">
        <label>Gomb linkje (opcionális – ha üres, a gomb csak bezár)</label>
        <input className="acms-input" value={pop.link} onChange={e => setField('link', e.target.value)} placeholder="https://... vagy /portfolio" />
      </div>

      {[{ lng: 'Magyar', s: 'hu' }, { lng: 'English', s: 'en' }].map(({ lng, s }) => (
        <div key={s} className="acms-popup-editor">
          <div className="acms-popup-lang">{lng}</div>
          <div className="acms-popup-box">
            <input className="acms-popup-eyebrow" value={pop[`eyebrow_${s}`]} onChange={e => setField(`eyebrow_${s}`, e.target.value)} placeholder="kis felirat a cím fölött" />
            <input className="acms-popup-title" value={pop[`title1_${s}`]} onChange={e => setField(`title1_${s}`, e.target.value)} placeholder="Cím – 1. sor" />
            <input className="acms-popup-title acms-popup-title--accent" value={pop[`title2_${s}`]} onChange={e => setField(`title2_${s}`, e.target.value)} placeholder="Cím – 2. sor (kiemelt)" />
            <div className="acms-popup-field">
              <span className="acms-popup-flabel">Szöveg</span>
              <textarea className="acms-popup-body" rows={2} value={pop[`body_${s}`]} onChange={e => setField(`body_${s}`, e.target.value)} />
            </div>
            <input className="acms-popup-btn" value={pop[`button_${s}`]} onChange={e => setField(`button_${s}`, e.target.value)} placeholder="Gomb felirat" />
          </div>
        </div>
      ))}

      <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="acms-btn-primary" onClick={save} disabled={saving}>{saving ? 'Mentés…' : 'Mentés'}</button>
        {pop.id && <button className="acms-btn-danger" onClick={() => setConfirmDel(true)}>Törlés</button>}
        <button className="acms-btn-sm" onClick={closeEditor}>Mégse</button>
      </div>
      <div className="acms-hint" style={{ marginTop: '0.8rem' }}>
        Megjelenik, ha az adott oldalra navigálsz, vagy frissíted (F5).
      </div>

      {confirmDel && (
        <div style={{ marginTop: '1rem', border: '1px solid var(--rust-light)', borderRadius: 4, padding: '1rem' }}>
          <p style={{ marginTop: 0 }}>Biztosan törlöd ezt a felugró ablakot?</p>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button className="acms-btn-danger" onClick={deletePopup}>Törlés véglegesen</button>
            <button className="acms-btn-sm" onClick={() => setConfirmDel(false)}>Mégse</button>
          </div>
        </div>
      )}
    </div>
  ) : null

  return (
    <div className="acms-section">
      <div className="acms-content-group">
        <div className="acms-sect-header-row">
          <div className="acms-content-group-label">Felugró ablakok</div>
          <button className="acms-btn-primary" onClick={() => openPopup('new')}>+ Új felugró ablak</button>
        </div>

        {selId === 'new' && editorBlock}

        {loadingList ? <div className="admin-empty">Betöltés…</div> : (
          popups.length === 0 ? <div className="admin-empty">Még nincs felugró ablak.</div> : (
            <div className="poll-acc-list">
              {popups.map(p => (
                <div key={p.id} className="poll-acc-item">
                  <div className="poll-acc-head" onClick={() => (selId === p.id ? closeEditor() : openPopup(p.id))}>
                    <span className="poll-acc-name">
                      {p.name || '(név nélkül)'}
                      {p.enabled
                        ? <span className="poll-acc-badge">aktív</span>
                        : <span className="poll-acc-badge poll-acc-badge--closed">rejtett</span>}
                      {p.featured && <span className="poll-acc-badge" style={{ background: '#E0A800', color: '#1a1510' }}>kiemelt</span>}
                    </span>
                    <span className={`poll-acc-tri ${selId === p.id ? 'open' : ''}`} aria-hidden="true">▸</span>
                  </div>
                  {selId === p.id && editorBlock}
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}