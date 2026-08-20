import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { getLog, clearLog } from '../../lib/adminLog'
import { useAdminRole } from '../../hooks'

// Hibajegy: beküldő űrlap + jegylista. A lista tartalmát az RLS szűri
// (superadmin MINDET látja, más admin CSAK a saját beküldéseit).
function fmt(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString('hu-HU', {
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    })
  } catch { return iso }
}

// Státuszok: reported = Bejelentve, in_progress = Folyamatban, closed = Lezárva
function statusLabel(s) {
  if (s === 'closed') return 'Lezárva'
  if (s === 'in_progress') return 'Folyamatban'
  return 'Bejelentve'
}

export default function AdminBugReport() {
  const { isSuperadmin } = useAdminRole()
  const [description, setDescription] = useState('')
  const [cause,       setCause]       = useState('')
  const [status,      setStatus]      = useState('idle')  // idle | sending | done | error
  const [logCount,    setLogCount]    = useState(0)
  const [tickets,     setTickets]     = useState([])
  const [loading,     setLoading]     = useState(true)

  const load = async () => {
    const { data } = await supabase
      .from('bug_tickets')
      .select('id, created_at, created_by, description, cause, status, notified_at')
      .order('created_at', { ascending: false })
      .limit(100)
    setTickets(data || [])
    setLoading(false)
  }

  useEffect(() => { setLogCount(getLog().length) }, [status])
  useEffect(() => { load() }, [])

  const submit = async () => {
    if (!description.trim()) return
    setStatus('sending')
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('bug_tickets').insert({
      description:  description.trim(),
      cause:        cause.trim() || null,
      activity_log: getLog(),
      created_by:   user?.email || null,
    })
    if (error) {
      console.error('Hibajegy mentési hiba:', error)
      setStatus('error')
      return
    }
    setStatus('done')
    setDescription('')
    setCause('')
    clearLog()          // tiszta lap a következő jegyhez
    load()              // lista frissítése
  }

  return (
    <div className="acms-section">
      {/* Beküldő űrlap */}
      <div className="acms-content-group">
        <div className="acms-content-group-label">Hibajegy beküldése</div>

        <div className="adv-doc">
          <p>
            Írd le, mit tapasztaltál. A rendszer <strong>automatikusan csatolja</strong> a
            belépés óta végzett kattintások/lépések naplóját, ami segít a hiba
            visszakövetésében. (A beírt szövegek tartalmát a napló nem tárolja, csak az
            elvégzett műveleteket.) A beérkezett jegyet a rendszer e-mailben is továbbítja.
          </p>
        </div>

        <div className="acms-form-group">
          <label>Mi a hiba? <span style={{ color: 'var(--rust-light)' }}>*</span></label>
          <textarea
            className="acms-input"
            rows={5}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Pl. a Portfólió fülön mentés után nem frissül a lista…"
          />
        </div>

        <div className="acms-form-group">
          <label>Mi lehet a hiba oka? (opcionális)</label>
          <textarea
            className="acms-input"
            rows={3}
            value={cause}
            onChange={e => setCause(e.target.value)}
            placeholder="Pl. csak akkor fordul elő, ha előtte képet töltök fel…"
          />
        </div>

        <div className="adv-publish-row">
          <button
            className="acms-btn-primary"
            onClick={submit}
            disabled={status === 'sending' || !description.trim()}
          >
            {status === 'sending' ? 'Küldés…' : 'Hibajegy beküldése'}
          </button>

          <div className="adv-publish-status">
            {status === 'done'  && <span className="acms-hint">Köszönjük! A hibajegy elmentve.</span>}
            {status === 'error' && <span className="acms-hint" style={{ color: 'var(--rust-light)' }}>Hiba a mentéskor. Részletek a konzolon.</span>}
            {status !== 'done'  && <span className="acms-hint">{logCount} naplóesemény lesz csatolva.</span>}
          </div>
        </div>
      </div>

      {/* Jegylista */}
      <div className="acms-content-group">
        <div className="acms-content-group-label">
          {isSuperadmin ? 'Összes hibajegy' : 'Beküldött hibajegyeim'}
        </div>

        {loading ? (
          <div className="admin-empty">Betöltés…</div>
        ) : tickets.length === 0 ? (
          <div className="admin-empty">Még nincs beküldött hibajegy.</div>
        ) : (
          <table className="acms-roles-table">
            <thead>
              <tr>
                <th>Dátum</th>
                {isSuperadmin && <th>Beküldő</th>}
                <th>Hiba</th>
                <th>Ok</th>
                <th>Státusz</th>
                <th>E-mail</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map(t => (
                <tr key={t.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{fmt(t.created_at)}</td>
                  {isSuperadmin && <td>{t.created_by || '—'}</td>}
                  <td>{t.description}</td>
                  <td>{t.cause || '—'}</td>
                  <td>{statusLabel(t.status)}</td>
                  <td>{t.notified_at ? 'Elküldve' : 'Várakozik'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}