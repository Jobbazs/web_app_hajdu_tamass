// ============================================================
// Supabase Edge Function – trigger-deploy
//
// Miért Edge Function és nem frontend fetch:
// a Vercel deploy hook URL-jével bárki korlátlanul deployt indíthat.
// Ha VITE_ env változóba tennénk, belefordulna a publikus JS bundle-be.
// Így a URL szerveroldalon marad, és csak bejelentkezett admin hívhatja.
//
// A deploy indítása mellett IndexNow-értesítést is küld (Bing, Yandex,
// Seznam, Naver): "ezek az URL-ek megváltoztak, gyere és nézd meg".
// A kulcsfájlnak elérhetőnek kell lennie: https://hajdutamas.hu/<KULCS>.txt
//
// Deploy:  supabase functions deploy trigger-deploy
// Secret:  supabase secrets set VERCEL_DEPLOY_HOOK=https://api.vercel.com/v1/integrations/deploy/prj_XXX/YYY
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const VERCEL_HOOK  = Deno.env.get('VERCEL_DEPLOY_HOOK') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const ANON_KEY     = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
// Admin-allowlist (opcionális): ha be van állítva, csak ezek az e-mailek hívhatják.
const ADMIN_EMAILS = (Deno.env.get('ADMIN_EMAILS') ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)

// ── IndexNow ──
const SITE          = 'https://hajdutamas.hu'
const INDEXNOW_KEY  = '14818e802e384191a2fe0ba65ac22eaf'
const INDEXNOW_HOST = 'hajdutamas.hu'

const cors = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })

// Az értesítendő URL-ek listája: főoldal + hub + minden kategória aloldal.
// A kategóriákat a DB-ből olvassuk, így egy új kategória automatikusan
// bekerül – nem kell kézzel bővíteni a listát.
async function buildUrlList(supabase: any): Promise<string[]> {
  const urls = [`${SITE}/`, `${SITE}/portfolio`]
  const { data, error } = await supabase
    .from('portfolio_categories')
    .select('slug')
    .order('sort_order', { ascending: true })
  if (error) {
    console.error('IndexNow: kategóriák olvasása sikertelen:', error.message)
    return urls
  }
  for (const c of data ?? []) urls.push(`${SITE}/portfolio/${c.slug}`)
  return urls
}

// Best-effort értesítés: ha elbukik, a deploy attól még érvényes.
async function pingIndexNow(urlList: string[]) {
  try {
    const res = await fetch('https://api.indexnow.org/IndexNow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: INDEXNOW_HOST,
        key: INDEXNOW_KEY,
        keyLocation: `${SITE}/${INDEXNOW_KEY}.txt`,
        urlList,
      }),
    })

    // 200 = elfogadva · 202 = elfogadva, kulcs ellenőrzése folyamatban
    if (res.status === 200 || res.status === 202) {
      console.log(`IndexNow OK (${res.status}) – ${urlList.length} URL beküldve`)
      return { ok: true, status: res.status, count: urlList.length }
    }

    const reasons: Record<number, string> = {
      400: 'Hibás kérés',
      403: 'A kulcsot nem fogadta el – ellenőrizd, hogy a kulcsfájl elérhető',
      422: 'Az URL-ek nem ehhez a domainhez tartoznak, vagy a kulcs nem egyezik',
      429: 'Túl sok kérés – próbáld később',
    }
    const reason = reasons[res.status] ?? `Váratlan válasz (${res.status})`
    console.error('IndexNow hiba:', res.status, reason)
    return { ok: false, status: res.status, error: reason }

  } catch (err) {
    console.error('IndexNow kivétel:', err)
    return { ok: false, error: 'Nem sikerült elérni az IndexNow szolgáltatást' }
  }
}

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
    if (ADMIN_EMAILS.length && !ADMIN_EMAILS.includes((user.email ?? '').toLowerCase()))
      return json({ error: 'Nincs jogosultság' }, 403)

    // ── Deploy indítása ──
    const res = await fetch(VERCEL_HOOK, { method: 'POST' })
    if (!res.ok) {
      const detail = await res.text()
      console.error('Vercel hook hiba:', detail)
      return json({ error: 'A Vercel elutasította a kérést', detail }, 502)
    }

    const data = await res.json().catch(() => ({}))
    console.log(`Deploy indítva – kérte: ${user.email}`)

    // ── IndexNow értesítés (best-effort, nem befolyásolja a deployt) ──
    const urlList  = await buildUrlList(supabase)
    const indexNow = await pingIndexNow(urlList)

    return json({ ok: true, job: data?.job ?? null, indexNow })

  } catch (err) {
    console.error('trigger-deploy hiba:', err)
    return json({ error: String(err) }, 500)
  }
})