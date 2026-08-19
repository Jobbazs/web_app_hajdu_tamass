import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { startAdminLog, stopAdminLog } from '../lib/adminLog'
import { useAdminRole } from '../hooks'
import AdminDashboard from './admin/AdminDashboard'
import AdminMessages  from './admin/AdminMessages'
import '../Styles/Admin.css'
import AdminPortfolio from './admin/AdminPortfolio'
import AdminCategories from './admin/AdminCategories'
import AdminServices  from './admin/AdminServices'
import AdminContent   from './admin/AdminContent'
import AdminBookings  from './admin/AdminBookings'
import AdminAdvanced  from './admin/AdminAdvanced'
import AdminBugReport from './admin/AdminBugReport'

const TABS = [
  { key: 'dashboard', label: 'Áttekintés' },
  { key: 'messages',  label: 'Üzenetek' },
  { key: 'portfolio', label: 'Portfólió' },
  { key: 'categories', label: 'Kategória-oldalak' },
  { key: 'services',  label: 'Szolgáltatások' },
  { key: 'content',   label: 'Tartalom' },
  { key: 'bookings',  label: 'Foglalások' },
  { key: 'advanced',  label: 'Haladó beállítások' },
  { key: 'bug',       label: 'Hibajegy' },
]

export default function Admin() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const { isDemo } = useAdminRole()

  // Aktivitás-napló: a belépéstől gyűjti a kattintásokat a hibajegyhez.
  useEffect(() => {
    startAdminLog()
    return () => stopAdminLog()
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
        <button className="admin-logout-btn" onClick={handleLogout}>Kilépés</button>
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
        {activeTab === 'portfolio' && <AdminPortfolio />}
        {activeTab === 'categories' && <AdminCategories />}
        {activeTab === 'services'  && <AdminServices />}
        {activeTab === 'content'   && <AdminContent />}
        {activeTab === 'bookings'  && <AdminBookings />}
        {activeTab === 'advanced'  && <AdminAdvanced />}
        {activeTab === 'bug'       && <AdminBugReport />}
      </div>
    </div>
  )
}