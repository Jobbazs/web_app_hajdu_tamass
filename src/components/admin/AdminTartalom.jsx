import { useState } from 'react'
import AdminPortfolio  from './AdminPortfolio'
import AdminCategories from './AdminCategories'
import AdminServices   from './AdminServices'
import AdminContent    from './AdminContent'
import AdminCovers     from './AdminCovers'

// "Tartalom" gyűjtő fül – saját al-menüvel. Ide került a korábbi felső szintű
// Portfólió és Szolgáltatások, a Kategória-oldalak (új néven Portfólió-oldalak,
// a borítókkal együtt), valamint a korábbi Tartalom belső nézetei.
const SUB = [
  { key: 'portfolio', label: 'Portfólió' },
  { key: 'pages',     label: 'Portfólió-oldalak' },
  { key: 'services',  label: 'Szolgáltatások' },
  { key: 'sections',  label: 'Szekciók' },
  { key: 'popup',     label: 'PopUp szövegek' },
  { key: 'order',     label: 'Szekció sorrend' },
]

export default function AdminTartalom() {
  const [sub, setSub] = useState('portfolio')

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

      {/* Egy AdminContent-példány marad felcsatolva a szekciók/popup/sorrend közt
          váltáskor (a view prop változik), így a nem mentett szerkesztések nem
          vesznek el. */}
      {['sections', 'popup', 'order'].includes(sub) && (
        <AdminContent view={sub === 'sections' ? 'sekciok' : sub} />
      )}
    </div>
  )
}