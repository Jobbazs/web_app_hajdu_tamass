import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { getLog, clearLog } from '../../lib/adminLog'

// Hibajegy űrlap: leírás + hiba oka, a belépés óta gyűjtött aktivitás-naplóval.
export default function AdminBugReport() {
  const [description, setDescription] = useState('')
  const [cause,       setCause]       = useState('')
  const [status,      setStatus]      = useState('idle')  // idle | sending | done | error
  const [logCount,    setLogCount]    = useState(0)

  useEffect(() => { setLogCount(getLog().length) }, [status])

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
  }

  return (
    <div className="acms-section">
      <div className="acms-content-group">
        <div className="acms-content-group-label">Hibajegy beküldése</div>

        <div className="adv-doc">
          <p>
            Írd le, mit tapasztaltál. A rendszer <strong>automatikusan csatolja</strong> a
            belépés óta végzett kattintások/lépések naplóját, ami segít a hiba
            visszakövetésében. (A beírt szövegek tartalmát a napló nem tárolja, csak az
            elvégzett műveleteket.)
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
    </div>
  )
}