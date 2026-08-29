import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useSiteContent, useCategories } from '../../hooks'

// Promó felugró ablak szerkesztője. Tartalom (mint a ThankYou popup) + ELHELYEZÉS:
// első látogatáskor a főoldalon, vagy kiválasztott publikus aloldalakon.
// A tartalmat a site_content promo_popup_* kulcsaiban tárolja.
function safeArr(s) { try { return JSON.parse(s || '[]') } catch { return [] } }

const FIELDS = ['eyebrow', 'title1', 'title2', 'body', 'button']

export default function AdminPromoPopup() {
  const { content, refetch } = useSiteContent()
  const { categories } = useCategories()
  const [cfg, setCfg]       = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)

  useEffect(() => {
    if (cfg !== null) return
    const base = {
      enabled: content.promo_popup_enabled === 'true',
      trigger: content.promo_popup_trigger || 'first_visit',
      pages:   safeArr(content.promo_popup_pages),
      link:    content.promo_popup_link || '',
    }
    for (const k of FIELDS) {
      base[`${k}_hu`] = content[`promo_popup_${k}_hu`] || ''
      base[`${k}_en`] = content[`promo_popup_${k}_en`] || ''
    }
    setCfg(base)
  }, [content, cfg])

  if (!cfg) return null

  // Csak PUBLIKUS, főoldalról elérhető aloldalak (termékismertető/admin kizárva)
  const publicPages = [
    { path: '/',           label: 'Főoldal' },
    { path: '/portfolio',  label: 'Portfólió áttekintő' },
    ...categories.map(c => ({ path: `/portfolio/${c.slug}`, label: `Portfólió – ${c.label_hu || c.slug}` })),
    { path: '/adatkezeles', label: 'Adatkezelési tájékoztató' },
    { path: '/impresszum',  label: 'Impresszum' },
  ]

  const set = (k, v) => { setCfg(p => ({ ...p, [k]: v })); setSaved(false) }
  const togglePage = (path) => {
    setCfg(p => ({ ...p, pages: p.pages.includes(path) ? p.pages.filter(x => x !== path) : [...p.pages, path] }))
    setSaved(false)
  }

  const save = async () => {
    setSaving(true); setSaved(false)
    const rows = [
      { key: 'promo_popup_enabled', value: cfg.enabled ? 'true' : 'false' },
      { key: 'promo_popup_trigger', value: cfg.trigger },
      { key: 'promo_popup_pages',   value: JSON.stringify(cfg.pages) },
      { key: 'promo_popup_link',    value: cfg.link || '' },
      { key: 'promo_popup_ver',     value: String(Date.now()) },  // verzió-bump → mindenki újra látja
    ]
    for (const k of FIELDS) {
      rows.push({ key: `promo_popup_${k}_hu`, value: cfg[`${k}_hu`] || '' })
      rows.push({ key: `promo_popup_${k}_en`, value: cfg[`${k}_en`] || '' })
    }
    const { error } = await supabase.from('site_content').upsert(rows, { onConflict: 'key' })
    setSaving(false)
    if (!error) { setSaved(true); refetch() }
  }

  return (
    <div className="acms-section">
      {/* Engedélyezés + elhelyezés */}
      <div className="acms-content-group">
        <div className="acms-content-group-label">Felugró ablak – beállítás</div>

        <label className="acms-switch-row" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
          <input type="checkbox" checked={cfg.enabled} onChange={e => set('enabled', e.target.checked)} />
          <span className="acms-switch-label">Felugró ablak bekapcsolva</span>
        </label>

        <div className="acms-form-group">
          <label>Mikor jelenjen meg?</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input type="radio" name="promo-trigger" checked={cfg.trigger === 'first_visit'}
                onChange={() => set('trigger', 'first_visit')} />
              <span>Az oldal első megnyitásakor (főoldal)</span>
            </label>
            <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input type="radio" name="promo-trigger" checked={cfg.trigger === 'subpage'}
                onChange={() => set('trigger', 'subpage')} />
              <span>Kiválasztott aloldal(ak) megnyitásakor</span>
            </label>
          </div>
        </div>

        {cfg.trigger === 'subpage' && (
          <div className="acms-form-group">
            <label>Mely aloldalakon jelenjen meg?</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {publicPages.map(pg => (
                <label key={pg.path} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input type="checkbox" checked={cfg.pages.includes(pg.path)} onChange={() => togglePage(pg.path)} />
                  <span>{pg.label} <span style={{ opacity: 0.5 }}>({pg.path})</span></span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="acms-form-group">
          <label>Gomb linkje (opcionális – ha üres, a gomb csak bezár)</label>
          <input type="text" className="acms-input" value={cfg.link}
            onChange={e => set('link', e.target.value)} placeholder="https://... vagy /portfolio" />
        </div>
      </div>

      {/* Tartalom – HU/EN, popup-előnézet */}
      <div className="acms-content-group">
        <div className="acms-content-group-label">Felugró ablak – szöveg</div>
        {[{ lng: 'Magyar', sfx: 'hu' }, { lng: 'English', sfx: 'en' }].map(({ lng, sfx }) => (
          <div key={sfx} className="acms-popup-editor">
            <div className="acms-popup-lang">{lng}</div>
            <div className="acms-popup-box">
              <input className="acms-popup-eyebrow" value={cfg[`eyebrow_${sfx}`]}
                onChange={e => set(`eyebrow_${sfx}`, e.target.value)} placeholder="kis felirat a cím fölött" />
              <input className="acms-popup-title" value={cfg[`title1_${sfx}`]}
                onChange={e => set(`title1_${sfx}`, e.target.value)} placeholder="Cím – 1. sor" />
              <input className="acms-popup-title acms-popup-title--accent" value={cfg[`title2_${sfx}`]}
                onChange={e => set(`title2_${sfx}`, e.target.value)} placeholder="Cím – 2. sor (kiemelt)" />
              <div className="acms-popup-field">
                <span className="acms-popup-flabel">Szöveg</span>
                <textarea className="acms-popup-body" rows={2} value={cfg[`body_${sfx}`]}
                  onChange={e => set(`body_${sfx}`, e.target.value)} />
              </div>
              <input className="acms-popup-btn" value={cfg[`button_${sfx}`]}
                onChange={e => set(`button_${sfx}`, e.target.value)} placeholder="Gomb felirat" />
            </div>
          </div>
        ))}

        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="acms-btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Mentés...' : 'Mentés'}
          </button>
          {saved && <span className="acms-saved-badge">✓ Mentve</span>}
        </div>
        <div className="acms-hint" style={{ marginTop: '0.8rem' }}>
          Mentés után a felugró ablak <strong>újra megjelenik</strong> minden látogatónak (akkor is, ha korábban már bezárták).
        </div>
      </div>
    </div>
  )
}