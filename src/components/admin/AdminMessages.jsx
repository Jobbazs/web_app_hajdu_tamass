import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'

const ATTACHMENTS_BUCKET = 'attachments'
const ATTACHMENTS_FOLDER = 'contact-attachments'

// Egy publikus Supabase Storage URL-ből kinyeri a bucketen belüli path-ot
// (pl. ".../object/public/attachments/contact-attachments/123_abc.jpg"
//      -> "contact-attachments/123_abc.jpg")
function urlToStoragePath(url) {
  const marker = `/object/public/${ATTACHMENTS_BUCKET}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return decodeURIComponent(url.slice(idx + marker.length))
}

function parseAttachments(attachmentUrl) {
  if (!attachmentUrl) return []
  return attachmentUrl
    .split(',')
    .map(u => u.trim())
    .filter(Boolean)
}

export default function AdminMessages() {
  const [messages, setMessages] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState('all')
  const [cleaning, setCleaning] = useState(false)
  const [cleanMsg, setCleanMsg] = useState('')

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

  // Üzenet törlése + a hozzá tartozó csatolt képek törlése a Storage-ból
  const deleteMessage = async (id, attachmentUrl) => {
    if (!window.confirm('Biztosan törölni szeretnéd ezt az üzenetet? A csatolt képek is törlődnek.')) return

    const paths = parseAttachments(attachmentUrl)
      .map(urlToStoragePath)
      .filter(Boolean)

    if (paths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from(ATTACHMENTS_BUCKET)
        .remove(paths)
      if (storageError) {
        console.error('Storage törlési hiba:', storageError)
        // nem akasztjuk meg a folyamatot emiatt, az üzenetet még törölni próbáljuk
      }
    }

    const { error: dbError } = await supabase.from('messages').delete().eq('id', id)
    if (dbError) {
      console.error('DB törlési hiba:', dbError)
      alert('Hiba történt az üzenet törlése közben.')
      return
    }

    setMessages(prev => prev.filter(m => m.id !== id))
  }

  // Árva fájlok törlése: minden, ami a Storage "contact-attachments" mappájában van,
  // de egyetlen üzenet attachment_url mezőjében sem szerepel.
  const cleanOrphanFiles = async () => {
    if (!window.confirm('Ez törli az összes olyan csatolt fájlt a tárhelyről, amely már egyetlen üzenethez sincs hozzárendelve. Folytatod?')) return

    setCleaning(true)
    setCleanMsg('')

    try {
      // 1. Az összes jelenleg hivatkozott fájl path-ja (az aktuális szűrőtől függetlenül, MIND az üzenetből)
      const { data: allMessages, error: msgErr } = await supabase
        .from('messages')
        .select('attachment_url')

      if (msgErr) throw msgErr

      const referenced = new Set()
      for (const m of allMessages || []) {
        for (const url of parseAttachments(m.attachment_url)) {
          const path = urlToStoragePath(url)
          if (path) referenced.add(path)
        }
      }

      // 2. Storage-ban lévő összes fájl listázása a contact-attachments mappából
      const { data: storedFiles, error: listErr } = await supabase.storage
        .from(ATTACHMENTS_BUCKET)
        .list(ATTACHMENTS_FOLDER, { limit: 1000 })

      if (listErr) throw listErr

      const orphanPaths = (storedFiles || [])
        .filter(f => f.name) // mappákat kihagyjuk
        .map(f => `${ATTACHMENTS_FOLDER}/${f.name}`)
        .filter(path => !referenced.has(path))

      if (orphanPaths.length === 0) {
        setCleanMsg('Nincs árva fájl, minden csatolmány aktív üzenethez tartozik.')
        setCleaning(false)
        return
      }

      const { error: removeErr } = await supabase.storage
        .from(ATTACHMENTS_BUCKET)
        .remove(orphanPaths)

      if (removeErr) throw removeErr

      setCleanMsg(`${orphanPaths.length} árva fájl törölve a tárhelyről.`)
    } catch (err) {
      console.error('Takarítási hiba:', err)
      setCleanMsg('Hiba történt a takarítás közben. Részletek a konzolon.')
    } finally {
      setCleaning(false)
    }
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
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
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
          <button
            className="admin-mark-btn"
            onClick={cleanOrphanFiles}
            disabled={cleaning}
            title="Törli azokat a csatolt fájlokat a tárhelyről, amik már egyetlen üzenethez sem tartoznak"
          >
            {cleaning ? 'Takarítás...' : 'Árva fájlok törlése'}
          </button>
        </div>
      </div>

      {cleanMsg && (
        <div className="admin-card-date" style={{ padding: '0 2rem', marginTop: '-0.5rem' }}>
          {cleanMsg}
        </div>
      )}

      <div className="admin-messages" style={{ padding: 0 }}>
        {loading && <div className="admin-empty">Betöltés...</div>}
        {!loading && messages.length === 0 && <div className="admin-empty">Nincs üzenet.</div>}
        {!loading && messages.map(msg => {
          const attachments = parseAttachments(msg.attachment_url)
          return (
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
                    onClick={() => deleteMessage(msg.id, msg.attachment_url)}
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

              {attachments.length > 0 && (
                <div className="admin-attach-grid">
                  {attachments.map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="admin-attach-thumb"
                    >
                      <img src={url} alt={`csatolmány ${i + 1}`} loading="lazy" />
                    </a>
                  ))}
                </div>
              )}

              <div className="admin-card-date">
                {new Date(msg.created_at).toLocaleString('hu-HU', {
                  year: 'numeric', month: 'long', day: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
