import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useLang } from '../LangContext'
import '../Styles/Poll.css'
import PollPie, { PIE_COLORS } from './PollPie'

function getVoterId() {
  try {
    let id = localStorage.getItem('poll_voter_id')
    if (!id) {
      id = (crypto?.randomUUID?.() || String(Date.now()) + Math.random().toString(36).slice(2))
      localStorage.setItem('poll_voter_id', id)
    }
    return id
  } catch { return null }
}
function getMyVotes() { try { return JSON.parse(localStorage.getItem('poll_my_votes') || '{}') } catch { return {} } }
function saveMyVote(optId, dir) {
  const m = getMyVotes()
  if (dir) m[optId] = dir; else delete m[optId]
  try { localStorage.setItem('poll_my_votes', JSON.stringify(m)) } catch {}
  return m
}
function cellsFor(cells, columns) {
  const n = (columns || []).length || 0
  const c = Array.isArray(cells) ? cells : []
  const out = []
  for (let i = 0; i < n; i++) out.push({ hu: c[i]?.hu || '', en: c[i]?.en || '' })
  return out
}

function fmtRemaining(ms, lang) {
  if (ms <= 0) return lang === 'hu' ? 'lezárult' : 'closed'
  const s = Math.floor(ms / 1000)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const pad = (n) => String(n).padStart(2, '0')
  const clock = `${pad(h)}:${pad(m)}:${pad(sec)}`
  if (d > 0) return `${d} ${lang === 'hu' ? 'nap' : (d > 1 ? 'days' : 'day')} ${clock}`
  return clock
}

