// bug-status — a hibajegy e-mailben lévő "Folyamatban" / "Lezárva" gombok célja.
// Token alapján állítja a státuszt, BEJELENTKEZÉS NÉLKÜL (mint a foglalás
// megerősítő linkje). Egyszerű HTML visszaigazoló lapot ad vissza.
// Nyilvános végpont – deploykor: supabase functions deploy bug-status --no-verify-jwt

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

function page(inner: string): Response {
  const html =
    `<!doctype html><html lang="hu"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1"><title>Hibajegy</title>` +
    `<style>body{font-family:system-ui,-apple-system,sans-serif;background:#1a1510;color:#e8dcc8;` +
    `display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:2rem;text-align:center}` +
    `div{max-width:440px}strong{color:#FF3B30}h2{margin:0 0 .5rem}</style></head>` +
    `<body><div>${inner}</div></body></html>`
  return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const token  = url.searchParams.get('token') ?? ''
  const status = url.searchParams.get('status') ?? ''

  if (token.length < 10 || !['in_progress', 'closed'].includes(status)) {
    return page('Érvénytelen kérés.')
  }

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/bug_tickets?status_token=eq.${encodeURIComponent(token)}`,
    {
      method: 'PATCH',
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ status }),
    },
  )
  const rows = await res.json().catch(() => [])
  if (!res.ok || !Array.isArray(rows) || rows.length === 0) {
    return page('A hibajegy nem található (elképzelhető, hogy a link elavult).')
  }

  const label = status === 'closed' ? 'Lezárva' : 'Folyamatban'
  return page(`<h2>Kész</h2><p>A hibajegy státusza mostantól: <strong>${label}</strong>.</p>`)
})