// Supabase Edge Function – submit-contact
// A kapcsolat-űrlap beküldése spam-ellenőrzéssel:
//   1) honeypot mező (rejtett; ha kitöltött → csendes elutasítás)
//   2) idő-csapda (túl gyors beküldés → csendes elutasítás)
//   3) IP rate limit (túl sok beküldés ugyanarról az IP-ről → 429)
// Csak siker esetén szúrja be az üzenetet (service_role).
//
// Deploy:
//   supabase functions deploy submit-contact
// Nem kell külön secret (a SUPABASE_URL és SERVICE_ROLE_KEY beépített).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const db = createClient(SUPABASE_URL, SERVICE_ROLE)

// Beállítások
const MIN_ELAPSED_MS = 3000      // ennél gyorsabb beküldés = bot
const WINDOW_MIN = 10            // rate limit ablak (perc)
const MAX_PER_WINDOW = 5         // ennyi beküldés / IP / ablak felett tiltás

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json().catch(() => ({}))
    const { name, email, message, service, attachment_url, hp, rendered_at } = body ?? {}

    // 1) Honeypot – ha ki van töltve, úgy teszünk, mintha sikerült volna (delivered:false)
    if (typeof hp === 'string' && hp.trim() !== '') {
      return json({ ok: true, delivered: false })
    }

    // 2) Idő-csapda – túl gyors beküldés → csendes elutasítás
    const elapsed = Date.now() - Number(rendered_at || 0)
    if (!rendered_at || Number.isNaN(elapsed) || elapsed < MIN_ELAPSED_MS) {
      return json({ ok: true, delivered: false })
    }

    // 3) Alap validáció
    if (!name || !email || !message) {
      return json({ ok: false, error: 'invalid' }, 400)
    }

    // 4) IP rate limit
    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown'
    const now = Date.now()
    const since = new Date(now - WINDOW_MIN * 60_000).toISOString()

    // housekeeping: 1 óránál régebbi sorok törlése
    await db.from('rate_limits').delete().lt('created_at', new Date(now - 60 * 60_000).toISOString())

    const { count } = await db
      .from('rate_limits')
      .select('id', { count: 'exact', head: true })
      .eq('ip', ip)
      .eq('action', 'contact')
      .gte('created_at', since)

    if ((count || 0) >= MAX_PER_WINDOW) {
      return json({ ok: false, error: 'rate_limited' }, 429)
    }

    await db.from('rate_limits').insert({ ip, action: 'contact' })

    // 5) Üzenet beszúrása (service_role → megkerüli az RLS-t)
    const { error } = await db.from('messages').insert({
      name: String(name).trim(),
      email: String(email).trim(),
      service: service || 'Nem megadott',
      message: String(message).trim(),
      read: false,
      attachment_url: attachment_url || null,
    })
    if (error) {
      console.error('insert error:', error)
      return json({ ok: false, error: 'db' }, 500)
    }

    return json({ ok: true, delivered: true })
  } catch (e) {
    console.error('submit-contact error:', e)
    return json({ ok: false, error: 'server' }, 500)
  }
})
