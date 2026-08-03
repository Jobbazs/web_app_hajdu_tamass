import { supabase } from '../supabaseClient'

// Cloudinary asset(ek) törlése a 'delete-cloudinary' Edge Functionön át.
// Best-effort: ha hibázik, csak logolunk — a DB-törlés már megtörtént, a
// felhasználó elsődleges művelete (eltávolítás az oldalról) így is sikeres.
export async function deleteCloudinaryAssets(urls) {
  const list = (Array.isArray(urls) ? urls : [urls]).filter(Boolean)
  if (list.length === 0) return { ok: true, deleted: {} }
  try {
    const { data, error } = await supabase.functions.invoke('delete-cloudinary', {
      body: { urls: list },
    })
    if (error) { console.warn('Cloudinary törlés hiba:', error.message); return { ok: false } }
    return data
  } catch (e) {
    console.warn('Cloudinary törlés kivétel:', e)
    return { ok: false }
  }
}