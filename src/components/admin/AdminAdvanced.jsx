import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'

// ============================================================
// Haladó beállítások fül
// Jelenleg: publikálás (statikus HTML újraépítése a Google számára)
// ============================================================

const LAST_KEY = 'last_published_at'

function formatWhen(iso) {
  if (!iso) return null
  const then = new Date(iso)
  const diffMin = Math.floor((Date.now() - then.getTime()) / 60000)

  if (diffMin < 1)  return 'az imént'
  if (diffMin < 60) return `${diffMin} perce`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24)   return `${diffH} órája`
  const diffD = Math.floor(diffH / 24)
  if (diffD === 1)  return 'tegnap'
  if (diffD < 7)    return `${diffD} napja`
  return then.toLocaleDateString('hu-HU', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function AdminAdvanced() {
  const [status, setStatus] = useState('idle')  // idle | publishing | done | error
  const [lastAt, setLastAt] = useState(null)
  const [errMsg, setErrMsg] = useState('')

  useEffect(() => {
    supabase
      .from('site_content')
      .select('value')
      .eq('key', LAST_KEY)
      .maybeSingle()
      .then(({ data }) => { if (data?.value) setLastAt(data.value) })
  }, [])

  const publish = async () => {
    setStatus('publishing')
    setErrMsg('')

    const { data, error } = await supabase.functions.invoke('trigger-deploy')

    if (error || data?.error) {
      setErrMsg(data?.error || error?.message || 'Ismeretlen hiba')
      setStatus('error')
      return
    }

    const now = new Date().toISOString()
    await supabase
      .from('site_content')
      .upsert({ key: LAST_KEY, value: now }, { onConflict: 'key' })
    setLastAt(now)

    setStatus('done')
    setTimeout(() => setStatus('idle'), 10000)
  }

  const when = formatWhen(lastAt)

  return (
    <div className="acms-section">
      <div className="acms-section-header">
        <div>
          <div className="acms-section-title">Haladó beállítások</div>
          <div className="acms-section-sub">Ritkán használt műveletek</div>
        </div>
      </div>

      {/* ── Publikálás ── */}
      <div className="acms-content-group">
        <div className="acms-content-group-label">Publikálás a Google felé</div>

        <div className="adv-doc">
          <p>
            <strong>A weboldal látogatói mindig a friss tartalmat látják.</strong> Amit itt
            az adminban mentesz, az náluk azonnal megjelenik – ehhez nem kell semmit tenni.
          </p>
          <p>
            <strong>A Google keresője viszont másképp működik.</strong> Ő egy „pillanatképet"
            lát az oldalról, ami nem frissül magától. Ezt a pillanatképet frissíti az alábbi gomb.
          </p>

          <div className="adv-doc-split">
            <div className="adv-doc-col">
              <div className="adv-doc-col-title adv-doc-col-title--yes">Nyomd meg, ha átírtad:</div>
              <ul>
                <li>Hero szöveget (főcím, alcím)</li>
                <li>Rólam bekezdéseket vagy tageket</li>
                <li>Szolgáltatások nevét / leírását</li>
                <li>Egyedi szekció szövegét</li>
                <li>Szekciók sorrendjét vagy láthatóságát</li>
              </ul>
            </div>
            <div className="adv-doc-col">
              <div className="adv-doc-col-title adv-doc-col-title--no">Nem kell, ha csak:</div>
              <ul>
                <li>Üzeneteket olvastál</li>
                <li>Foglalást kezeltél</li>
                <li>Időpontot hoztál létre</li>
                <li>Megbízhatósági listát szerkesztettél</li>
              </ul>
            </div>
          </div>

          <p className="adv-doc-note">
            A gomb megnyomása után az oldal újraépül, ez <strong>1–2 percet vesz igénybe</strong>.
            Ezalatt a weboldal végig elérhető marad. Fölöslegesen megnyomva nem okoz kárt,
            csak egy üres újraépítést indít.
          </p>
        </div>

        <div className="adv-publish-row">
          <button
            className="acms-btn-primary"
            onClick={publish}
            disabled={status === 'publishing'}
          >
            {status === 'publishing' ? 'Publikálás folyamatban...' : 'Változások publikálása'}
          </button>

          <div className="adv-publish-status">
            {status === 'done' && (
              <span className="acms-success">✓ Elindítva – az újraépítés 1–2 perc múlva végez</span>
            )}
            {status === 'error' && (
              <span className="acms-error">✕ {errMsg}</span>
            )}
            {status === 'idle' && when && (
              <span className="acms-hint">Utoljára publikálva: {when}</span>
            )}
            {status === 'idle' && !when && (
              <span className="acms-hint">Még nem volt publikálás</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
