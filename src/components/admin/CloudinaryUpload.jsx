import { useState, useRef } from 'react'
import { supabase } from '../../supabaseClient'

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024
const TARGET_BYTES     = 9.3 * 1024 * 1024

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload  = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('kép betöltési hiba')) }
    img.src = url
  })
}

function canvasToBlob(canvas, quality) {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', quality))
}

async function compressImage(file) {
  const img = await loadImage(file)
  let maxDim  = Math.min(Math.max(img.width, img.height), 4000)
  let quality = 0.85
  let blob = null

  for (let i = 0; i < 14; i++) {
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
    const w = Math.max(1, Math.round(img.width * scale))
    const h = Math.max(1, Math.round(img.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w; canvas.height = h
    canvas.getContext('2d').drawImage(img, 0, 0, w, h)
    blob = await canvasToBlob(canvas, quality)
    if (blob && blob.size <= TARGET_BYTES) break
    if (quality > 0.5) quality -= 0.1
    else maxDim = Math.round(maxDim * 0.85)
  }
  if (!blob) return file
  const name = file.name.replace(/\.[^.]+$/, '') + '.jpg'
  return new File([blob], name, { type: 'image/jpeg' })
}

export default function CloudinaryUpload({
  onUploaded,
  label = 'Kép feltöltése',
  compact = false,
  folder = 'WebAppHajduTamas/portfolio',
}) {
  const [uploading, setUploading] = useState(false)
  const [compressing, setCompressing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)

  const upload = async (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Csak képfájl tölthető fel.'); return }
    setError(''); setUploading(true); setProgress(0)

    if (file.size > MAX_UPLOAD_BYTES) {
      setCompressing(true)
      try {
        file = await compressImage(file)
      } catch {
        setCompressing(false); setUploading(false)
        setError('A kép tömörítése nem sikerült. Próbálj kisebb vagy más képet.')
        return
      }
      setCompressing(false)
      if (file.size > MAX_UPLOAD_BYTES) {
        setUploading(false)
        setError('A kép a tömörítés után is 10 MB felett van. Próbálj kisebb képet.')
        return
      }
    }

    let sig
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('sign-upload', {
        body: { folder },
      })
      if (fnErr || !data?.ok) throw new Error(data?.error || fnErr?.message || 'ismeretlen hiba')
      sig = data
    } catch (err) {
      setUploading(false)
      setError(`Az aláírás kérése nem sikerült (${err.message}). Jelentkezz be újra.`)
      return
    }

    const fd = new FormData()
    fd.append('file', file)
    fd.append('api_key', sig.apiKey)
    fd.append('timestamp', sig.timestamp)
    fd.append('signature', sig.signature)
    fd.append('folder', sig.folder)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`)
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
      } else {
        let msg = `Feltöltési hiba (${xhr.status}).`
        try {
          const e = JSON.parse(xhr.responseText)
          if (e?.error?.message) msg = `Cloudinary: ${e.error.message}`
        } catch {}
        setError(msg)
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
            {compressing ? (
              <span>Kép tömörítése…</span>
            ) : (
              <>
                <div className="cld-upload-bar"><div style={{ width: `${progress}%` }} /></div>
                <span>Feltöltés… {progress}%</span>
              </>
            )}
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