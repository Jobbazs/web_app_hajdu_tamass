import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'


document.addEventListener('gesturestart', e => e.preventDefault(), { passive: false })
document.addEventListener('gesturechange', e => e.preventDefault(), { passive: false })
document.addEventListener('touchmove', e => {
  if (e.scale !== undefined && e.scale !== 1) {
    e.preventDefault()
  }
}, { passive: false })
// ─────────────────────────────────────────────────────────────

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
