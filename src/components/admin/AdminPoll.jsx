import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import AdminPollStats from './AdminPollStats'

// Szavazás-kezelő (1. szakasz): létrehozás/szerkesztés, oszlopok + sorok,
// szavazat-oszlop, időzítő, aktív kapcsoló, Mentés + Előző verzió + Törlés
// (letöltés-kérdéssel), CSV/JSON export. A publikus megjelenítés + a szavazás
// a következő szakaszban jön.
const emptyPoll = () => ({
  id: null, title_hu: '', title_en: '',
  columns: [{ name_hu: '', name_en: '' }],
  has_votes: true, type: 'fixed', status: 'open', active: false,
  closes_at: '', default_view: 'percent', test_mode: false, vote_style: 'updown', live_sort: true, vote_style: 'updown', live_sort: true,
})

function toLocalInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}
function normalizeCells(cells, columns) {
  const n = (columns || []).length || 1
  const c = Array.isArray(cells) ? cells.slice(0, n) : []
  while (c.length < n) c.push({ hu: '', en: '' })
  return c.map(x => ({ hu: x?.hu || '', en: x?.en || '' }))
}
function csvCell(s) { return `"${String(s ?? '').replace(/"/g, '""')}"` }
function download(name, text, mime) {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = name; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function AdminPoll() {
  const [polls, setPolls]         = useState([])
  const [loadingList, setLL]      = useState(true)
  const [selId, setSelId]         = useState(null)
  const [poll, setPoll]           = useState(null)
  const [rows, setRows]           = useState([])
  const [pending, setPending]     = useState([])   // jóváhagyásra váró javaslatok
  const [removed, setRemoved]     = useState([])
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [snapshot, setSnapshot]   = useState(null)
  const [confirmDel, setConfirmDel] = useState(false)
  const [msg, setMsg]             = useState('')

  const loadList = async () => {
    const { data } = await supabase.from('polls')
      .select('id, title_hu, status, active').order('created_at', { ascending: false })
    setPolls(data || []); setLL(false)
  }
  useEffect(() => { loadList() }, [])

  const openPoll = async (id) => {
    setMsg(''); setSaved(false); setSnapshot(null); setRemoved([]); setConfirmDel(false)
    if (id === 'new') { setSelId('new'); setPoll(emptyPoll()); setRows([]); setPending([]); return }
    const { data: p } = await supabase.from('polls').select('*').eq('id', id).single()
    const { data: opts } = await supabase.from('poll_options').select('*').eq('poll_id', id).order('sort_order')
    if (!p) return
    const cols = Array.isArray(p.columns) && p.columns.length ? p.columns : [{ name_hu: '', name_en: '' }]
    setSelId(id)
    setPoll({
      id: p.id, title_hu: p.title_hu, title_en: p.title_en, columns: cols,
      has_votes: p.has_votes, type: p.type, status: p.status, active: p.active,
      closes_at: toLocalInput(p.closes_at), default_view: p.default_view, test_mode: p.test_mode, vote_style: p.vote_style || 'updown', live_sort: p.live_sort !== false,
    })
    const all = opts || []
    setRows(all.filter(o => o.approved).map(o => ({ id: o.id, cells: normalizeCells(o.cells, cols), up: o.up_votes, down: o.down_votes })))
    setPending(all.filter(o => !o.approved).map(o => ({ id: o.id, cells: normalizeCells(o.cells, cols) })))
  }

  // ── Moderálás (jóváhagyásra váró javaslatok) ──
  const setPendCell = (ri, ci, key, v) => {
    setPending(ps => ps.map((r, x) => x === ri
      ? { ...r, cells: r.cells.map((c, y) => y === ci ? { ...c, [key]: v } : c) } : r))
  }
  const approvePending = async (row) => {
    await supabase.from('poll_options').update({ cells: row.cells, approved: true, sort_order: rows.length }).eq('id', row.id)
    await openPoll(poll.id)
  }
  const rejectPending = async (row) => {
    if (!window.confirm('Elveted ezt a javaslatot (törlés)?')) return
    await supabase.from('poll_options').delete().eq('id', row.id)
    await openPoll(poll.id)
  }

  const setField = (k, v) => { setPoll(p => ({ ...p, [k]: v })); setSaved(false) }

  // ── Oszlop-műveletek ──
  const addColumn = () => {
    setPoll(p => ({ ...p, columns: [...p.columns, { name_hu: '', name_en: '' }] }))
    setRows(rs => rs.map(r => ({ ...r, cells: [...r.cells, { hu: '', en: '' }] })))
    setSaved(false)
  }
  const removeColumn = (i) => {
    setPoll(p => ({ ...p, columns: p.columns.filter((_, x) => x !== i) }))
    setRows(rs => rs.map(r => ({ ...r, cells: r.cells.filter((_, x) => x !== i) })))
    setSaved(false)
  }
  const setColName = (i, key, v) => {
    setPoll(p => ({ ...p, columns: p.columns.map((c, x) => x === i ? { ...c, [key]: v } : c) }))
    setSaved(false)
  }

  // ── Sor-műveletek ──
  const addRow = () => {
    setRows(rs => [...rs, { id: null, cells: poll.columns.map(() => ({ hu: '', en: '' })), up: 0, down: 0 }])
    setSaved(false)
  }
  const removeRow = (idx) => {
    setRows(rs => {
      const r = rs[idx]
      if (r.id) setRemoved(prev => [...prev, r.id])
      return rs.filter((_, x) => x !== idx)
    })
    setSaved(false)
  }
  const moveRow = (idx, dir) => {
    setRows(rs => {
      const j = idx + dir
      if (j < 0 || j >= rs.length) return rs
      const c = [...rs]; [c[idx], c[j]] = [c[j], c[idx]]; return c
    })
    setSaved(false)
  }
  const setCell = (ri, ci, key, v) => {
    setRows(rs => rs.map((r, x) => x === ri
      ? { ...r, cells: r.cells.map((c, y) => y === ci ? { ...c, [key]: v } : c) } : r))
    setSaved(false)
  }

  // ── Mentés (poll + opciók CRUD; a szavazatszámokat nem írja felül) ──
  const closeEditor = () => { setSelId(null); setPoll(null); setRows([]); setPending([]); setSnapshot(null); setSaved(false) }

  const save = async () => {
    setSaving(true); setMsg('')
    // undo-hoz a mentés előtti beállítások (a sorok szövege is)
    const snap = { poll: { ...poll }, rows: rows.map(r => ({ id: r.id, cells: r.cells.map(c => ({ ...c })) })) }
    const payload = {
      title_hu: poll.title_hu, title_en: poll.title_en, columns: poll.columns,
      has_votes: poll.has_votes, type: poll.type, status: poll.status, active: poll.active,
      closes_at: poll.closes_at ? new Date(poll.closes_at).toISOString() : null,
      default_view: poll.default_view, test_mode: poll.test_mode, vote_style: poll.vote_style, live_sort: poll.live_sort,
    }
    let pollId = poll.id
    if (pollId) {
      const { error } = await supabase.from('polls').update(payload).eq('id', pollId)
      if (error) { setMsg('Hiba: ' + error.message); setSaving(false); return }
    } else {
      const { data, error } = await supabase.from('polls').insert(payload).select('id').single()
      if (error) { setMsg('Hiba: ' + error.message); setSaving(false); return }
      pollId = data.id
    }
    // törölt sorok
    if (removed.length) await supabase.from('poll_options').delete().in('id', removed)
    // meglévő + új sorok
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      if (r.id) {
        await supabase.from('poll_options').update({ cells: r.cells, sort_order: i }).eq('id', r.id)
      } else {
        await supabase.from('poll_options').insert({ poll_id: pollId, cells: r.cells, sort_order: i })
      }
    }
    setSaving(false); setRemoved([])
    await loadList()
    closeEditor()   // mentésre becsukódik
  }

  // ── Előző verzió: a poll BEÁLLÍTÁSAIT + a sorok SZÖVEGÉT állítja vissza ──
  // (törölt/új sorok szerkezetét nem, a szavazatok védelme miatt)
  const restorePrev = async () => {
    if (!snapshot || !poll?.id) return
    if (!window.confirm('Visszaállítod a szavazás mentés előtti beállításait és a sorok szövegét?')) return
    setSaving(true)
    const s = snapshot.poll
    await supabase.from('polls').update({
      title_hu: s.title_hu, title_en: s.title_en, columns: s.columns,
      has_votes: s.has_votes, type: s.type, status: s.status, active: s.active,
      closes_at: s.closes_at ? new Date(s.closes_at).toISOString() : null,
      default_view: s.default_view,
    }).eq('id', poll.id)
    for (const r of snapshot.rows) {
      if (r.id) await supabase.from('poll_options').update({ cells: r.cells }).eq('id', r.id)
    }
    setSaving(false); setSnapshot(null); setSaved(false)
    await openPoll(poll.id)
  }

  // ── Export ──
  const exportCSV = () => {
    const cols = poll.columns.map(c => c.name_hu || '')
    const header = [...cols, ...(poll.has_votes ? ['Fel', 'Le', 'Nettó'] : [])].map(csvCell).join(',')
    const lines = rows.map(r => {
      const cells = r.cells.map(c => csvCell(c.hu))
      const votes = poll.has_votes ? [r.up, r.down, r.up - r.down].map(csvCell) : []
      return [...cells, ...votes].join(',')
    })
    download(`szavazas-${(poll.title_hu || 'eredmeny').slice(0, 40)}.csv`, [header, ...lines].join('\n'), 'text/csv;charset=utf-8')
  }
  const exportJSON = () => {
    const data = {
      title_hu: poll.title_hu, title_en: poll.title_en,
      columns: poll.columns, has_votes: poll.has_votes,
      options: rows.map(r => ({ cells: r.cells, up: r.up, down: r.down, net: r.up - r.down })),
    }
    download(`szavazas-${(poll.title_hu || 'eredmeny').slice(0, 40)}.json`, JSON.stringify(data, null, 2), 'application/json')
  }

  // ── Törlés ──
  const doDelete = async () => {
    if (!poll?.id) { setSelId(null); setPoll(null); return }
    setSaving(true)
    await supabase.from('polls').delete().eq('id', poll.id)   // cascade törli az opciókat + szavazatokat
    setSaving(false); setConfirmDel(false); setSelId(null); setPoll(null); setRows([])
    await loadList()
  }

  // ── RENDER ──
  const editorBlock = poll ? (
        <>
          {/* Alapbeállítások */}
          <div className="acms-content-group">
            <div className="acms-content-group-label">Beállítások</div>

            <div className="acms-form-group">
              <label>Szavazás címe (Magyar)</label>
              <input className="acms-input" value={poll.title_hu} onChange={e => setField('title_hu', e.target.value)}
                placeholder="Pl. Az év pilótája" />
            </div>
            <div className="acms-form-group">
              <label>Szavazás címe (English)</label>
              <input className="acms-input" value={poll.title_en} onChange={e => setField('title_en', e.target.value)}
                placeholder="e.g. Driver of the year" />
            </div>

            <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.6rem' }}>
              <input type="checkbox" checked={poll.has_votes} onChange={e => setField('has_votes', e.target.checked)} />
              <span className="acms-switch-label">„Szavazat" oszlop (szavazás bekapcsolása)</span>
            </label>
            {poll.has_votes && (
              <>
                <div className="acms-form-group">
                  <label>Szavazás típusa</label>
                  <select className="acms-input" value={poll.vote_style || 'updown'} style={{ maxWidth: 320 }}
                    onChange={e => { const v = e.target.value; setPoll(p => ({ ...p, vote_style: v, live_sort: v === 'updown' })); setSaved(false) }}>
                    <option value="updown">Fel/le szavazás (▲ / ▼)</option>
                    <option value="simple">Egyszerű szavazás (csak ▲)</option>
                  </select>
                </div>
                <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.6rem' }}>
                  <input type="checkbox" checked={poll.live_sort !== false} onChange={e => setField('live_sort', e.target.checked)} />
                  <span className="acms-switch-label">A lista a szavazatok szerint frissüljön (élő rangsor)</span>
                </label>
              </>
            )}
            <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.6rem' }}>
              <input type="checkbox" checked={poll.active} onChange={e => setField('active', e.target.checked)} />
              <span className="acms-switch-label">Aktív (megjelenik a főoldalon, a Szekció sorrendben)</span>
            </label>
            <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.6rem' }}>
              <input type="checkbox" checked={!!poll.test_mode} onChange={e => setField('test_mode', e.target.checked)} />
              <span className="acms-switch-label" style={{ color: '#e0a800' }}>🧪 Teszt mód – KORLÁTLAN szavazás (egy böngészőből végtelen; élesben kapcsold KI!)</span>
            </label>

            <div className="acms-form-group">
              <label>Típus</label>
              <select className="acms-input" value={poll.type} onChange={e => setField('type', e.target.value)} style={{ maxWidth: 320 }}>
                <option value="fixed">Fix opciók (te adod meg)</option>
                <option value="suggestions">Látogatók javasolhatnak (moderálás – 2. szakasz)</option>
              </select>
            </div>

            <div className="acms-form-group">
              <label>Lezárás időpontja (opcionális – ekkor zárul a szavazás)</label>
              <input type="datetime-local" className="acms-input" value={poll.closes_at}
                onChange={e => setField('closes_at', e.target.value)} style={{ maxWidth: 320 }} />
            </div>

            <div className="acms-form-group">
              <label>Alapértelmezett nézet</label>
              <select className="acms-input" value={poll.default_view} onChange={e => setField('default_view', e.target.value)} style={{ maxWidth: 220 }}>
                <option value="percent">Százalék</option>
                <option value="count">Darabszám</option>
              </select>
            </div>

            <div className="acms-form-group">
              <label>Állapot</label>
              <select className="acms-input" value={poll.status} onChange={e => setField('status', e.target.value)} style={{ maxWidth: 220 }}>
                <option value="open">Nyitva</option>
                <option value="closed">Lezárva</option>
              </select>
            </div>
          </div>

          {/* Oszlopok */}
          <div className="acms-content-group">
            <div className="acms-sect-header-row">
              <div className="acms-content-group-label">Oszlopok</div>
              <button className="acms-btn-sm" onClick={addColumn}>+ Oszlop</button>
            </div>
            {poll.columns.map((c, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <input className="acms-input" style={{ flex: 1, minWidth: 140 }} value={c.name_hu}
                  onChange={e => setColName(i, 'name_hu', e.target.value)} placeholder={`Oszlop ${i + 1} – Magyar`} />
                <input className="acms-input" style={{ flex: 1, minWidth: 140 }} value={c.name_en}
                  onChange={e => setColName(i, 'name_en', e.target.value)} placeholder={`Column ${i + 1} – English`} />
                {poll.columns.length > 1 && <button className="acms-btn-sm" onClick={() => removeColumn(i)}>Törlés</button>}
              </div>
            ))}
          </div>

          {/* Sorok */}
          <div className="acms-content-group">
            <div className="acms-sect-header-row">
              <div className="acms-content-group-label">Sorok (opciók)</div>
              <button className="acms-btn-sm" onClick={addRow}>+ Sor</button>
            </div>
            {rows.length === 0 && <div className="admin-empty">Még nincs sor.</div>}
            {rows.map((r, ri) => (
              <div key={ri} style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '0.7rem', marginBottom: '0.7rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <strong style={{ opacity: 0.7, fontSize: '0.8rem' }}>
                    {ri + 1}. sor {poll.has_votes && <span style={{ opacity: 0.6 }}>(▲ {r.up} / ▼ {r.down})</span>}
                  </strong>
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    <button className="acms-btn-sm" onClick={() => moveRow(ri, -1)} disabled={ri === 0}>↑</button>
                    <button className="acms-btn-sm" onClick={() => moveRow(ri, 1)} disabled={ri === rows.length - 1}>↓</button>
                    <button className="acms-btn-sm" onClick={() => removeRow(ri)}>Törlés</button>
                  </div>
                </div>
                {poll.columns.map((c, ci) => (
                  <div key={ci} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                    <input className="acms-input" style={{ flex: 1, minWidth: 140 }} value={r.cells[ci]?.hu || ''}
                      onChange={e => setCell(ri, ci, 'hu', e.target.value)} placeholder={`${c.name_hu || `Oszlop ${ci + 1}`} – HU`} />
                    <input className="acms-input" style={{ flex: 1, minWidth: 140 }} value={r.cells[ci]?.en || ''}
                      onChange={e => setCell(ri, ci, 'en', e.target.value)} placeholder={`${c.name_en || `Column ${ci + 1}`} – EN`} />
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Moderálás – jóváhagyásra váró javaslatok */}
          {(poll.type === 'suggestions' || pending.length > 0) && (
            <div className="acms-content-group">
              <div className="acms-content-group-label">Jóváhagyásra váró javaslatok ({pending.length})</div>
              {pending.length === 0 ? (
                <div className="admin-empty">Nincs jóváhagyásra váró javaslat.</div>
              ) : pending.map((r, ri) => (
                <div key={r.id} style={{ border: '1px solid var(--rust-light)', borderRadius: 4, padding: '0.7rem', marginBottom: '0.7rem' }}>
                  {poll.columns.map((c, ci) => (
                    <div key={ci} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                      <input className="acms-input" style={{ flex: 1, minWidth: 140 }} value={r.cells[ci]?.hu || ''}
                        onChange={e => setPendCell(ri, ci, 'hu', e.target.value)} placeholder={`${c.name_hu || `Oszlop ${ci + 1}`} – HU`} />
                      <input className="acms-input" style={{ flex: 1, minWidth: 140 }} value={r.cells[ci]?.en || ''}
                        onChange={e => setPendCell(ri, ci, 'en', e.target.value)} placeholder={`${c.name_en || `Column ${ci + 1}`} – EN`} />
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.3rem' }}>
                    <button className="acms-btn-primary" onClick={() => approvePending(r)}>Jóváhagyás</button>
                    <button className="acms-btn-danger" onClick={() => rejectPending(r)}>Elvetés</button>
                  </div>
                  <div className="acms-hint" style={{ marginTop: '0.3rem' }}>Javíthatod/lefordíthatod jóváhagyás előtt.</div>
                </div>
              ))}
            </div>
          )}

          {/* Műveletek */}
          <div className="acms-content-group">
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button className="acms-btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Mentés…' : 'Mentés'}
              </button>
              {saved && <span className="acms-saved-badge">✓ Mentve</span>}
              {snapshot && poll.id && (
                <button className="acms-btn-sm" onClick={restorePrev} disabled={saving}>↶ Előző verzió visszaállítása</button>
              )}
              {poll.id && <button className="acms-btn-sm" onClick={exportCSV}>Letöltés CSV</button>}
              {poll.id && <button className="acms-btn-sm" onClick={exportJSON}>Letöltés JSON</button>}
              {poll.id && <button className="acms-btn-danger" onClick={() => setConfirmDel(true)}>Szavazás törlése</button>}
            </div>
            {msg && <span className="acms-hint" style={{ color: 'var(--rust-light)' }}>{msg}</span>}

            {confirmDel && (
              <div style={{ marginTop: '1rem', border: '1px solid var(--rust-light)', borderRadius: 4, padding: '1rem' }}>
                <p style={{ marginTop: 0 }}>
                  Biztosan <strong>véglegesen törlöd</strong> ezt a szavazást és az eredményét? Ez nem vonható vissza.
                  Előtte letöltheted az eredményt:
                </p>
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <button className="acms-btn-sm" onClick={exportCSV}>Letöltés CSV</button>
                  <button className="acms-btn-sm" onClick={exportJSON}>Letöltés JSON</button>
                  <button className="acms-btn-danger" onClick={doDelete} disabled={saving}>Törlés véglegesen</button>
                  <button className="acms-btn-sm" onClick={() => setConfirmDel(false)}>Mégse</button>
                </div>
              </div>
            )}
          </div>
        </>
  ) : null

  return (
    <div className="acms-section">
      <div className="acms-content-group">
        <div className="acms-sect-header-row">
          <div className="acms-content-group-label">Szavazások</div>
          <button className="acms-btn-primary" onClick={() => openPoll('new')}>+ Új szavazás</button>
        </div>
        {selId === 'new' && <div className="poll-acc-body">{editorBlock}</div>}

        {loadingList ? <div className="admin-empty">Betöltés…</div> : (
          polls.length === 0 ? <div className="admin-empty">Még nincs szavazás.</div> : (
            <div className="poll-acc-list">
              {polls.map(p => (
                <div key={p.id} className="poll-acc-item">
                  <div className="poll-acc-head" onClick={() => (selId === p.id ? closeEditor() : openPoll(p.id))}>
                    <span className="poll-acc-name">
                      {p.title_hu || '(cím nélkül)'}
                      {p.active && <span className="poll-acc-badge">aktív</span>}
                      {p.status === 'closed' && <span className="poll-acc-badge poll-acc-badge--closed">lezárt</span>}
                    </span>
                    <span className={`poll-acc-tri ${selId === p.id ? 'open' : ''}`} aria-hidden="true">▸</span>
                  </div>
                  {selId === p.id && <div className="poll-acc-body">{editorBlock}</div>}
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Statisztika / összehasonlítás – a Szavazás menü alján, mindig elérhető */}
      <AdminPollStats />
    </div>
  )
}