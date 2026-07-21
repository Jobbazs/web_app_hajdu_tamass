import { useMemo, useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { useAppointments, useAllSlots, useClientReliability } from '../../hooks'
import { usePortfolio, useCategories } from '../../hooks'

const STATUS = {
  pending_confirmation: { label: 'Megerősítésre vár', color: '#C4612A' },
  confirmed:            { label: 'Megerősítve',       color: '#3B82C4' },
  approved:             { label: 'Jóváhagyva',        color: '#4A9B6E' },
  completed:            { label: 'Teljesült',         color: '#5B9AA0' },
  cancelled:            { label: 'Lemondva',          color: '#8a7a68' },
  no_show:              { label: 'Nem jelent meg',    color: '#C0392B' },
}
const RELIABILITY = [
  { label: 'Tiszta',            color: '#4A9B6E' },
  { label: 'Meg nem erősített', color: '#C4612A' },
  { label: 'Késői lemondás',    color: '#D4845A' },
  { label: 'No-show',           color: '#C0392B' },
  { label: 'Blokkolt',          color: '#6b2020' },
]

const todayStr = () => new Date().toISOString().slice(0, 10)

function StatCard({ label, value, sub }) {
  return (
    <div className="dash-stat">
      <div className="dash-stat-val">{value}</div>
      <div className="dash-stat-label">{label}</div>
      {sub && <div className="dash-stat-sub">{sub}</div>}
    </div>
  )
}

function BarRow({ label, value, max, color, suffix }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="dash-bar-row">
      <span className="dash-bar-label" title={label}>{label}</span>
      <div className="dash-bar-track">
        <div className="dash-bar-fill" style={{ width: `${pct}%`, background: color || 'var(--accent, #C4612A)' }} />
      </div>
      <span className="dash-bar-val">{value}{suffix || ''}</span>
    </div>
  )
}

