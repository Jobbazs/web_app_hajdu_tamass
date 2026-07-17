import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'

// ============================================================
// PublishBar – fix sáv az admin alján, füllektől függetlenül
//
// A CMS mentés csak a Supabase-be ír. A prerenderelt HTML (amit a
// Google lát) viszont csak új build során frissül. Ez a gomb indítja
// azt a buildet, akkor amikor a szerkesztés kész.
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
  return then.toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function PublishBar() {
  const [status, setStatus] = useState('idle')  // idle | publishing | done | error
  const [lastAt, setLastAt] = useState(null)
  const [errMsg, setErrMsg] = useState('')

  // Utolsó publikálás betöltése
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

    // Időbélyeg mentése
    const now = new Date().toISOString()
    await supabase
      .from('site_content')
      .upsert({ key: LAST_KEY, value: now }, { onConflict: 'key' })
    setLastAt(now)

    setStatus('done')
    setTimeout(() => setStatus('idle'), 8000)
  }

  const when = formatWhen(lastAt)

  return (
    <div className="pub-bar">
      <div className="pub-bar-info">
        <span className="pub-bar-label">Publikálás</span>
        <span className="pub-bar-hint">
          {status === 'publishing' && 'Build indítása...'}
          {status === 'done'       && '✓ Elindítva – a Vercel 1-2 perc alatt végez'}
          {status === 'error'      && `✕ ${errMsg}`}
          {status === 'idle' && (
            when
              ? `Utoljára publikálva: ${when}`
              : 'A mentett változások a következő publikálásnál kerülnek ki a Google felé'
          )}
        </span>
      </div>

      <button
        className="pub-bar-btn"
        onClick={publish}
        disabled={status === 'publishing'}
      >
        {status === 'publishing' ? 'Publikálás...' : 'Változások publikálása'}
      </button>
    </div>
  )
}
