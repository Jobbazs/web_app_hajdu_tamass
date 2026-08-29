// Újrahasznált SVG kördiagram. slices: [{ label, value, color }].
// A cikkeken KÍVÜL felirat: darabszám vagy százalék az aktív nézet szerint.
export const PIE_COLORS = [
  '#B5231E', '#E0A800', '#2E7D32', '#1565C0', '#6A1B9A',
  '#00838F', '#EF6C00', '#5D4037', '#546E7A', '#C2185B',
]

export default function PollPie({ slices, view = 'percent', size = 220 }) {
  const data = (slices || []).map(s => ({ ...s, value: Math.max(0, s.value || 0) }))
  const total = data.reduce((s, x) => s + x.value, 0)
  if (total <= 0) return <div className="poll-pie-empty">Nincs szavazat</div>

  const r = size / 2
  const cx = r, cy = r
  let angle = -Math.PI / 2
  const arcs = []
  data.forEach((sl) => {
    if (sl.value <= 0) return
    const frac = sl.value / total
    const a0 = angle
    const a1 = angle + frac * Math.PI * 2
    angle = a1
    const large = (a1 - a0) > Math.PI ? 1 : 0
    const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0)
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1)
    // teljes kör esetén (1 szelet) rajzoljunk kört, ne 0 hosszú ívet
    const d = frac >= 0.999
      ? `M ${cx} ${(cy - r).toFixed(2)} A ${r} ${r} 0 1 1 ${cx} ${(cy + r).toFixed(2)} A ${r} ${r} 0 1 1 ${cx} ${(cy - r).toFixed(2)} Z`
      : `M ${cx} ${cy} L ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`
    const mid = (a0 + a1) / 2
    const lr = r + 15
    const lx = cx + lr * Math.cos(mid)
    const ly = cy + lr * Math.sin(mid)
    const labelTxt = view === 'percent' ? `${Math.round(frac * 100)}%` : String(sl.value)
    arcs.push({ d, color: sl.color, lx, ly, labelTxt, anchor: Math.cos(mid) >= 0 ? 'start' : 'end' })
  })

  const pad = 46
  const vb = `${-pad} ${-pad} ${size + pad * 2} ${size + pad * 2}`
  return (
    <svg className="poll-pie" viewBox={vb} width={size + pad} height={size + pad} role="img">
      {arcs.map((a, i) => (
        <path key={i} d={a.d} fill={a.color} stroke="var(--pie-stroke, #1a1510)" strokeWidth="1.5" />
      ))}
      {arcs.map((a, i) => (
        <text key={'t' + i} x={a.lx.toFixed(1)} y={a.ly.toFixed(1)} fontSize="12.5"
          fill="currentColor" textAnchor={a.anchor} dominantBaseline="middle">{a.labelTxt}</text>
      ))}
    </svg>
  )
}