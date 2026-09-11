
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL      = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const CRON_SECRET       = Deno.env.get('CRON_SECRET') ?? ''
const RESEND_API_KEY    = Deno.env.get('RESEND_API_KEY') ?? ''
const SITE_URL          = Deno.env.get('SITE_URL') ?? 'https://hajdutamas.hu'
const HEARTBEAT_URL     = Deno.env.get('HEARTBEAT_URL') ?? ''

const FROM_EMAIL = 'noreply@hajdutamas.hu'
const FROM_NAME  = 'Hajdú Tamás — NOX'

const OFFER_MINUTES = 30

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } })

async function sendOffer(row: any, slot: any, token: string) {
  const acceptUrl  = `${SITE_URL}/confirm?waitlist=${token}&action=accept`
  const declineUrl = `${SITE_URL}/confirm?waitlist=${token}&action=decline`
  const st = String(slot.start_time).slice(0, 5)
  const et = String(slot.end_time).slice(0, 5)

  const html = `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:2rem;background:#1a1510;color:#C8B89A;">
  <h1 style="font-size:2rem;letter-spacing:0.05em;color:#fff;margin-bottom:0.3rem;">HAJDÚ TAMÁS</h1>
  <p style="color:#8B6A4A;font-size:0.75rem;letter-spacing:0.2em;margin-bottom:2rem;">FOTÓS &amp; VIDEÓS</p>
  <h2 style="font-size:1.3rem;color:#fff;margin-bottom:1rem;">Szabad lett egy hely!</h2>
  <p>Kedves <strong style="color:#fff;">${row.name}</strong>,</p>
  <p style="margin-bottom:1.5rem;line-height:1.7;">Feliratkoztál a várólistára – felszabadult egy hely.<br/><strong>Az ajánlat ${OFFER_MINUTES} percig érvényes.</strong></p>
  <div style="background:#2A2520;border-left:3px solid #C4612A;padding:1rem 1.5rem;margin-bottom:2rem;">
    <div style="color:#C4612A;font-size:0.7rem;letter-spacing:0.2em;margin-bottom:0.3rem;">IDŐPONT</div>
    <div style="font-size:1.1rem;color:#fff;font-weight:bold;">${slot.title}</div>
    <div style="color:#C8B89A;margin-top:0.3rem;">${slot.slot_date} · ${st}–${et}</div>
  </div>
  <table><tr>
    <td style="padding-right:0.8rem;">
      <a href="${acceptUrl}" style="display:inline-block;background:#C4612A;color:#fff;padding:0.9rem 1.5rem;text-decoration:none;font-size:0.8rem;letter-spacing:0.15em;text-transform:uppercase;">✓ Elfogadom</a>
    </td>
    <td>
      <a href="${declineUrl}" style="display:inline-block;background:#2A2520;color:#C8B89A;padding:0.9rem 1.5rem;text-decoration:none;font-size:0.8rem;letter-spacing:0.15em;text-transform:uppercase;border:1px solid #3A3530;">Nem kérem</a>
    </td>
  </tr></table>
  <hr style="border-color:#2A2520;margin:2rem 0;"/>
  <p style="font-size:0.7rem;color:#555;line-height:1.6;">
    Ez egy automatikus üzenet – <strong>erre az e-mailre ne válaszolj</strong>, mert nem érkezik meg hozzánk.<br/>
    Ha kérdésed van, írj a hajdutamas.hu oldal Kapcsolat űrlapján.
  </p>
  <p style="font-size:0.7rem;color:#555;margin-top:0.8rem;">hajdutamas.hu</p>
</div>`

  const text = `Kedves ${row.name}!\n\nFelszabadult egy hely: ${slot.title}\n${slot.slot_date} ${st}-${et}\n\nAz ajanlat ${OFFER_MINUTES} percig ervenyes.\n\nElfogadom: ${acceptUrl}\nNem kerem: ${declineUrl}\n\n---\nEz egy automatikus uzenet - erre az e-mailre ne valaszolj.`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: [row.email],
      subject: `Szabad hely – ${slot.title}`,
      html,
      text,
    }),
  })
  if (!res.ok) console.error('Resend hiba:', await res.text())
  return res.ok
}

