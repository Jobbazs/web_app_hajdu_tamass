// ============================================================
// Resend.com email küldés
// .env fájlba: VITE_RESEND_API_KEY=re_xxxxxxxxx
// ============================================================

const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY || 'PLACEHOLDER_ADD_YOUR_KEY'
const FROM_EMAIL     = 'foglalas@hajdutamas.hu'
const FROM_NAME      = 'Hajdú Tamás — NOX'

export async function sendBookingConfirmation({
  to, name, slotTitle, slotDate, startTime, endTime, confirmToken
}) {
  const confirmUrl = `${window.location.origin}/confirm?token=${confirmToken}`

  const html = `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:2rem;background:#1a1510;color:#C8B89A;">
  <h1 style="font-size:2rem;letter-spacing:0.05em;color:#fff;margin-bottom:0.3rem;">HAJDÚ TAMÁS</h1>
  <p style="color:#8B6A4A;font-size:0.75rem;letter-spacing:0.2em;margin-bottom:2rem;">FOTÓS & VIDEÓS</p>
  <h2 style="font-size:1.3rem;color:#fff;margin-bottom:1rem;">Erősítsd meg a foglalásodat</h2>
  <p>Kedves <strong>${name}</strong>,</p>
  <p style="margin-bottom:1.5rem;">Foglalási kérelmed megérkezett. Kattints a gombra <strong>10 percen belül</strong> a megerősítéshez.</p>
  <div style="background:#2A2520;border-left:3px solid #C4612A;padding:1rem 1.5rem;margin-bottom:2rem;">
    <div style="color:#C4612A;font-size:0.7rem;letter-spacing:0.2em;margin-bottom:0.3rem;">IDŐPONT</div>
    <div style="font-size:1.1rem;color:#fff;font-weight:bold;">${slotTitle}</div>
    <div style="color:#C8B89A;margin-top:0.3rem;">${slotDate} · ${startTime}–${endTime}</div>
  </div>
  <a href="${confirmUrl}" style="display:inline-block;background:#C4612A;color:#fff;padding:0.9rem 2rem;text-decoration:none;font-size:0.8rem;letter-spacing:0.15em;text-transform:uppercase;font-weight:bold;">
    Foglalás megerősítése →
  </a>
  <p style="margin-top:2rem;font-size:0.75rem;color:#666;">Ha nem te kezdeményezted, hagyd figyelmen kívül.</p>
  <hr style="border-color:#2A2520;margin:2rem 0;"/>
  <p style="font-size:0.7rem;color:#555;">hajdutamas.hu</p>
</div>`

  return sendEmail({ to, subject: `Foglalás megerősítése – ${slotTitle}`, html })
}

export async function sendWaitlistOffer({
  to, name, slotTitle, slotDate, startTime, endTime, offerToken
}) {
  const acceptUrl  = `${window.location.origin}/confirm?waitlist=${offerToken}&action=accept`
  const declineUrl = `${window.location.origin}/confirm?waitlist=${offerToken}&action=decline`

  const html = `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:2rem;background:#1a1510;color:#C8B89A;">
  <h1 style="font-size:2rem;letter-spacing:0.05em;color:#fff;margin-bottom:0.3rem;">HAJDÚ TAMÁS</h1>
  <p style="color:#8B6A4A;font-size:0.75rem;letter-spacing:0.2em;margin-bottom:2rem;">FOTÓS & VIDEÓS</p>
  <h2 style="font-size:1.3rem;color:#fff;margin-bottom:1rem;">Szabad lett egy hely!</h2>
  <p>Kedves <strong>${name}</strong>,</p>
  <p style="margin-bottom:1.5rem;">Feliratkoztál a várólistára – felszabadult egy hely. <strong>Az ajánlat 30 percig érvényes.</strong></p>
  <div style="background:#2A2520;border-left:3px solid #C4612A;padding:1rem 1.5rem;margin-bottom:2rem;">
    <div style="color:#C4612A;font-size:0.7rem;letter-spacing:0.2em;margin-bottom:0.3rem;">IDŐPONT</div>
    <div style="font-size:1.1rem;color:#fff;font-weight:bold;">${slotTitle}</div>
    <div style="color:#C8B89A;margin-top:0.3rem;">${slotDate} · ${startTime}–${endTime}</div>
  </div>
  <a href="${acceptUrl}" style="display:inline-block;background:#C4612A;color:#fff;padding:0.9rem 1.5rem;text-decoration:none;font-size:0.8rem;letter-spacing:0.15em;text-transform:uppercase;margin-right:0.8rem;">✓ Elfogadom</a>
  <a href="${declineUrl}" style="display:inline-block;background:#2A2520;color:#C8B89A;padding:0.9rem 1.5rem;text-decoration:none;font-size:0.8rem;letter-spacing:0.15em;text-transform:uppercase;border:1px solid #3A3530;">Nem kérem</a>
  <hr style="border-color:#2A2520;margin:2rem 0;"/>
  <p style="font-size:0.7rem;color:#555;">hajdutamas.hu</p>
</div>`

  return sendEmail({ to, subject: `Szabad hely – ${slotTitle}`, html })
}

async function sendEmail({ to, subject, html }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to:   [to],
      subject,
      html,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    console.error('Resend error:', err)
    throw new Error('Email küldési hiba')
  }
  return res.json()
}
