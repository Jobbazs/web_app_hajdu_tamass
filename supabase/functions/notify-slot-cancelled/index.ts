// ============================================================
// Supabase Edge Function – notify-slot-cancelled
//
// Egy időpont (slot) admin általi törlésekor:
//   1) ellenőrzi, hogy a hívó BEJELENTKEZETT admin (JWT),
//   2) kiolvassa a slot összes AKTÍV foglalóját (service_role),
//   3) mindegyiknek küld egy értesítő emailt a törlés okával,
//   4) törli a slotot (a FK cascade viszi a foglalásokat + várólistát).
//
// A címzetteket a DB-ből, a slotId alapján szedjük (nem a hívótól),
// így nem használható tetszőleges címre spamre. A törlés okát az
// admin adja meg (megbízható).
//
// Deploy (alapértelmezett verify_jwt – kell a session JWT):
//   supabase functions deploy notify-slot-cancelled
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL   = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const ANON_KEY       = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''

const FROM_EMAIL = 'noreply@hajdutamas.hu'
const FROM_NAME  = 'Hajdú Tamás — NOX'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

// ── Értesítő email egy foglalónak ──────────────────────────
async function sendCancellation(row: any, slot: any, reason: string) {
  const st = String(slot.start_time).slice(0, 5)
  const et = String(slot.end_time).slice(0, 5)

  const reasonBlock = reason && reason.trim()
    ? `<div style="background:#2A2520;border-left:3px solid #8B6A4A;padding:1rem 1.5rem;margin-bottom:2rem;">
         <div style="color:#8B6A4A;font-size:0.7rem;letter-spacing:0.2em;margin-bottom:0.3rem;">TÖRLÉS OKA</div>
         <div style="color:#C8B89A;line-height:1.6;">${escapeHtml(reason.trim())}</div>
       </div>`
    : ''

  const html = `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:2rem;background:#1a1510;color:#C8B89A;">
  <h1 style="font-size:2rem;letter-spacing:0.05em;color:#fff;margin-bottom:0.3rem;">HAJDÚ TAMÁS</h1>
  <p style="color:#8B6A4A;font-size:0.75rem;letter-spacing:0.2em;margin-bottom:2rem;">FOTÓS & VIDEÓS</p>
  <h2 style="font-size:1.3rem;color:#fff;margin-bottom:1rem;">Sajnálom – ez az időpont elmarad</h2>
  <p>Kedves <strong style="color:#fff;">${escapeHtml(row.name)}</strong>,</p>
  <p style="margin-bottom:1.5rem;line-height:1.7;">Ezennel szeretnélek értesíteni, hogy az alábbi időpontot sajnos <strong>nem tudom megtartani</strong>.</p>
  <div style="background:#2A2520;border-left:3px solid #C4612A;padding:1rem 1.5rem;margin-bottom:2rem;">
    <div style="color:#C4612A;font-size:0.7rem;letter-spacing:0.2em;margin-bottom:0.3rem;">ELMARADÓ IDŐPONT</div>
    <div style="font-size:1.1rem;color:#fff;font-weight:bold;">${escapeHtml(slot.title)}</div>
    <div style="color:#C8B89A;margin-top:0.3rem;">${slot.slot_date} · ${st}–${et}</div>
  </div>
  ${reasonBlock}
  <p style="margin-bottom:0.6rem;line-height:1.7;">Köszönöm a megértésedet, és elnézést kérek a kellemetlenségért.</p>
  <p style="margin-bottom:1.5rem;line-height:1.7;">Remélem, egy másik alkalommal sikerül – <strong style="color:#fff;">várlak szeretettel máskor!</strong></p>
  <hr style="border-color:#2A2520;margin:2rem 0;"/>
  <p style="font-size:0.7rem;color:#555;line-height:1.6;">
    Ez egy automatikus üzenet – <strong>erre az e-mailre ne válaszolj</strong>, mert nem érkezik meg hozzánk.<br/>
    Ha kérdésed van, írj a hajdutamas.hu oldal Kapcsolat űrlapján.
  </p>
  <p style="font-size:0.7rem;color:#555;margin-top:0.8rem;">hajdutamas.hu</p>
</div>`

  const text = `Kedves ${row.name}!\n\nEzennel szeretnelek ertesiteni, hogy az alabbi idopontot sajnos nem tudom megtartani:\n${slot.title}\n${slot.slot_date} ${st}-${et}\n${reason && reason.trim() ? `\nTorles oka: ${reason.trim()}\n` : ''}\nKoszonom a megertesedet, es elnezest kerek a kellemetlensegert.\nRemelem, egy masik alkalommal sikerul - varlak szeretettel maskor!\n\n---\nEz egy automatikus uzenet - erre az e-mailre ne valaszolj, mert nem erkezik meg hozzank.\nKerdes eseten irj a hajdutamas.hu oldal Kapcsolat urlapjan.`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: [row.email],
      subject: `Elmaradó időpont – ${slot.title}`,
      html,
      text,
    }),
  })
  if (!res.ok) console.error('Resend hiba:', await res.text())
  return res.ok
}

function escapeHtml(s: string) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // ── 1. Admin auth: bejelentkezett felhasználó kell ──
    const authHeader = req.headers.get('Authorization') ?? ''
    const jwt = authHeader.replace('Bearer ', '').trim()
    if (!jwt) return json({ error: 'Hiányzó Authorization' }, 401)

    const authClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userErr } = await authClient.auth.getUser(jwt)
    if (userErr || !user) return json({ error: 'Jogosulatlan' }, 401)

    // ── 2. Bemenet ──
    const { slotId, reason } = await req.json()
    if (!slotId) return json({ error: 'Hiányzó slotId' }, 400)

    const db = createClient(SUPABASE_URL, SERVICE_ROLE)

    // slot adatai
    const { data: slot } = await db
      .from('appointment_slots')
      .select('id, title, slot_date, start_time, end_time')
      .eq('id', slotId)
      .maybeSingle()
    if (!slot) return json({ error: 'Ismeretlen slot' }, 404)

    // ── 3. Aktív foglalók értesítése ──
    const { data: appts } = await db
      .from('appointments')
      .select('name, email, status')
      .eq('slot_id', slotId)
      .in('status', ['pending_confirmation', 'confirmed', 'approved'])

    // Egy címzett többször is foglalhatott – dedup email szerint
    const seen = new Set<string>()
    const recipients = (appts ?? []).filter((a) => {
      const key = (a.email || '').toLowerCase()
      if (!key || seen.has(key)) return false
      seen.add(key); return true
    })

    const report = { sent: 0, errors: [] as string[] }
    for (const a of recipients) {
      const ok = await sendCancellation(a, slot, reason ?? '')
      if (ok) report.sent++
      else report.errors.push(a.email)
    }

    // ── 4. Slot törlése (cascade: appointments + waitlist) ──
    const { error: delErr } = await db.from('appointment_slots').delete().eq('id', slotId)
    if (delErr) {
      return json({ error: 'Törlési hiba', detail: delErr.message, ...report }, 500)
    }

    return json({ ok: true, deleted: true, ...report })

  } catch (err) {
    console.error('notify-slot-cancelled hiba:', err)
    return json({ error: String(err) }, 500)
  }
})