export default function Poll() {
  const { lang } = useLang()
  const [poll, setPoll]       = useState(null)
  const [options, setOptions] = useState([])
  const [view, setView]       = useState('percent')
  const [mode, setMode]       = useState(() => { try { return localStorage.getItem('poll_mode') || 'list' } catch { return 'list' } })
  const [myVotes, setMyVotes] = useState({})
  const [voterId]             = useState(getVoterId)
  const [sug, setSug]         = useState([])
  const [sugStatus, setSugStatus] = useState('')
  const [now, setNow]         = useState(() => Date.now())

  const load = async () => {
    const { data: p } = await supabase.from('polls').select('*').eq('active', true).maybeSingle()
    if (!p) { setPoll(null); setOptions([]); return }
    const { data: opts } = await supabase.from('poll_options')
      .select('*').eq('poll_id', p.id).eq('approved', true).order('sort_order', { ascending: true })
    setPoll(p); setOptions(opts || [])
    let v = null
    try { v = localStorage.getItem('poll_view') } catch {}
    setView(v || p.default_view || 'percent')
    setMyVotes(getMyVotes())
  }
  useEffect(() => { load() }, [])

  useEffect(() => {
    if (poll?.status === 'closed') return
    const startMs = poll?.starts_at ? new Date(poll.starts_at).getTime() : 0
    const needTick = poll?.closes_at || (startMs && Date.now() < startMs)
    if (!needTick) return
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [poll?.closes_at, poll?.status])

  useEffect(() => {
    if (!poll?.id) return
    const flt = `poll_id=eq.${poll.id}`
    const ch = supabase
      .channel(`poll-live-${poll.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'poll_options', filter: flt },
        (p) => setOptions(os => os.map(o => (o.id === p.new.id
          ? { ...o, up_votes: p.new.up_votes, down_votes: p.new.down_votes } : o))))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'poll_options', filter: flt },
        () => load())
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'poll_options', filter: flt },
        (p) => setOptions(os => os.filter(o => o.id !== p.old?.id)))
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [poll?.id])

  if (!poll) return null
  if (poll.starts_at && new Date(poll.starts_at).getTime() > now) return null

  const closed = poll.status === 'closed' || (poll.closes_at && new Date(poll.closes_at).getTime() <= now)
  const title = lang === 'hu' ? poll.title_hu : (poll.title_en || poll.title_hu)
  const columns = (poll.columns || []).map(c => (lang === 'hu' ? c.name_hu : (c.name_en || c.name_hu)))
  const isSimple = (poll.vote_style || 'updown') === 'simple'
  const liveSort = poll.live_sort !== false
  const scoreOf = (o) => (isSimple ? o.up_votes : o.up_votes - o.down_votes)
  const totalScore = options.reduce((s, o) => s + Math.max(0, scoreOf(o)), 0)
 
  const displayOptions = (liveSort || closed) && poll.has_votes
    ? [...options].sort((a, b) => scoreOf(b) - scoreOf(a))
    : options

  const setViewPref = (v) => { setView(v); try { localStorage.setItem('poll_view', v) } catch {} }
  const setModePref = (m) => { setMode(m); try { localStorage.setItem('poll_mode', m) } catch {} }
  const rowLabel = (o) => cellsFor(o.cells, poll.columns).map(c => (lang === 'hu' ? c.hu : (c.en || c.hu))).filter(Boolean).join(' – ') || '—'
  const pieSlices = displayOptions.map((o, i) => ({ label: rowLabel(o), value: Math.max(0, scoreOf(o)), color: PIE_COLORS[i % PIE_COLORS.length] }))

  const vote = async (opt, dir) => {
    if (closed || !voterId) return
    if (poll.test_mode) {
      const { data } = await supabase.rpc('cast_vote', { p_option: opt.id, p_voter: voterId, p_dir: dir })
      if (data?.up != null) setOptions(os => os.map(o => (o.id === opt.id ? { ...o, up_votes: data.up, down_votes: data.down } : o)))
      return
    }
    const prev = myVotes[opt.id]
    const { data } = await supabase.rpc('cast_vote', { p_option: opt.id, p_voter: voterId, p_dir: dir })
    if (!data || data.status === 'error') return
    if (data.status === 'closed') { load(); return }
    setOptions(os => os.map(o => (o.id === opt.id ? { ...o, up_votes: data.up, down_votes: data.down } : o)))
    const newDir = prev === dir ? null : dir
    setMyVotes(saveMyVote(opt.id, newDir))
  }

  const submitSuggestion = async () => {
    if (!sug.some(v => (v || '').trim())) return
    setSugStatus('sending')
    const cells = poll.columns.map((_, i) => ({
      hu: lang === 'hu' ? (sug[i] || '').trim() : '',
      en: lang === 'en' ? (sug[i] || '').trim() : '',
    }))
    const { data } = await supabase.rpc('suggest_option', { p_poll: poll.id, p_cells: cells })
    if (data?.status === 'ok') { setSugStatus('done'); setSug([]) }
    else setSugStatus('error')
  }

  return (
    <section id="szavazas" className="poll-section">
      <div className="poll-inner">
        {title && <h2 className="poll-title">{title}</h2>}

        {!closed && poll.closes_at && (
          <div className="poll-countdown">
            {lang === 'hu' ? 'A szavazás zárul:' : 'Voting closes in:'}{' '}
            <strong>{fmtRemaining(new Date(poll.closes_at).getTime() - now, lang)}</strong>
          </div>
        )}

        {poll.has_votes && (
          <div className="poll-toggles">
            <div className="poll-viewtoggle" role="group" aria-label="Megjelenítés">
              <button className={view === 'count' ? 'active' : ''} onClick={() => setViewPref('count')}>
                {lang === 'hu' ? 'Darabszám' : 'Count'}
              </button>
              <button className={view === 'percent' ? 'active' : ''} onClick={() => setViewPref('percent')}>
                {lang === 'hu' ? 'Százalék' : 'Percent'}
              </button>
            </div>
            <div className="poll-viewtoggle" role="group" aria-label="Nézet">
              <button className={mode === 'list' ? 'active' : ''} onClick={() => setModePref('list')}>
                {lang === 'hu' ? 'Lista' : 'List'}
              </button>
              <button className={mode === 'pie' ? 'active' : ''} onClick={() => setModePref('pie')}>
                {lang === 'hu' ? 'Kördiagram' : 'Pie chart'}
              </button>
            </div>
          </div>
        )}

        {mode === 'pie' && poll.has_votes ? (
          <div className="poll-pie-wrap">
            <PollPie slices={pieSlices} view={view} size={330} />
            <div className="poll-legend">
              {displayOptions.map((o, i) => {
                const pct = totalScore > 0 ? Math.round((Math.max(0, scoreOf(o)) / totalScore) * 100) : 0
                const mine = myVotes[o.id]
                return (
                  <div className="poll-legend-row" key={o.id}>
                    <span className="poll-legend-swatch" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="poll-legend-name">{rowLabel(o)}</span>
                    <span className="poll-legend-val">
                      {view === 'percent' ? `${pct}%` : (isSimple ? `▲${o.up_votes}` : `▲${o.up_votes} ▼${o.down_votes}`)}
                    </span>
                    {!closed && (
                      <span className="poll-legend-vote">
                        <button className={`poll-vbtn ${mine === 'up' ? 'up' : ''}`} onClick={() => vote(o, 'up')} aria-label={lang === 'hu' ? 'Fel' : 'Up'}>▲</button>
                        {!isSimple && <button className={`poll-vbtn ${mine === 'down' ? 'down' : ''}`} onClick={() => vote(o, 'down')} aria-label={lang === 'hu' ? 'Le' : 'Down'}>▼</button>}
                      </span>
                    )}
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
                {columns.map((c, i) => <th key={i}>{c}</th>)}
                {poll.has_votes && (
                  <th className="poll-vote-col">{closed ? (lang === 'hu' ? 'Eredmény' : 'Result') : (lang === 'hu' ? 'Szavazat' : 'Vote')}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {displayOptions.map(o => {
                const cells = cellsFor(o.cells, poll.columns)
                const pct = totalScore > 0 ? Math.round((Math.max(0, scoreOf(o)) / totalScore) * 100) : 0
                const mine = myVotes[o.id]
                return (
                  <tr key={o.id}>
                    {cells.map((cell, i) => <td key={i}>{lang === 'hu' ? cell.hu : (cell.en || cell.hu)}</td>)}
                    {poll.has_votes && (
                      <td className="poll-vote-col">
                        <div className="poll-vote">
                          {!closed && (
                            <button className={`poll-vbtn ${mine === 'up' ? 'up' : ''}`}
                              onClick={() => vote(o, 'up')} aria-label={lang === 'hu' ? (isSimple ? 'Szavazok' : 'Fel') : 'Up'}>▲</button>
                          )}
                          <span className="poll-score">
                            {view === 'percent' ? `${pct}%` : (isSimple ? <>▲{o.up_votes}</> : <>▲{o.up_votes} ▼{o.down_votes}</>)}
                          </span>
                          {!closed && !isSimple && (
                            <button className={`poll-vbtn ${mine === 'down' ? 'down' : ''}`}
                              onClick={() => vote(o, 'down')} aria-label={lang === 'hu' ? 'Le' : 'Down'}>▼</button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        )}

        {poll.type === 'suggestions' && !closed && (
          <div className="poll-suggest">
            <div className="poll-suggest-title">
              {lang === 'hu' ? 'Javasolj új opciót' : 'Suggest a new option'}
            </div>
            <div className="poll-suggest-fields">
              {columns.map((c, i) => (
                <input key={i} className="poll-suggest-input"
                  value={sug[i] || ''}
                  onChange={e => setSug(s => { const n = [...s]; n[i] = e.target.value; return n })}
                  placeholder={c || `#${i + 1}`} />
              ))}
              <button className="poll-suggest-btn" onClick={submitSuggestion}
                disabled={sugStatus === 'sending' || !sug.some(v => (v || '').trim())}>
                {sugStatus === 'sending' ? '…' : (lang === 'hu' ? 'Javaslom' : 'Suggest')}
              </button>
            </div>
            {sugStatus === 'done' && (
              <div className="poll-suggest-msg">
                {lang === 'hu' ? 'Köszönjük! A javaslat jóváhagyásra vár.' : 'Thanks! Your suggestion is awaiting approval.'}
              </div>
            )}
            {sugStatus === 'error' && (
              <div className="poll-suggest-msg" style={{ color: 'var(--rust, #B5231E)' }}>
                {lang === 'hu' ? 'Nem sikerült elküldeni.' : 'Could not submit.'}
              </div>
            )}
          </div>
        )}

        {closed && <div className="poll-closed">{lang === 'hu' ? 'A szavazás lezárult.' : 'Voting is closed.'}</div>}
      </div>
    </section>
  )
}