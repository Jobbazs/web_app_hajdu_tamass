// ============================================================
// Supabase Edge Function – delete-cloudinary
// ------------------------------------------------------------
// Cloudinary asset(ek) törlése, KIZÁRÓLAG bejelentkezett adminnak.
// A böngésző nem lát API titkot; a törlés az Admin API-n megy, Basic
// authtal (API_KEY:API_SECRET). Biztonsági korlát: csak a saját mappa
// (WebAppHajduTamas/…) alatti asset törölhető.
//
// Deploy:   supabase functions deploy delete-cloudinary
// Secretek: CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET (már megvannak a sign-upload-hoz)
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const ANON_KEY     = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const API_KEY      = Deno.env.get('CLOUDINARY_API_KEY') ?? ''
const API_SECRET   = Deno.env.get('CLOUDINARY_API_SECRET') ?? ''
// Admin-allowlist (opcionális): ha be van állítva, csak ezek az e-mailek hívhatják.
const ADMIN_EMAILS = (Deno.env.get('ADMIN_EMAILS') ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)

const CLOUD_NAME = 'dpeavk0xh'                 // publikus adat
const ALLOWED_PREFIXES = ['WebAppHajduTamas/'] // csak a saját mappa törölhető

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

// Egy szegmens transzformáció-e (pl. "f_auto,q_auto" vagy "w_800")?
function isTransformSeg(seg: string): boolean {
  return /,/.test(seg) || /^[a-z]{1,3}_[a-z0-9:.\-]+$/i.test(seg)
}

// public_id kinyerése a tárolt URL-ből: mappákkal, de verzió/transzformáció/
// kiterjesztés nélkül. Pl.
//   …/upload/v1699/WebAppHajduTamas/portfolio/kep.jpg → WebAppHajduTamas/portfolio/kep
function publicIdFromUrl(url: unknown): string | null {
  if (typeof url !== 'string') return null
  const after = url.split('/upload/')[1]
  if (!after) return null
  const segs = after.split('/')
  if (segs.length > 1 && isTransformSeg(segs[0])) segs.shift()      // transzformáció
  if (segs.length > 1 && /^v\d+$/.test(segs[0]))  segs.shift()      // verzió
  const id = segs.join('/').replace(/\.[a-zA-Z0-9]+$/, '')          // kiterjesztés le
  return id || null
}

async function deleteBatch(publicIds: string[]): Promise<Record<string, string>> {
  const params = new URLSearchParams()
  for (const id of publicIds) params.append('public_ids[]', id)
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/image/upload?${params.toString()}`,
    { method: 'DELETE', headers: { Authorization: 'Basic ' + btoa(`${API_KEY}:${API_SECRET}`) } },
  )
  const body = await res.json().catch(() => ({}))
  return (body?.deleted ?? {}) as Record<string, string>
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    if (!API_KEY || !API_SECRET) {
      return json({ error: 'A Cloudinary secretek nincsenek beállítva' }, 500)
    }

    // ── Hitelesítés: csak bejelentkezett admin ──
    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader.startsWith('Bearer ')) return json({ error: 'Hiányzó hitelesítés' }, 401)

    const supabase = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return json({ error: 'Érvénytelen munkamenet' }, 401)
    if (ADMIN_EMAILS.length && !ADMIN_EMAILS.includes((user.email ?? '').toLowerCase()))
      return json({ error: 'Nincs jogosultság' }, 403)

    // ── Bemenet: URL-ek és/vagy public_id-k ──
    const body = await req.json().catch(() => ({}))
    const urls: unknown[]     = Array.isArray(body?.urls) ? body.urls : []
    const rawIds: unknown[]   = Array.isArray(body?.publicIds) ? body.publicIds : []

    const ids = [...rawIds, ...urls.map(publicIdFromUrl)]
      .filter((x): x is string => typeof x === 'string' && x.length > 0)

    // Whitelist: csak a saját mappa alatti asset
    const allowed  = ids.filter((id) => ALLOWED_PREFIXES.some((p) => id.startsWith(p)))
    const rejected = ids.filter((id) => !ALLOWED_PREFIXES.some((p) => id.startsWith(p)))

    if (allowed.length === 0) return json({ ok: true, deleted: {}, rejected })

    // Cloudinary max 100/hívás → kötegelés
    const deleted: Record<string, string> = {}
    for (let i = 0; i < allowed.length; i += 100) {
      Object.assign(deleted, await deleteBatch(allowed.slice(i, i + 100)))
    }

    console.log(`Cloudinary törlés – ${user.email} – ${Object.keys(deleted).length} asset`)
    return json({ ok: true, deleted, rejected })

  } catch (err) {
    console.error('delete-cloudinary hiba:', err)
    return json({ error: 'Váratlan szerverhiba' }, 500)
  }
})