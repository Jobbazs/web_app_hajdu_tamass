import * as Sentry from '@sentry/react'

// ============================================================
// Hibafigyelés – GlitchTip (Sentry-kompatibilis)
// ------------------------------------------------------------
// A DSN környezeti változóból jön (VITE_GLITCHTIP_DSN), hogy kód
// módosítása nélkül ki-be lehessen kapcsolni, és ne legyen beégetve
// a repóba. A DSN maga nem titok (a kliens bundle-ben amúgy is
// szerepel), de így kezelhetőbb.
//
// Beállítás a Vercelen:  Settings → Environment Variables
//   VITE_GLITCHTIP_DSN = https://xxx@app.glitchtip.com/26189
// ============================================================

const DSN = import.meta.env.VITE_GLITCHTIP_DSN
const IS_PROD = import.meta.env.PROD

// Zaj, amit nem érdemes jelenteni: böngésző-kiegészítők, hálózati
// megszakadások, jóindulatú böngésző-furcsaságok. A GlitchTip ingyenes
// csomagja ~1000 esemény/hó, ezt egy visszatérő zaj elégetné.
const IGNORE = [
  /ResizeObserver loop/i,
  /Non-Error promise rejection captured/i,
  /Failed to fetch/i,
  /NetworkError/i,
  /Load failed/i,
  /The operation was aborted/i,
  /AbortError/i,
  /Extension context invalidated/i,
]

const DENY_URLS = [
  /^chrome-extension:\/\//,
  /^moz-extension:\/\//,
  /^safari-extension:\/\//,
]

// Egyszerű maszkolás: email és telefonszám kiszűrése a jelentésekből.
// Ez foglalási oldal – ügyfélnevek, emailek fordulnak meg benne, és
// azok nem kerülhetnek ki harmadik félhez (GDPR).
const EMAIL_RX = /[\w.+-]+@[\w-]+\.[\w.-]+/g
const PHONE_RX = /(\+?\d[\d\s()/-]{7,}\d)/g

function scrub(value) {
  if (typeof value === 'string') {
    return value.replace(EMAIL_RX, '[email]').replace(PHONE_RX, '[telefon]')
  }
  if (Array.isArray(value)) return value.map(scrub)
  if (value && typeof value === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(value)) out[k] = scrub(v)
    return out
  }
  return value
}

export function initErrorMonitoring() {
  // Diagnosztikai jelző: a konzolban egy sorral ellenőrizhető, hogy fut-e.
  //   window.__errorMonitoring   → true, ha aktív
  window.__errorMonitoring = false

  if (!DSN) {
    // FIGYELEM: a VITE_* változók a BUILD pillanatában sülnek a kódba.
    // Ha a Vercelen utólag vetted fel a változót, újra kell deployolni.
    console.warn(
      '[hibafigyelés] A VITE_GLITCHTIP_DSN nincs beállítva ebben a buildben – ' +
      'a hibajelentés KI van kapcsolva. Ha a Vercelen már felvetted, indíts új deployt: ' +
      'a Vite a build idején írja be az értéket.'
    )
    return
  }

  // Fejlesztés közben ne fogyasszuk a kvótát
  if (!IS_PROD) {
    console.info('[hibafigyelés] fejlesztői mód – a jelentés kikapcsolva.')
    return
  }

  Sentry.init({
    dsn: DSN,
    environment: 'production',

    // Csak hibák. Teljesítménymérést szándékosan NEM kérünk: a GlitchTip
    // támogatása korlátozott, és a tranzakciók elfogyasztanák a kvótát.
    tracesSampleRate: 0,

    // A GlitchTip nem támogatja a munkamenet-követést
    autoSessionTracking: false,

    // Ne küldjünk automatikusan személyes adatot (IP, fejlécek)
    sendDefaultPii: false,

    ignoreErrors: IGNORE,
    denyUrls: DENY_URLS,

    // A console-hívások breadcrumbjait eldobjuk: a kódban vannak olyan
    // console.error hívások, amik hibaobjektumot logolnak, és azokban
    // ügyféladat is lehet.
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === 'console') return null
      return breadcrumb
    },

    // Utolsó védőháló: a kimenő jelentésből maszkoljuk az emaileket és
    // telefonszámokat (üzenet, kivétel-szövegek, extra adatok).
    beforeSend(event) {
      try {
        if (event.message) event.message = scrub(event.message)
        if (event.extra) event.extra = scrub(event.extra)
        if (event.exception?.values) {
          event.exception.values = event.exception.values.map((v) => ({
            ...v,
            value: typeof v.value === 'string' ? scrub(v.value) : v.value,
          }))
        }
        if (event.request?.url) event.request.url = scrub(event.request.url)
      } catch {
        /* ha a maszkolás elhasal, inkább menjen ki maszkolatlanul, mint semmi */
      }
      return event
    },
  })

  window.__errorMonitoring = true
}

// A saját ErrorBoundary hívja hiba esetén: biztosítja az inicializálást,
// majd jelenti a hibát a Sentrynek (ha egyáltalán aktív – DSN + production).
export function reportError(error, componentStack) {
  try {
    if (!window.__errorMonitoring) initErrorMonitoring()
    if (window.__errorMonitoring) {
      Sentry.captureException(
        error,
        componentStack ? { contexts: { react: { componentStack } } } : undefined,
      )
    }
  } catch { /* csendben – a hibajelentés sose okozzon újabb hibát */ }
}

export { Sentry }