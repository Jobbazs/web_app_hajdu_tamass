import { useEffect, useRef, useCallback } from 'react'
import { useLang } from '../LangContext'
import '../Styles/MediaModal.css'
import { cldThumb } from '../lib/portfolioPages'

export default function MediaModal({ item, items, onClose, onPrev, onNext }) {
  const videoRef = useRef(null)
  const { t } = useLang()
  const m = t.modal

  const handleKey = useCallback((e) => {
    if (e.key === 'Escape')     onClose()
    if (e.key === 'ArrowLeft')  onPrev()
    if (e.key === 'ArrowRight') onNext()
  }, [onClose, onPrev, onNext])

  useEffect(() => {
    if (!item) return
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [item, handleKey])

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
  }, [item?.id])

  if (!item) return null

  const isVideo    = item.category === 'video'
  const currentIdx = items.findIndex(i => i.id === item.id)
  const total      = items.length
  const fullUrl    = cldThumb(item.cloudinaryUrl, 2000)
    ? item.cloudinaryUrl.replace(/w_\d+/, 'w_1600').replace(/q_\d+/, 'q_90')
    : item.cloudinaryUrl

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header">
          <div className="modal-meta">
            <span className="modal-title">{item.title}</span>
            <span className="modal-counter">{currentIdx + 1} / {total}</span>
          </div>
          <button className="modal-close" onClick={onClose} aria-label={m.close}>✕</button>
        </div>

        {/* Media */}
        {/* Kattintási zónák – bal/jobb oldal navigál */}
        <div className="modal-media" onClick={e => {
          if (total <= 1) return
          const rect = e.currentTarget.getBoundingClientRect()
          const x    = e.clientX - rect.left
          if (x < rect.width * 0.35) onPrev()
          else if (x > rect.width * 0.65) onNext()
        }}>
          {/* Vizuális hint – nyilak a széleken */}
          {total > 1 && (
            <>
              <div className="modal-tap-prev" aria-hidden="true">‹</div>
              <div className="modal-tap-next" aria-hidden="true">›</div>
            </>
          )}
          {isVideo && item.videoUrl ? (
            <video
              ref={videoRef}
              className="modal-video"
              src={item.videoUrl}
              controls autoPlay playsInline
              poster={item.cloudinaryUrl}
            />
          ) : isVideo && !item.videoUrl ? (
            <div className="modal-no-video">
              <div className="modal-no-video-icon">▶</div>
              <p>{m.noVideo}</p>
              <p className="modal-no-video-hint">
                {m.noVideoHint} <code>videoUrl</code>
              </p>
            </div>
          ) : (
            <img className="modal-image" src={fullUrl} alt={item.title} draggable={false} />
          )}
        </div>

        {/* Navigation */}
        <div className="modal-nav">
          <button className="modal-nav-btn" onClick={onPrev} disabled={total <= 1} aria-label={m.prev}>
            ← {m.prev}
          </button>

          <div className="modal-thumbs">
            {items.map((it, idx) => (
              <button
                key={it.id}
                className={`modal-thumb ${it.id === item.id ? 'active' : ''}`}
                onClick={() => {
                  const diff = idx - currentIdx
                  if (diff > 0) for (let i = 0; i < diff; i++) onNext()
                  if (diff < 0) for (let i = 0; i < Math.abs(diff); i++) onPrev()
                }}
                aria-label={it.title}
              >
                {it.cloudinaryUrl ? (
                  <img
                    src={cldThumb(it.cloudinaryUrl, 120)}
                    alt={it.title} draggable={false}
                  />
                ) : (
                  <div className="modal-thumb-placeholder">
                    {it.category === 'video' ? '▶' : '·'}
                  </div>
                )}
              </button>
            ))}
          </div>

          <button className="modal-nav-btn" onClick={onNext} disabled={total <= 1} aria-label={m.next}>
            {m.next}
          </button>
        </div>

      </div>
    </div>
  )
}
