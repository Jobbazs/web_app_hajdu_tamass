// Admin aktivitás-napló – a belépéstől gyűjti a kattintásokat/folyamatokat egy
// sessionStorage pufferbe, amit a hibajegy beküldésekor csatolunk. Fontos: NEM
// tárolja a beírt szövegek TARTALMÁT (csak akciókat/kattintásokat), hogy ne
// képződjön feleslegesen személyes adat.

const KEY = 'admin_activity_log'
const MAX = 200 // csak az utolsó N esemény

function read() {
  try { return JSON.parse(sessionStorage.getItem(KEY) || '[]') } catch { return [] }
}
function write(arr) {
  try { sessionStorage.setItem(KEY, JSON.stringify(arr.slice(-MAX))) } catch { /* tele a storage */ }
}

// Manuális naplózás kulcs-folyamatokhoz (pl. mentés, publikálás) – bárhol hívható.
export function logEvent(type, detail) {
  const arr = read()
  arr.push({ t: new Date().toISOString(), type, detail: String(detail ?? '').slice(0, 200) })
  write(arr)
}

export function getLog() { return read() }
export function clearLog() { try { sessionStorage.removeItem(KEY) } catch { /* nincs teendő */ } }

// Rövid, érték nélküli leíró egy interaktív elemről.
function describe(el) {
  const tag = el.tagName ? el.tagName.toLowerCase() : 'elem'
  const raw = el.getAttribute?.('aria-label') || el.textContent || el.getAttribute?.('name') || el.id || ''
  const label = raw.trim().replace(/\s+/g, ' ').slice(0, 60)
  return label ? `${tag}: "${label}"` : tag
}

let handler = null

// Kattintás-figyelő indítása (az admin mount-jakor). Csak interaktív elemekre
// (gomb, link, fül, select, checkbox/radio) reagál – szöveges mezők tartalmát
// nem naplózza.
export function startAdminLog(root) {
  if (handler) return // már fut
  logEvent('session', 'Admin felület megnyitva')
  handler = (e) => {
    const el = e.target?.closest?.(
      'button, a, [role="button"], select, input[type="checkbox"], input[type="radio"], .acms-tab'
    )
    if (el) logEvent('click', describe(el))
  }
  ;(root || document).addEventListener('click', handler, true)
}

export function stopAdminLog(root) {
  if (!handler) return
  ;(root || document).removeEventListener('click', handler, true)
  handler = null
}