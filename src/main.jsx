import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { initErrorMonitoring, Sentry } from './errorMonitoring'

// A hibafigyelést a renderelés ELŐTT indítjuk, hogy a betöltés közbeni
// hibákat is elkapja.
initErrorMonitoring()

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

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<Fallback />}>
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>
)
