import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../supabaseClient'
import '../../Styles/Poll.css'

// Statisztika / összehasonlítás: max 4 szavazás egyszerre, táblánként külön
// darab/százalék nézet, reszponzív (fektetve 2, állítva 1), PNG export.
function cellsFor(cells, columns) {
  const n = (columns || []).length || 0
  const c = Array.isArray(cells) ? cells : []
  const out = []
  for (let i = 0; i < n; i++) out.push({ hu: c[i]?.hu || '', en: c[i]?.en || '' })
  return out
}

export default function AdminPollStats() {
  const [allPolls, setAllPolls] = useState([])
  const [selected, setSelected] = useState([])   // [{poll, options, view}]
  const gridRef = useRef(null)

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('polls').select('id, title_hu').order('created_at', { ascending: false })
      setAllPolls(data || [])
    })()
  }, [])

  const addPoll = async (id) => {
    if (!id || selected.length >= 4 || selected.some(s => s.poll.id === id)) return
    const { data: p } = await supabase.from('polls').select('*').eq('id', id).single()
    if (!p) return
    const { data: opts } = await supabase.from('poll_options')
      .select('*').eq('poll_id', id).eq('approved', true).order('sort_order', { ascending: true })
    setSelected(s => [...s, { poll: p, options: opts || [], view: p.default_view || 'percent' }])
  }
  const removePoll = (id) => setSelected(s => s.filter(x => x.poll.id !== id))
  const setView = (id, v) => setSelected(s => s.map(x => (x.poll.id === id ? { ...x, view: v } : x)))

  // PNG export – kézi canvas-rajz (nincs külső függőség)
  const exportPNG = () => {
    if (selected.length === 0) return
    const scale = 2, W = 760, PAD = 24, ROWH = 30, TITLEH = 40, COLGAP = 24
    // magasság előszámítása
    let totalH = PAD
    for (const { poll, options } of selected) {
      totalH += TITLEH + ROWH /*fejléc*/ + Math.max(options.length, 1) * ROWH + 28
    }
    const canvas = document.createElement('canvas')
    canvas.width = W * scale; canvas.height = totalH * scale
    const ctx = canvas.getContext('2d')
    ctx.scale(scale, scale)
    ctx.fillStyle = '#1a1510'; ctx.fillRect(0, 0, W, totalH)

    let y = PAD
    for (const { poll, options, view } of selected) {
      const cols = (poll.columns || []).map(c => c.name_hu || '')
      const nCols = cols.length + (poll.has_votes ? 1 : 0)
      const colW = (W - PAD * 2) / Math.max(nCols, 1)
      const x0 = PAD
      // cím
      ctx.fillStyle = '#FF3B30'; ctx.font = "700 20px 'Bebas Neue', sans-serif"
      ctx.fillText(poll.title_hu || '(cím nélkül)', x0, y + 24); y += TITLEH
      // fejléc
      ctx.font = "700 12px monospace"; ctx.fillStyle = '#C8B89A'
      cols.forEach((c, i) => ctx.fillText(String(c).slice(0, 18), x0 + i * colW + 4, y + 20))
      if (poll.has_votes) ctx.fillText(view === 'percent' ? '%' : '▲/▼', x0 + cols.length * colW + 4, y + 20)
      y += ROWH
      // sorok (nettó szerint csökkenő)
      const sorted = poll.has_votes
        ? [...options].sort((a, b) => (b.up_votes - b.down_votes) - (a.up_votes - a.down_votes)) : options
      const totalNet = options.reduce((s, o) => s + Math.max(0, o.up_votes - o.down_votes), 0)
      ctx.font = "13px monospace"; ctx.fillStyle = '#e8dcc8'
      sorted.forEach(o => {
        const cells = cellsFor(o.cells, poll.columns)
        cells.forEach((cell, i) => ctx.fillText(String(cell.hu).slice(0, 20), x0 + i * colW + 4, y + 20))
        if (poll.has_votes) {
          const net = o.up_votes - o.down_votes
          const txt = view === 'percent'
            ? `${totalNet > 0 ? Math.round(Math.max(0, net) / totalNet * 100) : 0}%`
            : `▲${o.up_votes} ▼${o.down_votes}`
          ctx.fillText(txt, x0 + cols.length * colW + 4, y + 20)
        }
        y += ROWH
      })
      y += 28
    }
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png'); a.download = 'szavazas-osszehasonlitas.png'; a.click()
  }

  const available = allPolls.filter(p => !selected.some(s => s.poll.id === p.id))

  return (
    <div className="acms-content-group">
      <div className="acms-content-group-label">Statisztika / összehasonlítás</div>
      <div className="acms-hint" style={{ marginBottom: '1rem' }}>
        Válassz ki max. 4 szavazást az összehasonlításhoz. Táblánként külön állítható a darab/százalék nézet.
      </div>

      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}>
        <select className="acms-input" style={{ maxWidth: 320 }} value=""
          onChange={e => { addPoll(e.target.value) }} disabled={selected.length >= 4}>
          <option value="">{selected.length >= 4 ? 'Elérted a 4 szavazást' : '+ Szavazás hozzáadása…'}</option>
          {available.map(p => <option key={p.id} value={p.id}>{p.title_hu || '(cím nélkül)'}</option>)}
        </select>
        {selected.length > 0 && <button className="acms-btn-sm" onClick={exportPNG}>PNG letöltés</button>}
      </div>

      {selected.length === 0 ? (
        <div className="admin-empty">Nincs kiválasztott szavazás.</div>
      ) : (
        <div className="poll-stats-grid" ref={gridRef}>
          {selected.map(({ poll, options, view }) => {
            const cols = (poll.columns || []).map(c => c.name_hu || '')
            const totalNet = options.reduce((s, o) => s + Math.max(0, o.up_votes - o.down_votes), 0)
            const sorted = poll.has_votes
              ? [...options].sort((a, b) => (b.up_votes - b.down_votes) - (a.up_votes - a.down_votes)) : options
            return (
              <div key={poll.id} className="poll-stats-card">
                <div className="poll-stats-head">
                  <span>{poll.title_hu || '(cím nélkül)'}</span>
                  <button className="poll-stats-x" onClick={() => removePoll(poll.id)} aria-label="Eltávolítás">×</button>
                </div>
                {poll.has_votes && (
                  <div className="poll-viewtoggle poll-stats-toggle">
                    <button className={view === 'count' ? 'active' : ''} onClick={() => setView(poll.id, 'count')}>Darab</button>
                    <button className={view === 'percent' ? 'active' : ''} onClick={() => setView(poll.id, 'percent')}>%</button>
                  </div>
                )}
                <div className="poll-table-wrap">
                  <table className="poll-table">
                    <thead>
                      <tr>
                        {cols.map((c, i) => <th key={i}>{c}</th>)}
                        {poll.has_votes && <th className="poll-vote-col">Eredmény</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.map(o => {
                        const cells = cellsFor(o.cells, poll.columns)
                        const net = o.up_votes - o.down_votes
                        const pct = totalNet > 0 ? Math.round((Math.max(0, net) / totalNet) * 100) : 0
                        return (
                          <tr key={o.id}>
                            {cells.map((cell, i) => <td key={i}>{cell.hu}</td>)}
                            {poll.has_votes && (
                              <td className="poll-vote-col">
                                <span className="poll-score">{view === 'percent' ? `${pct}%` : <>▲{o.up_votes} ▼{o.down_votes}</>}</span>
                              </td>
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}