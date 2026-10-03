// ============================================================
// THE LED SCOREBOARD — one board for every sport (the 16-bit reskin, BK 2026-10-03).
//
// Drawn in the same 5×7 pixel font as the court and the cut-ins: amber school codes, red score
// digits with the unlit "88" ghost behind them, the clock and the situation in the middle.
// Screen readers get the same facts as text (visually hidden), announced politely.
// ============================================================
import { useEffect, useRef, useState } from 'react'
import { tw, txt } from '../game/pixel.js'

// left / right: { abbr, score, color }. mid1 / mid2: the two centre lines. label: the spoken version.
export default function LedBoard({ left, right, mid1, mid2, label }) {
  const wrap = useRef(null)
  const cv = useRef(null)
  const [w, setW] = useState(0)
  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  useEffect(() => {
    const c = cv.current
    if (!c || !w) return
    const px = w >= 480 ? 2 : 1.5                       // a board pixel is 2 screen pixels (1.5 on a phone)
    const W = Math.floor(w / px)
    const sideW = 6 + Math.max(tw(left.abbr), tw(right.abbr)) + 5 + tw('88', 2) + 6
    const longest = Math.max(tw(String(mid1 || '')), tw(String(mid2 || '')))
    const stacked = W - 2 * sideW < longest              // too narrow (a phone held sideways): the middle drops below
    const H = stacked ? 40 : 22
    c.width = W; c.height = H
    const g = c.getContext('2d')
    g.imageSmoothingEnabled = false
    g.fillStyle = '#07080b'; g.fillRect(0, 0, W, H)
    g.fillStyle = '#1a1d24'; g.fillRect(0, 0, W, 1); g.fillRect(0, H - 1, W, 1)
    const side = (t, right) => {
      const s = String(t.score).padStart(2, '0')
      const sw = tw(s, 2), aw = tw(t.abbr)
      const x0 = right ? W - 4 : 4
      // team colour bar, then the code, then the score
      g.fillStyle = t.color; g.fillRect(right ? W - 3 : 1, 3, 2, 16)
      const ax = right ? x0 - 2 - aw : x0 + 2
      txt(g, t.abbr, ax, 8, '#ffb02e')
      const sx = right ? ax - 5 - sw : ax + aw + 5
      g.globalAlpha = 0.13; txt(g, '88', sx, 4, '#ff5a3c', 2); g.globalAlpha = 1
      txt(g, s, sx, 4, '#ff5a3c', 2)
    }
    side(left, false); side(right, true)
    const fit = (s, room) => { s = String(s || '').toUpperCase(); while (s.length && tw(s) > room) s = s.slice(0, -1); return s }
    const room = stacked ? W - 8 : W - 2 * sideW
    const m1 = fit(mid1, room), m2 = fit(mid2, room)
    const y1 = stacked ? 22 : 3, y2 = stacked ? 31 : 12
    if (stacked) { g.fillStyle = '#1a1d24'; g.fillRect(4, 20, W - 8, 1) }
    txt(g, m1, Math.round(W / 2 - tw(m1) / 2), y1, '#9fd1ff')
    txt(g, m2, Math.round(W / 2 - tw(m2) / 2), y2, '#f4f1e4')
  }, [w, left.abbr, left.score, left.color, right.abbr, right.score, right.color, mid1, mid2])

  return (
    <div className="scoreboard led" ref={wrap}>
      <canvas ref={cv} className="led-board" aria-hidden="true" />
      <span className="sr-only" aria-live="polite">{label}</span>
    </div>
  )
}
