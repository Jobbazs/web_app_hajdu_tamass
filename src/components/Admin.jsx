import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { startAdminLog, stopAdminLog } from '../lib/adminLog'
import { useAdminRole } from '../hooks'
import '../Styles/Admin.css'
import AdminDashboard from './admin/AdminDashboard'
import AdminMessages  from './admin/AdminMessages'
import AdminBookings  from './admin/AdminBookings'
import AdminTartalom  from './admin/AdminTartalom'
import AdminAdvanced  from './admin/AdminAdvanced'
import AdminBugReport from './admin/AdminBugReport'

const TABS = [
  { key: 'dashboard', label: 'Áttekintés' },
  { key: 'messages',  label: 'Üzenetek' },
  { key: 'bookings',  label: 'Foglalások' },
  { key: 'content',   label: 'Tartalom' },
  { key: 'advanced',  label: 'Haladó beállítások' },
  { key: 'bug',       label: 'Hibajegy' },
]

export default function Admin() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [email, setEmail] = useState('')
  const { isDemo } = useAdminRole()

  // Aktivitás-napló: a belépéstől gyűjti a kattintásokat a hibajegyhez.
  useEffect(() => {
    startAdminLog()
    return () => stopAdminLog()
  }, [])

  // Bejelentkezett felhasználó e-mailje (a fejlécbe)
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data?.user?.email || ''))
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="admin-bg">
      {/* Header */}
      <div className="admin-header">
        <div className="admin-header-left">
          <div className="admin-title">Admin</div>
          <div className="admin-subtitle">Portfólió kezelőfelület</div>
        </div>
        <div className="admin-header-right">
          {email && <span className="admin-user-email">{email}</span>}
          <button className="admin-logout-btn" onClick={handleLogout}>Kilépés</button>
        </div>
      </div>

      {isDemo && (
        <div className="admin-demo-banner">
          DEMO mód — a módosítások nem menthetők. Nyugodtan próbálj ki bármit, az oldal tartalma nem változik.
        </div>
      )}

      {/* Tab navigáció */}
      <div className="acms-tabs">
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`acms-tab ${activeTab === tab.key ? 'acms-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab tartalom */}
      <div className="acms-content">
        {activeTab === 'dashboard' && <AdminDashboard />}
        {activeTab === 'messages'  && <AdminMessages />}
        {activeTab === 'bookings'  && <AdminBookings />}
        {activeTab === 'content'   && <AdminTartalom />}
        {activeTab === 'advanced'  && <AdminAdvanced />}
        {activeTab === 'bug'       && <AdminBugReport />}
      </div>
    </div>
  )
}