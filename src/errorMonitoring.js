import * as Sentry from '@sentry/react'

const DSN = import.meta.env.VITE_GLITCHTIP_DSN
const IS_PROD = import.meta.env.PROD

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
  window.__errorMonitoring = false

  if (!DSN) {

    console.warn(
      '[hibafigyelés] A VITE_GLITCHTIP_DSN nincs beállítva ebben a buildben – ' +
      'a hibajelentés KI van kapcsolva. Ha a Vercelen már felvetted, indíts új deployt: ' +
      'a Vite a build idején írja be az értéket.'
    )
    return
  }

  if (!IS_PROD) {
    console.info('[hibafigyelés] fejlesztői mód – a jelentés kikapcsolva.')
    return
  }

  Sentry.init({
    dsn: DSN,
    environment: 'production',

    tracesSampleRate: 0,

    autoSessionTracking: false,

    sendDefaultPii: false,

    ignoreErrors: IGNORE,
    denyUrls: DENY_URLS,

    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === 'console') return null
      return breadcrumb
    },

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
      }
      return event
    },
  })

  window.__errorMonitoring = true
}

export function reportError(error, componentStack) {
  try {
    if (!window.__errorMonitoring) initErrorMonitoring()
    if (window.__errorMonitoring) {
      Sentry.captureException(
        error,
        componentStack ? { contexts: { react: { componentStack } } } : undefined,
      )
    }
  } catch {}
}

export { Sentry }