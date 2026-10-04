// ============================================================
// PLAY CALL — the Tecmo-style play screen (BK 2026-10-03 16:06: "Play Call (with a coach w/ a
// headset)---make sure our art is good"). Four cards, each with a pixel diagram of the play;
// tap a card or press 1–4. The coach is original pixel art in your school's colours.
// ============================================================
import { useEffect, useRef } from 'react'
import { OUTC, lum, outline, shade } from '../game/pixel.js'
import { PLAYS, PLAY_WORDS } from '../game/plays.js'

// The coach on the sideline: cap and polo in the team colours, a headset with a boom mic.
function drawCoach(cv, kit) {
  const S = 3, W = 40, H = 40
  cv.width = W * S; cv.height = H * S
  const g = cv.getContext('2d')
  const r = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x * S, y * S, w * S, h * S) }
  const C1 = kit.jersey, C2 = kit.helmet
  const dark = lum(C1) < 0.2
  const C1d = shade(C1, dark ? 0.15 : -0.3), C1l = shade(C1, dark ? 0.4 : 0.25)
  const capC = Math.abs(lum(C1) - lum(C2)) > 0.2 ? C2 : C1
  const capD = shade(capC, lum(capC) < 0.2 ? 0.15 : -0.3), capL = shade(capC, lum(capC) < 0.2 ? 0.45 : 0.3)
  const SK = '#c98e62', SKd = '#a8714a', SKl = '#e3b089'
  // polo, collar, shoulders
  r(6, 30, 28, 10, C1); r(6, 30, 8, 10, C1d); r(24, 31, 6, 9, C1l)
  r(15, 29, 10, 3, dark ? '#f2f2f2' : shade(C1, -0.45)); r(18, 30, 4, 5, SK); r(19, 31, 2, 4, SKd)
  r(28, 34, 3, 3, capC)                                                       // a crest on the chest
  // neck, head
  r(16, 25, 8, 6, SKd)
  r(12, 12, 16, 15, SK); r(12, 12, 4, 15, SKd); r(24, 15, 3, 9, SKl)
  r(13, 26, 14, 2, SKd)
  // face: brows, eyes, nose, a set mouth
  r(17, 17, 4, 1, '#3a2414'); r(23, 17, 3, 1, '#3a2414')
  r(18, 18, 2, 2, '#141418'); r(24, 18, 2, 2, '#141418'); r(19, 18, 1, 1, '#ffffff'); r(25, 18, 1, 1, '#ffffff')
  r(21, 20, 2, 3, SKd); r(19, 24, 6, 1, '#6b3a22')
  r(11, 18, 2, 4, SKd)                                                         // ear
  // cap: crown, brim, button
  r(11, 7, 18, 6, capC); r(11, 7, 5, 6, capD); r(20, 8, 6, 2, capL); r(19, 6, 3, 1, capC)
  r(14, 12, 18, 2, capD); r(26, 12, 7, 2, capC); r(27, 12, 5, 1, capL)
  // headset: band over the cap, ear cup, boom mic to the mouth
  r(10, 8, 2, 12, '#1a1a22'); r(11, 5, 16, 2, '#1a1a22'); r(26, 6, 2, 3, '#1a1a22')
  r(8, 15, 5, 8, '#2a2a33'); r(9, 16, 3, 6, '#3d3d48'); r(9, 16, 1, 6, '#5a5a66')
  r(12, 22, 7, 1, '#1a1a22'); r(18, 23, 3, 2, '#1a1a22'); r(19, 23, 1, 1, '#5a5a66')
  outline(cv, OUTC, 2)
}

