import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useAdminRole } from '../../hooks'

const ROLES = ['superadmin', 'admin', 'demo']

export default function AdminRoles() {
  const { isSuperadmin, loading: roleLoading } = useAdminRole()
  const [rows,     setRows]     = useState([])
  const [me,       setMe]       = useState('')
  const [loading,  setLoading]  = useState(true)
  const [newEmail, setNewEmail] = useState('')
  const [newRole,  setNewRole]  = useState('admin')
  const [msg,      setMsg]      = useState('')

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setMe((user?.email || '').toLowerCase())
    const { data, error } = await supabase
      .from('admin_users')
      .select('email, role')
      .order('created_at', { ascending: true })
    if (!error) setRows(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  if (roleLoading || loading) return null
  if (!isSuperadmin) return null

  const addAdmin = async () => {
    const email = newEmail.trim().toLowerCase()
    if (!email) return
    setMsg('')
    const { error } = await supabase.from('admin_users').insert({ email, role: newRole })
    if (error) { setMsg('Hiba a felvételkor: ' + error.message); return }
    setNewEmail(''); setNewRole('admin'); load()
  }

  const changeRole = async (email, role) => {
    setMsg('')
    const { error } = await supabase.from('admin_users').update({ role }).eq('email', email)
    if (error) { setMsg('Hiba a módosításkor: ' + error.message); return }
    load()
  }

  const removeAdmin = async (email) => {
    if (!window.confirm(`Biztosan törlöd ezt az admint: ${email}?`)) return
    setMsg('')
    const { error } = await supabase.from('admin_users').delete().eq('email', email)
    if (error) { setMsg('Hiba a törléskor: ' + error.message); return }
    load()
  }

  return (
    <div className="acms-content-group">
      <div className="acms-content-group-label">Admin jogosultságok</div>

      <div className="adv-doc">
        <p>
          Itt vehetsz fel új adminokat <strong>e-mail alapján</strong>, állíthatod a
          szerepkörüket, vagy törölheted őket. <strong>Saját magadat nem módosíthatod
          és nem törölheted.</strong> A jogosultságot a szerver (RLS) is kikényszeríti.
        </p>
        <p className="adv-doc-note">
          <strong>superadmin</strong>: teljes jog + jogkezelés &nbsp;·&nbsp;
          <strong>admin</strong>: tartalom szerkesztése &nbsp;·&nbsp;
          <strong>demo</strong>: csak megtekintés (semmit nem menthet).
          Új admin csak akkor tud belépni, ha a Supabase-ben is van fiókja ezzel az e-maillel.
        </p>
      </div>

      <div className="acms-form-group">
        <label>Új admin felvétele</label>
        <div className="acms-roles-add">
          <input
            className="acms-input"
            type="email"
            placeholder="email@pelda.hu"
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
          />
          <select className="acms-input" value={newRole} onChange={e => setNewRole(e.target.value)}>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <button className="acms-btn-primary" onClick={addAdmin} disabled={!newEmail.trim()}>
            Hozzáad
          </button>
        </div>
      </div>

      <table className="acms-roles-table">
        <thead>
          <tr><th>E-mail</th><th>Szerepkör</th><th></th></tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const isSelf = r.email.toLowerCase() === me
            return (
              <tr key={r.email}>
                <td>{r.email}{isSelf && ' (te)'}</td>
                <td>
                  <select
                    className="acms-input"
                    value={r.role}
                    disabled={isSelf}
                    onChange={e => changeRole(r.email, e.target.value)}
                  >
                    {ROLES.map(x => <option key={x} value={x}>{x}</option>)}
                  </select>
                </td>
                <td>
                  {!isSelf && (
                    <button className="acms-btn-sm" onClick={() => removeAdmin(r.email)}>Törlés</button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {msg && <span className="acms-hint" style={{ color: 'var(--rust-light)' }}>{msg}</span>}
    </div>
  )
}