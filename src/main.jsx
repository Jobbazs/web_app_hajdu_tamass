import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

// A hibafigyelést (Sentry / @sentry/react) NEM a fő csomagba tesszük: tétlen
// időben, KÜLÖN chunk-ként töltjük be és inicializáljuk, hogy ne lassítsa a
// kezdeti betöltést. A renderhez nem kell – lásd a saját ErrorBoundary-t lent.
function initMonitoringWhenIdle() {
  const start = () =>
    import('./errorMonitoring').then((m) => m.initErrorMonitoring()).catch(() => {})
  if ('requestIdleCallback' in window) requestIdleCallback(start, { timeout: 3000 })
  else setTimeout(start, 1500)
}

// Ha a React renderelés közben hiba történik, a felhasználó fehér lapot
// látna. Az ErrorBoundary ezt elkapja, jelenti, és értelmes tartalék
// felületet mutat. Inline stílus, hogy CSS-hiba esetén is olvasható legyen.
function Fallback() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.2rem',
        padding: '2rem 1.5rem',
        background: '#1a1510',
        color: '#e8ddd0',
        fontFamily: 'Georgia, serif',
        textAlign: 'center',
      }}
    >
      <div style={{ fontFamily: 'Arial Black, Impact, sans-serif', fontSize: '1.4rem', letterSpacing: '0.2em' }}>
        NOX<span style={{ color: '#c4612a' }}>.</span>
      </div>
      <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2.2rem)', margin: 0 }}>Valami elromlott</h1>
      <p style={{ maxWidth: '32rem', color: '#9a9088', lineHeight: 1.6, margin: 0 }}>
        Váratlan hiba történt az oldal betöltése közben. Próbáld újratölteni –
        ha újra előfordul, kérlek jelezd.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        style={{
          padding: '0.7rem 1.4rem',
          fontFamily: 'Courier New, monospace',
          fontSize: '0.7rem',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: '#c4612a',
          background: 'none',
          border: '1px solid #c4612a',
          cursor: 'pointer',
        }}
      >
        Újratöltés
      </button>
    </div>
  )
}

// Saját ErrorBoundary: a rendereléshez NEM kell Sentry (az lazy). Hiba esetén
// megmutatja a Fallback-et, és a hibát a lazy betöltött Sentrynek jelenti.
class ErrorBoundary extends Component {
  state = { hasError: false }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(error, info) {
    import('./errorMonitoring')
      .then((m) => m.reportError(error, info?.componentStack))
      .catch(() => {})
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary fallback={<Fallback />}>
      <App />
    </ErrorBoundary>
  </StrictMode>
)

// A hibafigyelés indítása a renderelés UTÁN, tétlen időben.
initMonitoringWhenIdle()