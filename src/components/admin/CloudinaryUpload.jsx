import { useState, useRef } from 'react'

const CLOUD_NAME = 'dpeavk0xh'
const UPLOAD_PRESET = 'hajdutamas.hu_cms'
const ENDPOINT = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`

// Közvetlen (unsigned) feltöltés Cloudinary-ra. A Supabase tárhelyet nem
// érinti – csak a visszakapott secure_url kerül a DB-be (onUploaded).
export default function CloudinaryUpload({ onUploaded, label = 'Kép feltöltése', compact = false }) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)

  const upload = (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Csak képfájl tölthető fel.'); return }
    setError(''); setUploading(true); setProgress(0)

    const fd = new FormData()
    fd.append('file', file)
    fd.append('upload_preset', UPLOAD_PRESET)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', ENDPOINT)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      setUploading(false); setProgress(0)
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText)
          if (res.secure_url) onUploaded(res.secure_url)
          else setError('Nem érkezett URL a Cloudinary-tól.')
        } catch { setError('Hibás válasz a Cloudinary-tól.') }
      } else if (xhr.status === 400) {
        setError('Feltöltési hiba – ellenőrizd, hogy a preset "unsigned".')
      } else {
        setError('Feltöltési hiba (' + xhr.status + ').')
      }
    }
    xhr.onerror = () => { setUploading(false); setProgress(0); setError('Hálózati hiba a feltöltéskor.') }
    xhr.send(fd)
  }

  const onDrop = (e) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) upload(file)
  }
  const onPick = (e) => {
    const f = e.target.files?.[0]
    if (f) upload(f)
    e.target.value = ''
  }

  return (
    <div className="cld-upload-wrap">
      <div
        className={`cld-upload ${compact ? 'cld-upload--compact' : ''} ${dragOver ? 'is-over' : ''} ${uploading ? 'is-uploading' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && !uploading && inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" accept="image/*" hidden onChange={onPick} />
        {uploading ? (
          <div className="cld-upload-progress">
            <div className="cld-upload-bar"><div style={{ width: `${progress}%` }} /></div>
            <span>Feltöltés… {progress}%</span>
          </div>
        ) : (
          <span className="cld-upload-label">
            ⬆ {label}
            <small>húzd ide, vagy kattints a tallózáshoz</small>
          </span>
        )}
      </div>
      {error && <div className="cld-upload-error">{error}</div>}
    </div>
  )
}