async function pingHeartbeat() {
  if (!HEARTBEAT_URL) {

    console.warn('heartbeat: a HEARTBEAT_URL nincs beállítva – életjel kimarad')
    return
  }
  try {

    const res = await fetch(HEARTBEAT_URL, {
      method: 'POST',
      signal: AbortSignal.timeout(5000),
    })
    if (res.ok) console.log('heartbeat: életjel elküldve')
    else console.error(`heartbeat ping válasz: ${res.status}`)
  } catch (err) {
    console.error('heartbeat ping nem sikerült:', String(err))
  }
}

serve(async (req) => {

  if (!CRON_SECRET || req.headers.get('x-cron-secret') !== CRON_SECRET) {
    return json({ error: 'Jogosulatlan' }, 401)
  }

  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  const now   = new Date().toISOString()
  const today = now.slice(0, 10)
  const report = { expired: 0, notified: 0, slotsChecked: 0, errors: [] as string[] }

  try {
    const { data: expired, error: e1 } = await db
      .from('appointment_waitlist')
      .select('id')
      .is('response', null)
      .not('notified_at', 'is', null)
      .lt('offer_expires_at', now)
    if (e1) throw e1

    if (expired?.length) {
      const ids = expired.map((r) => r.id)
      const { error: e2 } = await db
        .from('appointment_waitlist')
        .update({ response: 'declined', responded_at: now })
        .in('id', ids)
      if (e2) throw e2
      report.expired = ids.length
    }

    const { data: waitingRows, error: e3 } = await db
      .from('appointment_waitlist')
      .select('slot_id')
      .is('response', null)
      .is('notified_at', null)
    if (e3) throw e3

    const slotIds = [...new Set((waitingRows ?? []).map((r) => r.slot_id))]
    report.slotsChecked = slotIds.length

    for (const slotId of slotIds) {
      const { data: slot } = await db
        .from('appointment_slots')
        .select('id, title, slot_date, start_time, end_time, capacity, booked_count')
        .eq('id', slotId)
        .gte('slot_date', today)
        .maybeSingle()
      if (!slot) continue

      const free = slot.capacity - slot.booked_count
      if (free <= 0) continue

      const { count: activeOffers } = await db
        .from('appointment_waitlist')
        .select('id', { count: 'exact', head: true })
        .eq('slot_id', slotId)
        .is('response', null)
        .not('notified_at', 'is', null)
        .gt('offer_expires_at', now)

      const toOffer = free - (activeOffers ?? 0)
      if (toOffer <= 0) continue

      const { data: nexts } = await db
        .from('appointment_waitlist')
        .select('id, name, email')
        .eq('slot_id', slotId)
        .is('notified_at', null)
        .is('response', null)
        .order('position', { ascending: true })
        .limit(toOffer)
      if (!nexts?.length) continue

      for (const next of nexts) {
        const token     = crypto.randomUUID()
        const expiresAt = new Date(Date.now() + OFFER_MINUTES * 60_000).toISOString()

        const { data: claimed, error: e4 } = await db
          .from('appointment_waitlist')
          .update({ notified_at: now, offer_token: token, offer_expires_at: expiresAt })
          .eq('id', next.id)
          .is('notified_at', null)
          .select('id')
        if (e4) { report.errors.push(`${next.email}: ${e4.message}`); continue }
        if (!claimed?.length) continue

        const sent = await sendOffer(next, slot, token)
        if (sent) report.notified++
        else report.errors.push(`${next.email}: email hiba`)
      }
    }

    console.log('waitlist-tick:', JSON.stringify(report))
    await pingHeartbeat()

    return json({ ok: true, ...report })

  } catch (err) {
    console.error('waitlist-tick hiba:', err)
    return json({ error: String(err), ...report }, 500)
  }
})