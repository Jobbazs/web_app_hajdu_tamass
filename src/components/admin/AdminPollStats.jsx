import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../supabaseClient'
import '../../Styles/Poll.css'
import PollPie, { PIE_COLORS } from '../PollPie'

function cellsFor(cells, columns) {
  const n = (columns || []).length || 0
  const c = Array.isArray(cells) ? cells : []
  const out = []
  for (let i = 0; i < n; i++) out.push({ hu: c[i]?.hu || '', en: c[i]?.en || '' })
  return out
}

function csvCell(s) { return `"${String(s ?? '').replace(/"/g, '""')}"` }
function isIOS() {
  const ua = navigator.userAgent || ''
  const classic = /iPad|iPhone|iPod/.test(ua)
  const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  return classic || iPadOS
}
function dataURLtoBlob(dataURL) {
  const [head, b64] = dataURL.split(',')
  const mime = (head.match(/:(.*?);/) || [])[1] || 'image/png'
  const bin = atob(b64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return new Blob([arr], { type: mime })
}
function download(name, text, mime) {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = name; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function AdminPollStats() {
  const [allPolls, setAllPolls] = useState([])
  const [selected, setSelected] = useState([])
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
    setSelected(s => [...s, { poll: p, options: opts || [], view: p.default_view || 'percent', mode: 'list' }])
  }
  const removePoll = (id) => setSelected(s => s.filter(x => x.poll.id !== id))
  const setView = (id, v) => setSelected(s => s.map(x => (x.poll.id === id ? { ...x, view: v } : x)))
  const setMode = (id, m) => setSelected(s => s.map(x => (x.poll.id === id ? { ...x, mode: m } : x)))

  const exportPNG = () => {
    if (selected.length === 0) return
    const scale = 2, W = 760, PAD = 24, ROWH = 30, TITLEH = 40, COLGAP = 24
    let totalH = PAD
    for (const { poll, options } of selected) {
      totalH += TITLEH + ROWH + Math.max(options.length, 1) * ROWH + 28
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
      ctx.fillStyle = '#FF3B30'; ctx.font = "700 20px 'Bebas Neue', sans-serif"
      ctx.fillText(poll.title_hu || '(cím nélkül)', x0, y + 24); y += TITLEH
      ctx.font = "700 12px monospace"; ctx.fillStyle = '#C8B89A'
      cols.forEach((c, i) => ctx.fillText(String(c).slice(0, 18), x0 + i * colW + 4, y + 20))
      if (poll.has_votes) ctx.fillText(view === 'percent' ? '%' : '▲/▼', x0 + cols.length * colW + 4, y + 20)
      y += ROWH
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
    const blob = dataURLtoBlob(canvas.toDataURL('image/png'))
    const file = new File([blob], 'szavazas-osszehasonlitas.png', { type: 'image/png' })
    if (isIOS() && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file] }).catch(err => { if (err && err.name !== 'AbortError') downloadBlob(blob, file.name) })
    } else {
      downloadBlob(blob, file.name)
    }
  }

  const downloadBlob = (blob, name) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = name; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const exportCSV = () => {
    const parts = selected.map(({ poll, options }) => {
      const isSimple = (poll.vote_style || 'updown') === 'simple'
      const scoreOf = (o) => (isSimple ? o.up_votes : o.up_votes - o.down_votes)
      const sorted = poll.has_votes ? [...options].sort((a, b) => scoreOf(b) - scoreOf(a)) : options
      const cols = (poll.columns || []).map(c => c.name_hu || '')
      const header = [...cols, ...(poll.has_votes ? ['Fel', 'Le', 'Nettó'] : [])].map(csvCell).join(',')
      const lines = sorted.map(o => {
        const cells = cellsFor(o.cells, poll.columns).map(c => csvCell(c.hu))
        const votes = poll.has_votes ? [o.up_votes, o.down_votes, o.up_votes - o.down_votes].map(csvCell) : []
        return [...cells, ...votes].join(',')
      })
      return [csvCell(poll.title_hu || '(cím nélkül)'), header, ...lines].join('\n')
    })
    download('szavazas-osszehasonlitas.csv', parts.join('\n\n'), 'text/csv;charset=utf-8')
  }

  const exportJSON = () => {
    const data = selected.map(({ poll, options }) => ({
      title_hu: poll.title_hu, title_en: poll.title_en, columns: poll.columns, has_votes: poll.has_votes,
      options: options.map(o => ({ cells: o.cells, up: o.up_votes, down: o.down_votes, net: o.up_votes - o.down_votes })),
    }))
    download('szavazas-osszehasonlitas.json', JSON.stringify(data, null, 2), 'application/json')
  }

  const exportTXT = () => {
    const parts = selected.map(({ poll, options }) => {
      const isSimple = (poll.vote_style || 'updown') === 'simple'
      const scoreOf = (o) => (isSimple ? o.up_votes : o.up_votes - o.down_votes)
      const sorted = poll.has_votes ? [...options].sort((a, b) => scoreOf(b) - scoreOf(a)) : options
      const lines = [`Szavazás: ${poll.title_hu || '(cím nélkül)'}`]
      const cols = (poll.columns || []).map(c => c.name_hu).filter(Boolean)
      if (cols.length) lines.push(`Oszlopok: ${cols.join(', ')}`)
      lines.push('')
      sorted.forEach((o, i) => {
        const cellText = cellsFor(o.cells, poll.columns).map(c => c.hu).filter(Boolean).join(' | ') || '—'
        let vote = ''
        if (poll.has_votes) {
          const net = o.up_votes - o.down_votes
          vote = isSimple ? ` — ${o.up_votes} szavazat` : ` — ▲${o.up_votes} / ▼${o.down_votes} (nettó: ${net >= 0 ? '+' : ''}${net})`
        }
        lines.push(`${i + 1}. ${cellText}${vote}`)
      })
      return lines.join('\n')
    })
    download('szavazas-osszehasonlitas.txt', parts.join('\n\n———\n\n'), 'text/plain;charset=utf-8')
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
        {selected.length > 0 && <button className="acms-btn-sm" onClick={exportCSV}>CSV</button>}
        {selected.length > 0 && <button className="acms-btn-sm" onClick={exportJSON}>JSON</button>}
        {selected.length > 0 && <button className="acms-btn-sm" onClick={exportTXT}>TXT</button>}
        {selected.length > 0 && <button className="acms-btn-sm" onClick={exportPNG}>PNG</button>}
      </div>

      {selected.length === 0 ? (
        <div className="admin-empty">Nincs kiválasztott szavazás.</div>
      ) : (
        <div className="poll-stats-grid" ref={gridRef}>
          {selected.map(({ poll, options, view, mode }) => {
            const cols = (poll.columns || []).map(c => c.name_hu || '')
            const isSimple = (poll.vote_style || 'updown') === 'simple'
            const scoreOf = (o) => (isSimple ? o.up_votes : o.up_votes - o.down_votes)
            const totalScore = options.reduce((s, o) => s + Math.max(0, scoreOf(o)), 0)
            const sorted = poll.has_votes ? [...options].sort((a, b) => scoreOf(b) - scoreOf(a)) : options
            const rowLabel = (o) => cellsFor(o.cells, poll.columns).map(c => c.hu || c.en).filter(Boolean).join(' – ') || '—'
            const pieSlices = sorted.map((o, i) => ({ label: rowLabel(o), value: Math.max(0, scoreOf(o)), color: PIE_COLORS[i % PIE_COLORS.length] }))
            return (
              <div key={poll.id} className="poll-stats-card">
                <div className="poll-stats-head">
                  <span>{poll.title_hu || '(cím nélkül)'}</span>
                  <button className="poll-stats-x" onClick={() => removePoll(poll.id)} aria-label="Eltávolítás">×</button>
                </div>
                {poll.has_votes && (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.8rem' }}>
                    <div className="poll-viewtoggle poll-stats-toggle">
                      <button className={view === 'count' ? 'active' : ''} onClick={() => setView(poll.id, 'count')}>Darab</button>
                      <button className={view === 'percent' ? 'active' : ''} onClick={() => setView(poll.id, 'percent')}>%</button>
                    </div>
                    <div className="poll-viewtoggle poll-stats-toggle">
                      <button className={(mode || 'list') === 'list' ? 'active' : ''} onClick={() => setMode(poll.id, 'list')}>Lista</button>
                      <button className={mode === 'pie' ? 'active' : ''} onClick={() => setMode(poll.id, 'pie')}>Diagram</button>
                    </div>
                  </div>
                )}
                {mode === 'pie' && poll.has_votes ? (
                  <div className="poll-pie-wrap">
                    <PollPie slices={pieSlices} view={view} size={180} />
                    <div className="poll-legend">
                      {sorted.map((o, i) => {
                        const pct = totalScore > 0 ? Math.round((Math.max(0, scoreOf(o)) / totalScore) * 100) : 0
                        return (
                          <div className="poll-legend-row" key={o.id}>
                            <span className="poll-legend-swatch" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                            <span className="poll-legend-name">{rowLabel(o)}</span>
                            <span className="poll-legend-val">{view === 'percent' ? `${pct}%` : (isSimple ? `▲${o.up_votes}` : `▲${o.up_votes} ▼${o.down_votes}`)}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
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
                        const pct = totalScore > 0 ? Math.round((Math.max(0, scoreOf(o)) / totalScore) * 100) : 0
                        return (
                          <tr key={o.id}>
                            {cellsFor(o.cells, poll.columns).map((cell, i) => <td key={i}>{cell.hu}</td>)}
                            {poll.has_votes && (
                              <td className="poll-vote-col">
                                <span className="poll-score">{view === 'percent' ? `${pct}%` : (isSimple ? <>▲{o.up_votes}</> : <>▲{o.up_votes} ▼{o.down_votes}</>)}</span>
                              </td>
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}