// A play, drawn as a coach would on the whiteboard: your formation, every path in gold.
function drawPlay(cv, id, kit) {
  const W = 100, H = 60, S = 2
  cv.width = W * S; cv.height = H * S
  const g = cv.getContext('2d')
  const r = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x * S), Math.round(y * S), Math.round(w * S), Math.round(h * S)) }
  for (let x = 0; x < W; x += 10) r(x, 0, 10, H, (x / 10) % 2 ? '#3B8A38' : '#357F33')
  r(40, 0, 1, H, '#9fc8ff')
  const dot = (x, y, c) => { r(x - 2, y - 2, 4, 4, OUTC); r(x - 1.5, y - 1.5, 3, 3, c) }
  const path = pts => {
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i], len = Math.hypot(bx - ax, by - ay)
      for (let t = 0; t < len; t += 2.4) r(ax + (bx - ax) * t / len - 0.5, ay + (by - ay) * t / len - 0.5, 1.2, 1.2, '#F5CB63')
    }
    const [ax, ay] = pts[pts.length - 2], [bx, by] = pts[pts.length - 1]
    const a = Math.atan2(by - ay, bx - ax)
    for (const d of [-0.6, 0.6]) for (let t = 0; t < 4; t += 0.8) r(bx - Math.cos(a + d) * t - 0.6, by - Math.sin(a + d) * t - 0.6, 1.4, 1.4, '#F5CB63')
  }
  const J = kit.jersey, T = Math.abs(lum(kit.jersey) - lum(kit.helmet)) > 0.25 ? kit.helmet : '#f2f2f2'
  const QB = [31, 30], RB = [25, 36], WR1 = [38, 7], WR2 = [38, 53], TE = [37, 20]
  const P = {
    sweep: () => { path([RB, [34, 46], [44, 52], [62, 55]]); path([WR1, [70, 7]]); path([WR2, [70, 53]]); path([TE, [64, 20]]); path([[38, 36], [44, 44]]); path([[38, 30], [46, 40]]) },
    dive: () => { path([RB, [36, 31], [62, 31]]); path([WR1, [70, 7]]); path([WR2, [70, 53]]); path([TE, [64, 20]]) },
    slants: () => { path([WR1, [46, 7], [62, 22]]); path([WR2, [46, 53], [62, 38]]); path([TE, [52, 20], [48, 22]]); path([RB, [31, 40], [36, 42]]) },
    deep: () => { path([WR1, [56, 7], [86, 22]]); path([WR2, [92, 53]]); path([TE, [88, 22]]) },
  }
  P[id]()
  for (const [x, y] of [WR1, WR2, TE, [38, 24], [38, 30], [38, 36], QB, RB]) dot(x, y, J)
  r(QB[0] - 0.5, QB[1] - 0.5, 1, 1, T)
}

function Card({ play, i, kit, onPick }) {
  const cv = useRef(null)
  useEffect(() => { drawPlay(cv.current, play.id, kit) }, [play.id, kit.jersey, kit.helmet])
  return (
    <button type="button" className="pc-card" onClick={() => onPick(play.id)}>
      <span className="pc-num" aria-hidden="true">{i + 1}</span>
      <span className="pc-name">{play.name}</span>
      <canvas ref={cv} className="pc-diagram" aria-hidden="true" />
      <span className="pc-line">{play.line}</span>
    </button>
  )
}

export default function PlayCall({ kit, onPick, situation }) {
  const coach = useRef(null)
  useEffect(() => { drawCoach(coach.current, kit) }, [kit.jersey, kit.helmet])
  useEffect(() => {
    const k = e => { if (/^[1-4]$/.test(e.key)) { e.preventDefault(); onPick(PLAYS[Number(e.key) - 1].id) } }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onPick])
  return (
    <div className="pc-over" role="dialog" aria-modal="false" aria-labelledby="pc-title">
      <div className="pc-panel">
        <div className="pc-head">
          <canvas ref={coach} className="pc-coach" aria-hidden="true" />
          <h2 className="pc-title" id="pc-title">{PLAY_WORDS.head}</h2>
          {situation && <p className="pc-sit">{situation}</p>}
        </div>
        <div className="pc-grid">
          {PLAYS.map((p, i) => <Card key={p.id} play={p} i={i} kit={kit} onPick={onPick} />)}
        </div>
      </div>
    </div>
  )
}
