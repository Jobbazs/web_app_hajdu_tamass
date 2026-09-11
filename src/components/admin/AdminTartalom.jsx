import { useState } from 'react'
import AdminPortfolio  from './AdminPortfolio'
import AdminCategories from './AdminCategories'
import AdminServices   from './AdminServices'
import AdminContent    from './AdminContent'
import AdminCovers     from './AdminCovers'
import AdminPromoPopup from './AdminPromoPopup'
import AdminPoll       from './AdminPoll'

const SUB = [
  { key: 'portfolio', label: 'Portfólió' },
  { key: 'pages',     label: 'Portfólió-oldalak' },
  { key: 'services',  label: 'Szolgáltatások' },
  { key: 'sections',  label: 'Szekciók' },
  { key: 'popups',    label: 'PopUp/Felugró' },
  { key: 'poll',      label: 'Szavazás' },
  { key: 'order',     label: 'Szekció sorrend' },
]
const POPUP_SUB = [
  { key: 'altalanos', label: 'Általános' },
  { key: 'kapcsolat', label: 'Kapcsolat' },
]

export default function AdminTartalom() {
  const [sub, setSub] = useState('portfolio')
  const [popupTab, setPopupTab] = useState('altalanos')

  let contentView = null
  if (sub === 'sections') contentView = 'sekciok'
  else if (sub === 'order') contentView = 'order'
  else if (sub === 'popups' && popupTab === 'kapcsolat') contentView = 'popup'

  return (
    <div className="acms-tartalom">
      <div className="acms-subtabs">
        {SUB.map(s => (
          <button
            key={s.key}
            className={`acms-subtab ${sub === s.key ? 'active' : ''}`}
            onClick={() => setSub(s.key)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {sub === 'portfolio' && <AdminPortfolio />}

      {sub === 'pages' && (
        <>
          <AdminCategories />
          <AdminCovers />
        </>
      )}

      {sub === 'services' && <AdminServices />}

      {sub === 'poll' && <AdminPoll />}

      {sub === 'popups' && (
        <>
          <div className="acms-subtabs" style={{ marginBottom: '1.2rem' }}>
            {POPUP_SUB.map(s => (
              <button
                key={s.key}
                className={`acms-subtab ${popupTab === s.key ? 'active' : ''}`}
                onClick={() => setPopupTab(s.key)}
              >
                {s.label}
              </button>
            ))}
          </div>
          {popupTab === 'altalanos' && <AdminPromoPopup />}
        </>
      )}

      {contentView && <AdminContent view={contentView} />}
    </div>
  )
}