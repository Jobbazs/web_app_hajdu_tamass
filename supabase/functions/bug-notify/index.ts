// bug-notify — a beérkezett hibajegyek e-mail-továbbítása Resend-del.
//
// LIMIT-TUDATOS: ha a napi/havi bug-küldés-sapka betelt, VAGY a Resend
// rate-limitet ad (429), a jegy a DB-ben MARAD (notified_at = null), és a
// következő cron-futáskor újrapróbáljuk – a limit resetje után magától
// elmegy. Így egyetlen hibajegy sem vész el.
//
// Az e-mail tartalmaz két gombot: "Folyamatban" és "Lezárva" – ezek a
// bug-status függvényre mutatnak (token alapú státusz-váltás bejelentkezés nélkül).
//
// pg_cron hívja (net.http_post + x-cron-secret). CRON_SECRET nélkül ZÁRVA.
// Titkok: supabase secrets set CRON_SECRET=... RESEND_API_KEY=...

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const CRON_SECRET      = Deno.env.get('CRON_SECRET') ?? ''
const RESEND_API_KEY   = Deno.env.get('RESEND_API_KEY') ?? ''

const FROM_EMAIL      = 'noreply@hajdutamas.hu'
const TO_EMAIL        = 'balazsgregadev@gmail.com'
const FUNCTIONS_BASE  = `${SUPABASE_URL}/functions/v1`
const PER_RUN      = 20
const DAILY_CAP    = 80
const MONTHLY_CAP  = 2500
const MAX_ATTEMPTS = 5

function sbFetch(path: string, init: RequestInit = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  })
}

function esc(s: unknown): string {
  return String(s ?? '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string))
}

async function countSince(iso: string): Promise<number> {
  const res = await sbFetch(`bug_tickets?select=id&notified_at=gte.${iso}`, {
    headers: { Prefer: 'count=exact', Range: '0-0' },
  })
  const cr = res.headers.get('content-range') ?? '*/0'
  return parseInt(cr.split('/')[1] ?? '0', 10) || 0
}

function statusButtons(token: string): string {
  const t = encodeURIComponent(token)
  const btn = 'display:inline-block;padding:11px 20px;text-decoration:none;border-radius:4px;font-weight:600;'
  return (
    `<p style="margin-top:20px">` +
    `<a href="${FUNCTIONS_BASE}/bug-status?token=${t}&status=in_progress" style="${btn}background:#B5231E;color:#fff;margin-right:10px">Folyamatban</a>` +
    `<a href="${FUNCTIONS_BASE}/bug-status?token=${t}&status=closed" style="${btn}background:#555;color:#fff">Lezárva</a>` +
    `</p>`
  )
}

Deno.serve(async (req) => {
  if (!CRON_SECRET) return new Response('closed', { status: 503 })
  if (req.headers.get('x-cron-secret') !== CRON_SECRET) {
    return new Response('unauthorized', { status: 401 })
  }

  const now = new Date()
  const dayStart   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString()
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()

  const dayCnt = await countSince(dayStart)
  const monCnt = await countSince(monthStart)

  const remaining = Math.min(PER_RUN, DAILY_CAP - dayCnt, MONTHLY_CAP - monCnt)
  if (remaining <= 0) {
    return new Response(JSON.stringify({ sent: 0, reason: 'napi/havi limit betelt' }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    })
  }

  const pendRes = await sbFetch(
    `bug_tickets?select=*&notified_at=is.null&notify_attempts=lt.${MAX_ATTEMPTS}&order=created_at.asc&limit=${remaining}`,
  )
  const pending = await pendRes.json()

  let sent = 0
  let rateLimited = false

  for (const t of pending) {
    const logRows = Array.isArray(t.activity_log)
      ? t.activity_log.map((e: Record<string, unknown>) => `<li>${esc(e.t)} — ${esc(e.type)}: ${esc(e.detail)}</li>`).join('')
      : ''
    const html =
      `<h2>Új hibajegy</h2>` +
      `<p><strong>Beküldő:</strong> ${esc(t.created_by) || '—'}<br/>` +
      `<strong>Időpont:</strong> ${esc(t.created_at)}</p>` +
      `<p><strong>Mi a hiba:</strong><br/>${esc(t.description).replace(/\n/g, '<br/>')}</p>` +
      (t.cause ? `<p><strong>Lehetséges ok:</strong><br/>${esc(t.cause).replace(/\n/g, '<br/>')}</p>` : '') +
      (logRows ? `<p><strong>Aktivitás-napló:</strong></p><ul>${logRows}</ul>` : '') +
      statusButtons(t.status_token)

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `NOX Hibajegy <${FROM_EMAIL}>`,
        to: TO_EMAIL,
        subject: `Új hibajegy: ${String(t.description ?? '').slice(0, 60)}`,
        html,
      }),
    })

    if (resendRes.status === 429) { rateLimited = true; break }

    if (resendRes.ok) {
      await sbFetch(`bug_tickets?id=eq.${t.id}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ notified_at: new Date().toISOString() }),
      })
      sent++
    } else {
      await sbFetch(`bug_tickets?id=eq.${t.id}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ notify_attempts: (t.notify_attempts ?? 0) + 1 }),
      })
    }
  }

  return new Response(JSON.stringify({ sent, rateLimited, pending: pending.length }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  })
})