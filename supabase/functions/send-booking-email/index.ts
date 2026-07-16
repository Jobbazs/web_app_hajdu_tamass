// Supabase Edge Function – send-booking-email
// Deploy parancs:
//   supabase functions deploy send-booking-email
// API kulcs beállítás (egyszer kell):
//   supabase secrets set RESEND_API_KEY=re_xxxxxxxxx

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const FROM_EMAIL     = 'foglalas@hajdutamas.hu'
const FROM_NAME      = 'Hajdú Tamás — NOX'

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, name, slotTitle, slotDate, startTime, endTime, confirmToken, isWaitlist, offerToken } = await req.json()

    if (!to || !name) {
      return new Response(JSON.stringify({ error: 'Hiányzó mezők: to, name' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const origin = req.headers.get('origin') || 'https://hajdutamas.hu'
    let subject: string
    let html: string

    if (isWaitlist && offerToken) {
      const acceptUrl  = `${origin}/confirm?waitlist=${offerToken}&action=accept`
      const declineUrl = `${origin}/confirm?waitlist=${offerToken}&action=decline`
      subject = `Szabad hely – ${slotTitle}`
      html = `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:2rem;background:#1a1510;color:#C8B89A;">
  <h1 style="font-size:2rem;letter-spacing:0.05em;color:#fff;margin-bottom:0.3rem;">HAJDÚ TAMÁS</h1>
  <p style="color:#8B6A4A;font-size:0.75rem;letter-spacing:0.2em;margin-bottom:2rem;">FOTÓS & VIDEÓS</p>
  <h2 style="font-size:1.3rem;color:#fff;margin-bottom:1rem;">Szabad lett egy hely!</h2>
  <p>Kedves <strong style="color:#fff;">${name}</strong>,</p>
  <p style="margin-bottom:1.5rem;line-height:1.7;">Feliratkoztál a várólistára – felszabadult egy hely.<br/><strong>Az ajánlat 30 percig érvényes.</strong></p>
  <div style="background:#2A2520;border-left:3px solid #C4612A;padding:1rem 1.5rem;margin-bottom:2rem;">
    <div style="color:#C4612A;font-size:0.7rem;letter-spacing:0.2em;margin-bottom:0.3rem;">IDŐPONT</div>
    <div style="font-size:1.1rem;color:#fff;font-weight:bold;">${slotTitle}</div>
    <div style="color:#C8B89A;margin-top:0.3rem;">${slotDate} · ${startTime}–${endTime}</div>
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
  <p style="font-size:0.7rem;color:#555;">hajdutamas.hu</p>
</div>`
    } else {
      const confirmUrl = `${origin}/confirm?token=${confirmToken}`
      subject = `Foglalás megerősítése – ${slotTitle}`
      html = `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:2rem;background:#1a1510;color:#C8B89A;">
  <h1 style="font-size:2rem;letter-spacing:0.05em;color:#fff;margin-bottom:0.3rem;">HAJDÚ TAMÁS</h1>
  <p style="color:#8B6A4A;font-size:0.75rem;letter-spacing:0.2em;margin-bottom:2rem;">FOTÓS & VIDEÓS</p>
  <h2 style="font-size:1.3rem;color:#fff;margin-bottom:1rem;">Erősítsd meg a foglalásodat</h2>
  <p>Kedves <strong style="color:#fff;">${name}</strong>,</p>
  <p style="margin-bottom:1.5rem;line-height:1.7;">Foglalási kérelmed megérkezett. Kattints a gombra <strong>10 percen belül</strong> a megerősítéshez.</p>
  <div style="background:#2A2520;border-left:3px solid #C4612A;padding:1rem 1.5rem;margin-bottom:2rem;">
    <div style="color:#C4612A;font-size:0.7rem;letter-spacing:0.2em;margin-bottom:0.3rem;">IDŐPONT</div>
    <div style="font-size:1.1rem;color:#fff;font-weight:bold;">${slotTitle}</div>
    <div style="color:#C8B89A;margin-top:0.3rem;">${slotDate} · ${startTime}–${endTime}</div>
  </div>
  <a href="${confirmUrl}" style="display:inline-block;background:#C4612A;color:#fff;padding:0.9rem 2rem;text-decoration:none;font-size:0.8rem;letter-spacing:0.15em;text-transform:uppercase;font-weight:bold;">Foglalás megerősítése →</a>
  <p style="margin-top:2rem;font-size:0.75rem;color:#666;line-height:1.6;">⚠ Ez a link <strong>10 percig érvényes</strong>.<br/>Ha nem te kezdeményezted, hagyd figyelmen kívül.</p>
  <hr style="border-color:#2A2520;margin:2rem 0;"/>
  <p style="font-size:0.7rem;color:#555;">hajdutamas.hu</p>
</div>`
    }

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
body: JSON.stringify({
  from: `${FROM_NAME} <${FROM_EMAIL}>`,
  to: [to],
  subject,
  html,
  text: isWaitlist
    ? `Kedves ${name}!\n\nFelszabadult egy hely: ${slotTitle}\n${slotDate} ${startTime}-${endTime}\n\nAz ajánlat 30 percig érvényes.\n\nElfogadom: ${origin}/confirm?waitlist=${offerToken}&action=accept\nNem kérem: ${origin}/confirm?waitlist=${offerToken}&action=decline\n\nhajdutamas.hu`
    : `Kedves ${name}!\n\nFoglalási kérelmed megérkezett:\n${slotTitle}\n${slotDate} ${startTime}-${endTime}\n\nErősítsd meg 10 percen belül:\n${origin}/confirm?token=${confirmToken}\n\nHa nem te kezdeményezted, hagyd figyelmen kívül.\n\nhajdutamas.hu`,
  reply_to: 'info@hajdutamas.hu',
}),
    })

    if (!resendRes.ok) {
      const errBody = await resendRes.text()
      console.error('Resend error:', errBody)
      return new Response(JSON.stringify({ error: 'Resend hiba', detail: errBody }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const data = await resendRes.json()
    return new Response(JSON.stringify({ ok: true, id: data.id }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('Edge function error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
