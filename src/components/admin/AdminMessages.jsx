import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'

export default function AdminMessages() {
  const [messages, setMessages] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState('all')

  const fetchMessages = async () => {
    setLoading(true)
    let query = supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false })
    if (filter === 'unread') query = query.eq('read', false)
    if (filter === 'read')   query = query.eq('read', true)
    const { data } = await query
    setMessages(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchMessages() }, [filter])

  const toggleRead = async (id, current) => {
    await supabase.from('messages').update({ read: !current }).eq('id', id)
    setMessages(prev => prev.map(m => m.id === id ? { ...m, read: !current } : m))
  }

  const deleteMessage = async (id) => {
    if (!window.confirm('Biztosan törölni szeretnéd ezt az üzenetet?')) return
    await supabase.from('messages').delete().eq('id', id)
    setMessages(prev => prev.filter(m => m.id !== id))
  }

  const unreadCount = messages.filter(m => !m.read).length

  return (
    <div className="acms-section">
      <div className="acms-section-header">
        <div>
          <div className="acms-section-title">Üzenetek</div>
          <div className="acms-section-sub">
            {unreadCount > 0 ? `${unreadCount} olvasatlan` : 'Minden olvasva'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          {[
            { key: 'all',    label: 'Mind' },
            { key: 'unread', label: 'Olvasatlan' },
            { key: 'read',   label: 'Olvasott' },
          ].map(f => (
            <button
              key={f.key}
              className={`filter-btn ${filter === f.key ? 'active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="admin-messages" style={{ padding: 0 }}>
        {loading && <div className="admin-empty">Betöltés...</div>}
        {!loading && messages.length === 0 && <div className="admin-empty">Nincs üzenet.</div>}
        {!loading && messages.map(msg => (
          <div key={msg.id} className="admin-card">
            <div className="admin-card-header">
              <div>
                <div className="admin-card-name">{msg.name}</div>
                <div className="admin-card-email">{msg.email}</div>
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span className={`admin-badge ${msg.read ? 'read' : ''}`}>
                  {msg.read ? 'Olvasott' : 'Új'}
                </span>
                <button className="admin-mark-btn" onClick={() => toggleRead(msg.id, msg.read)}>
                  {msg.read ? 'Olvasatlannak jelöl' : 'Olvasottnak jelöl'}
                </button>
                <button
                  className="admin-mark-btn"
                  onClick={() => deleteMessage(msg.id)}
                  style={{ borderColor: 'rgba(139,58,26,0.3)', color: 'var(--rust-pale,#aaa)' }}
                >
                  Törlés
                </button>
              </div>
            </div>
            {msg.service && msg.service !== 'Nem megadott' && (
              <div className="admin-card-service">{msg.service}</div>
            )}
            <div className="admin-card-message">{msg.message}</div>
            <div className="admin-card-date">
              {new Date(msg.created_at).toLocaleString('hu-HU', {
                year: 'numeric', month: 'long', day: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
