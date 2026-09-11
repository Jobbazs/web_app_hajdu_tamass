

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const ANON_KEY     = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const API_KEY      = Deno.env.get('CLOUDINARY_API_KEY') ?? ''
const API_SECRET   = Deno.env.get('CLOUDINARY_API_SECRET') ?? ''
const ADMIN_EMAILS = (Deno.env.get('ADMIN_EMAILS') ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)

const CLOUD_NAME = 'dpeavk0xh'

const ALLOWED_FOLDERS = new Set([
  'WebAppHajduTamas/portfolio',
  'WebAppHajduTamas/covers',
  'WebAppHajduTamas/content',
])
const DEFAULT_FOLDER = 'WebAppHajduTamas/portfolio'

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

async function sha1Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-1', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    if (!API_KEY || !API_SECRET) {
      return json({ error: 'A Cloudinary secretek nincsenek beállítva' }, 500)
    }

    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader.startsWith('Bearer ')) {
      return json({ error: 'Hiányzó hitelesítés' }, 401)
    }

    const supabase = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return json({ error: 'Érvénytelen munkamenet' }, 401)
    }
    if (ADMIN_EMAILS.length && !ADMIN_EMAILS.includes((user.email ?? '').toLowerCase()))
      return json({ error: 'Nincs jogosultság' }, 403)

    const body = await req.json().catch(() => ({}))
    const requested = typeof body?.folder === 'string' ? body.folder : ''
    const folder = ALLOWED_FOLDERS.has(requested) ? requested : DEFAULT_FOLDER

    const timestamp = Math.floor(Date.now() / 1000)
    const params: Record<string, string | number> = { folder, timestamp }

    const toSign = Object.keys(params)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join('&')

    const signature = await sha1Hex(toSign + API_SECRET)

    console.log(`Aláírás kiadva – ${user.email} – mappa: ${folder}`)

    return json({
      ok: true,
      cloudName: CLOUD_NAME,
      apiKey: API_KEY,
      timestamp,
      folder,
      signature,
    })

  } catch (err) {
    console.error('sign-upload hiba:', err)
    return json({ error: 'Váratlan szerverhiba' }, 500)
  }
})