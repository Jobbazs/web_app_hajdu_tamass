// ============================================================
// Supabase Edge Function – trigger-deploy
//
// Miért Edge Function és nem frontend fetch:
// a Vercel deploy hook URL-jével bárki korlátlanul deployt indíthat.
// Ha VITE_ env változóba tennénk, belefordulna a publikus JS bundle-be.
// Így a URL szerveroldalon marad, és csak bejelentkezett admin hívhatja.
//
// Deploy:  supabase functions deploy trigger-deploy
// Secret:  supabase secrets set VERCEL_DEPLOY_HOOK=https://api.vercel.com/v1/integrations/deploy/prj_XXX/YYY
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const VERCEL_HOOK  = Deno.env.get('VERCEL_DEPLOY_HOOK') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const ANON_KEY     = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

const cors = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    if (!VERCEL_HOOK) {
      return json({ error: 'VERCEL_DEPLOY_HOOK nincs beállítva' }, 500)
    }

    // ── Hitelesítés: csak bejelentkezett admin indíthat deployt ──
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

    // ── Deploy indítása ──
    const res = await fetch(VERCEL_HOOK, { method: 'POST' })
    if (!res.ok) {
      const detail = await res.text()
      console.error('Vercel hook hiba:', detail)
      return json({ error: 'A Vercel elutasította a kérést', detail }, 502)
    }

    const data = await res.json().catch(() => ({}))
    console.log(`Deploy indítva – kérte: ${user.email}`)

    return json({ ok: true, job: data?.job ?? null })

  } catch (err) {
    console.error('trigger-deploy hiba:', err)
    return json({ error: String(err) }, 500)
  }
})
