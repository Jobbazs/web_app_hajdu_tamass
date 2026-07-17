import { useState } from 'react'
import { supabase } from '../supabaseClient'
import AdminMessages  from './admin/AdminMessages'
import '../Styles/Admin.css'
import AdminPortfolio from './admin/AdminPortfolio'
import AdminServices  from './admin/AdminServices'
import AdminContent   from './admin/AdminContent'
import AdminBookings  from './admin/AdminBookings'
import AdminAdvanced  from './admin/AdminAdvanced'

const TABS = [
  { key: 'messages',  label: 'Üzenetek' },
  { key: 'portfolio', label: 'Portfólió' },
  { key: 'services',  label: 'Szolgáltatások' },
  { key: 'content',   label: 'Tartalom' },
  { key: 'bookings',  label: 'Foglalások' },
  { key: 'advanced',  label: 'Haladó beállítások' },
]

export default function Admin() {
  const [activeTab, setActiveTab] = useState('messages')

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
        {activeTab === 'messages'  && <AdminMessages />}
        {activeTab === 'portfolio' && <AdminPortfolio />}
        {activeTab === 'services'  && <AdminServices />}
        {activeTab === 'content'   && <AdminContent />}
        {activeTab === 'bookings'  && <AdminBookings />}
        {activeTab === 'advanced'  && <AdminAdvanced />}
      </div>
    </div>
  )
}
