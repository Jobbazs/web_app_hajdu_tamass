import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import AdminRoles from './AdminRoles'

// ============================================================
// Haladó beállítások fül
// Jelenleg: publikálás (statikus HTML újraépítése a Google számára)
// ============================================================

const LAST_KEY = 'last_published_at'

const ATTACHMENTS_BUCKET = 'attachments'
const ATTACHMENTS_FOLDER = 'contact-attachments'

// Egy publikus Supabase Storage URL-ből kinyeri a bucketen belüli path-ot.
function urlToStoragePath(url) {
  const marker = `/object/public/${ATTACHMENTS_BUCKET}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return decodeURIComponent(url.slice(idx + marker.length))
}
function parseAttachments(attachmentUrl) {
  if (!attachmentUrl) return []
  return attachmentUrl.split(',').map(u => u.trim()).filter(Boolean)
}

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
  const [indexNow, setIndexNow] = useState(null)   // { ok, count?, error? }
  const [cleaning, setCleaning] = useState(false)
  const [cleanMsg, setCleanMsg] = useState('')

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
    setIndexNow(null)

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

    setIndexNow(data?.indexNow ?? null)
    setStatus('done')
    setTimeout(() => setStatus('idle'), 10000)
  }

  // Árva fájlok: minden, ami a Storage "contact-attachments" mappájában van,
  // de egyetlen üzenet attachment_url mezőjében sem szerepel.
  const cleanOrphanFiles = async () => {
    if (!window.confirm('Ez törli az összes olyan csatolt fájlt a tárhelyről, amely már egyetlen üzenethez sincs hozzárendelve. Folytatod?')) return

    setCleaning(true)
    setCleanMsg('')

    try {
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

      const { data: storedFiles, error: listErr } = await supabase.storage
        .from(ATTACHMENTS_BUCKET)
        .list(ATTACHMENTS_FOLDER, { limit: 1000 })
      if (listErr) throw listErr

      const orphanPaths = (storedFiles || [])
        .filter(f => f.name)
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
        <div className="acms-content-group-label">Publikálás a keresőmotorok felé</div>

        <div className="adv-doc">
          <p>
            <strong>A weboldal látogatói mindig a friss tartalmat látják.</strong> Amit itt
            az adminban mentesz, az náluk azonnal megjelenik – ehhez nem kell semmit tenni.
          </p>
          <p>
            <strong>A keresőmotorok viszont másképp működnek.</strong> Ők egy „pillanatképet"
            látnak az oldalról, ami nem frissül magától. Ez a gomb két dolgot tesz: újraépíti
            ezt a pillanatképet, és <strong>értesítést küld a keresőmotoroknak</strong>, hogy
            változott a tartalom – így hamarabb veszik észre.
          </p>

          <div className="adv-doc-split">
            <div className="adv-doc-col">
              <div className="adv-doc-col-title adv-doc-col-title--yes">Nyomd meg, ha módosítottad:</div>
              <ul>
                <li>Hero szöveget (főcím, alcím)</li>
                <li>Rólam bekezdéseket vagy tageket</li>
                <li>Szolgáltatások nevét / leírását</li>
                <li>Egyedi szekció szövegét</li>
                <li>Szekciók sorrendjét vagy láthatóságát</li>
                <li>Kategória-oldal szövegét (alcím, bevezető, szórt szavak)</li>
                <li>Kategória-szekciókat (szöveg, kép, sorrend)</li>
                <li>Kategóriákat (új felvétel, átnevezés, sorrend, borítókép)</li>
                <li>Portfólió képeket (új kép, törlés, elrejtés, sorrend)</li>
              </ul>
            </div>
            <div className="adv-doc-col">
              <div className="adv-doc-col-title adv-doc-col-title--no">Nem kell, ha csak:</div>
              <ul>
                <li>Üzeneteket olvastál</li>
                <li>Foglalást kezeltél</li>
                <li>Időpontot hoztál létre</li>
                <li>Megbízhatósági listát szerkesztettél</li>
                <li>Statisztikákat néztél az Áttekintésen</li>
              </ul>
            </div>
          </div>

          <p className="adv-doc-note">
            A gomb megnyomása után az oldal újraépül, ez <strong>1–2 percet vesz igénybe</strong>.
            Ezalatt a weboldal végig elérhető marad. Fölöslegesen megnyomva nem okoz kárt,
            csak egy üres újraépítést indít.
          </p>
          <p className="adv-doc-note">
            Az értesítést a keresőmotorok egy része <strong>azonnal</strong> megkapja, mások
            (köztük a Google) a saját ütemük szerint jönnek vissza – ott az új tartalom
            megjelenése napokat is igénybe vehet. Ez normális, nem hiba.
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
              <>
                <span className="acms-success">✓ Elindítva – az újraépítés 1–2 perc múlva végez</span>
                {indexNow?.ok && (
                  <span className="acms-hint">
                    Bing értesítve (IndexNow): {indexNow.count} oldal
                  </span>
                )}
                {indexNow && !indexNow.ok && (
                  <span className="acms-hint">
                    A publikálás sikeres, de a Bing-értesítés nem ment át
                    {indexNow.error ? `: ${indexNow.error}` : ''}
                  </span>
                )}
              </>
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

      {/* ── Árva fájlok takarítása ── */}
      <div className="acms-content-group">
        <div className="acms-content-group-label">Árva fájlok takarítása</div>

        <div className="adv-doc">
          <p>
            <strong>Amikor valaki képet csatol a kapcsolat űrlapon</strong>, a fájl a
            tárhelyre kerül, és az elküldött üzenethez kötődik. Ha később törlöd az
            üzenetet, a hozzá tartozó képek is törlődnek – erről nem kell külön gondoskodni.
          </p>
          <p>
            <strong>Ritkán mégis maradhat „gazdátlan" fájl a tárhelyen</strong> – például
            ha egy spam-beküldést a szűrő kiszűrt (a kép feltöltődött, de üzenet nem készült
            belőle), vagy ha egy feltöltés félbeszakadt. Ez a gomb megkeresi és törli ezeket:
            <strong> minden olyan csatolt fájlt, ami már egyetlen üzenethez sem tartozik.</strong>
          </p>
          <p className="adv-doc-note">
            Aktív üzenethez tartozó képet <strong>soha nem töröl</strong>, csak a
            gazdátlanokat – így teljesen biztonságos. Ha nincs ilyen fájl, egyszerűen azt
            írja ki. Fölöslegesen megnyomva nem okoz kárt.
          </p>
        </div>

        <div className="adv-publish-row">
          <button
            className="acms-btn-primary"
            onClick={cleanOrphanFiles}
            disabled={cleaning}
          >
            {cleaning ? 'Takarítás...' : 'Árva fájlok törlése'}
          </button>

          <div className="adv-publish-status">
            {cleanMsg && <span className="acms-hint">{cleanMsg}</span>}
          </div>
        </div>
      </div>

      {/* Jogkezelő – csak superadminnak jelenik meg (a komponens maga dönti el) */}
      <AdminRoles />
    </div>
  )
}