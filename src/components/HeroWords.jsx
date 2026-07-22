import { useRef, useState, useLayoutEffect } from 'react'

const rand = (a, b) => a + Math.random() * (b - a)

function overlaps(a, b, pad = 0) {
  return (
    a.x < b.x + b.w + pad &&
    a.x + a.w + pad > b.x &&
    a.y < b.y + b.h + pad &&
    a.y + a.h + pad > b.y
  )
}

// Zóna + jitter + elutasításos mintavétel: a szavak a negatív térbe kerülnek,
// a szövegblokkot (keep-out), a széleket és egymást elkerülve.
function computePositions(W, H, keep, words) {
  const EDGE = 20
  const GAP = 22
  const placed = []
  for (const word of words) {
    const fs = Math.round(rand(13, 26))
    const wW = word.length * fs * 0.58
    const wH = fs * 1.25
    if (wW + 2 * EDGE > W || wH + 2 * EDGE > H) continue
    let spot = null
    for (let t = 0; t < 45; t++) {
      const x = rand(EDGE, W - wW - EDGE)
      const y = rand(EDGE, H - wH - EDGE)
      const box = { x, y, w: wW, h: wH }
      if (keep && overlaps(box, keep, GAP)) continue
      if (placed.some((p) => overlaps(box, p, GAP))) continue
      spot = box
      break
    }
    if (!spot) continue
    const base = rand(-4, 4)
    placed.push({
      ...spot,
      word,
      fs,
      rot0: (base - rand(3, 6)).toFixed(2),   // szélesebb dőlés a láthatóságért
      rot1: (base + rand(3, 6)).toFixed(2),
      s0: rand(0.72, 0.9).toFixed(3),          // NAGY méret-pulzálás
      s1: rand(1.2, 1.45).toFixed(3),
      durR: rand(0.9, 1.5).toFixed(2),         // dőlés tempó ≤ 1.5s
      durS: rand(1.3, 2.0).toFixed(2),         // méret tempó ≤ 2s
      delayR: (-rand(0, 1.5)).toFixed(2),
      delayS: (-rand(0, 2)).toFixed(2),
    })
  }
  return placed
}

export default function HeroWords({ words, keepOutRef }) {
  const layerRef = useRef(null)
  const [placed, setPlaced] = useState([])

  useLayoutEffect(() => {
    const layer = layerRef.current
    if (!layer || !words || !words.length) {
      setPlaced([])
      return
    }
    const scatter = () => {
      const lr = layer.getBoundingClientRect()
      if (lr.width < 40 || lr.height < 40) return
      let keep = null
      if (keepOutRef?.current) {
        const kr = keepOutRef.current.getBoundingClientRect()
        keep = { x: kr.left - lr.left, y: kr.top - lr.top, w: kr.width, h: kr.height }
      }
      setPlaced(computePositions(lr.width, lr.height, keep, words))
    }
    scatter()
    let tid
    const onResize = () => {
      clearTimeout(tid)
      tid = setTimeout(scatter, 150)
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      clearTimeout(tid)
    }
    // szándékosan csak mountkor + words változásra szóródik újra
  }, [words, keepOutRef])

  return (
    <div className="hero-words" ref={layerRef} aria-hidden="true">
      {placed.map((p, i) => (
        <span
          key={i}
          className="hero-word"
          style={{
            left: `${p.x}px`,
            top: `${p.y}px`,
            fontSize: `${p.fs}px`,
            '--rot0': `${p.rot0}deg`,
            '--rot1': `${p.rot1}deg`,
            '--s0': p.s0,
            '--s1': p.s1,
            '--durR': `${p.durR}s`,
            '--durS': `${p.durS}s`,
            '--delayR': `${p.delayR}s`,
            '--delayS': `${p.delayS}s`,
          }}
        >
          {p.word}
        </span>
      ))}
    </div>
  )
}