export default function AdminDashboard() {
  const { appointments, loading: aLoading } = useAppointments('all')
  const { slots, loading: sLoading } = useAllSlots()
  const { clients } = useClientReliability()
  const { items } = usePortfolio()
  const { categories } = useCategories()

  const [waitlistWaiting, setWaitlistWaiting] = useState(null)
  useEffect(() => {
    supabase
      .from('appointment_waitlist')
      .select('id', { count: 'exact', head: true })
      .is('response', null)
      .then(({ count }) => setWaitlistWaiting(count ?? 0))
  }, [])

  const today = todayStr()

  const stats = useMemo(() => {
    // Státusz szerinti bontás
    const byStatus = {}
    appointments.forEach((a) => { byStatus[a.status] = (byStatus[a.status] || 0) + 1 })

    // Közelgő aktív foglalások (megerősített/jóváhagyott, jövőbeli slot)
    const upcomingActive = appointments.filter(
      (a) => ['confirmed', 'approved'].includes(a.status) && (a.appointment_slots?.slot_date || '') >= today
    ).length

    // Slot kitöltöttség (jövőbeli látható slotok)
    const futureSlots = slots.filter((s) => s.visible && s.slot_date >= today)
    const cap = futureSlots.reduce((s, x) => s + (x.capacity || 0), 0)
    const booked = futureSlots.reduce((s, x) => s + (x.booked_count || 0), 0)
    const fillPct = cap > 0 ? Math.round((booked / cap) * 100) : 0

    // No-show arány
    const done = byStatus.completed || 0
    const ns = byStatus.no_show || 0
    const nsRate = (done + ns) > 0 ? Math.round((ns / (done + ns)) * 100) : 0

    // Havi bontás (utolsó 6 hónap, created_at szerint)
    const now = new Date()
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleDateString('hu-HU', { year: '2-digit', month: 'short' }),
        count: 0,
      })
    }
    const mIdx = Object.fromEntries(months.map((m, i) => [m.key, i]))
    appointments.forEach((a) => {
      const k = (a.created_at || '').slice(0, 7)
      if (k in mIdx) months[mIdx[k]].count++
    })

    // Kategóriánkénti képszám
    const catCounts = categories.map((c) => ({
      label: c.label_hu,
      count: items.filter((i) => (i.portfolio_categories?.slug || i.category) === c.slug).length,
    }))

    // Megbízhatóság szintek
    const relCounts = [0, 1, 2, 3, 4].map((lvl) => ({
      ...RELIABILITY[lvl],
      count: clients.filter((c) => c.reliability_level === lvl).length,
    }))

    // Közelgő időpontok kitöltöttsége
    const upcomingSlots = futureSlots
      .slice()
      .sort((a, b) => (a.slot_date + a.start_time).localeCompare(b.slot_date + b.start_time))
      .slice(0, 6)

    return {
      total: appointments.length, byStatus, upcomingActive, fillPct, booked, cap,
      nsRate, months, catCounts, relCounts, upcomingSlots,
    }
  }, [appointments, slots, clients, items, categories, today])

  const loading = aLoading || sLoading
  if (loading) return <div className="acms-loading">Betöltés…</div>

  const maxMonth = Math.max(1, ...stats.months.map((m) => m.count))
  const maxCat = Math.max(1, ...stats.catCounts.map((c) => c.count))
  const maxStatus = Math.max(1, ...Object.values(stats.byStatus))
  const maxRel = Math.max(1, ...stats.relCounts.map((r) => r.count))

  return (
    <div className="dash">
      <h2 className="acms-h2">Áttekintés</h2>

      {/* Stat kártyák */}
      <div className="dash-stats">
        <StatCard label="Összes foglalás" value={stats.total} />
        <StatCard label="Közelgő aktív" value={stats.upcomingActive} sub="megerősített/jóváhagyott" />
        <StatCard label="Slot kitöltöttség" value={`${stats.fillPct}%`} sub={`${stats.booked}/${stats.cap} hely`} />
        <StatCard label="No-show arány" value={`${stats.nsRate}%`} sub="teljesült foglalásokból" />
        <StatCard label="Várólistán" value={waitlistWaiting ?? '…'} sub="válaszra vár" />
        <StatCard label="Portfólió képek" value={items.length} />
      </div>

      <div className="dash-grid">
        {/* Foglalások időben */}
        <div className="dash-card">
          <div className="dash-card-title">Foglalások (utolsó 6 hónap)</div>
          {stats.months.map((m) => (
            <BarRow key={m.key} label={m.label} value={m.count} max={maxMonth} />
          ))}
        </div>

        {/* Státusz szerint */}
        <div className="dash-card">
          <div className="dash-card-title">Foglalások státusz szerint</div>
          {Object.entries(STATUS).map(([key, meta]) => (
            <BarRow key={key} label={meta.label} value={stats.byStatus[key] || 0} max={maxStatus} color={meta.color} />
          ))}
        </div>

        {/* Kategóriánkénti képszám */}
        <div className="dash-card">
          <div className="dash-card-title">Képek kategóriánként</div>
          {stats.catCounts.map((c) => (
            <BarRow key={c.label} label={c.label} value={c.count} max={maxCat} />
          ))}
        </div>

        {/* Megbízhatóság */}
        <div className="dash-card">
          <div className="dash-card-title">Kliens-megbízhatóság</div>
          {stats.relCounts.map((r) => (
            <BarRow key={r.label} label={r.label} value={r.count} max={maxRel} color={r.color} />
          ))}
        </div>

        {/* Közelgő időpontok kitöltöttsége */}
        <div className="dash-card dash-card--wide">
          <div className="dash-card-title">Közelgő időpontok kitöltöttsége</div>
          {stats.upcomingSlots.length === 0 ? (
            <div className="dash-empty">Nincs közelgő időpont.</div>
          ) : (
            stats.upcomingSlots.map((s) => (
              <BarRow
                key={s.id}
                label={`${s.slot_date} · ${(s.start_time || '').slice(0, 5)} · ${s.title}`}
                value={s.booked_count || 0}
                max={s.capacity || 1}
                suffix={`/${s.capacity}`}
                color={s.booked_count >= s.capacity ? '#C0392B' : '#4A9B6E'}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
