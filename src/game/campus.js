// ============================================================
// THE CAMPUS — Friday night at a high school field, for Mode 7 (mode7.js).
//
// BK 2026-10-04 17:12: "incorporate the 'High School' to give it more of a campus vibe ... A
// Friday Night lights feel"; 17:13 "Yes." to the list: aluminum home bleachers with the press
// box, the student section and the band; smaller visitors' bleachers; the track; a chain-link
// fence; four light poles with haze and moths; a brick school with lit windows and a flagpole
// behind one end zone; the scoreboard behind the other; a parking lot with headlights.
// The scoreboard's words are BK's (17:13): HOME · GUEST · QTR · DOWN · TO GO.
//
// Generic buildings only: no real school's building, logo or marks. Colours come from the two
// teams. World units are yards: x 0–100 is the field of play goal line to goal line, the end
// zones run -10–0 and 100–110; y 0–53.33 runs across the field.
// ============================================================
import { lum, rng, shade, SKIN } from './pixel.js'
import { texture } from './mode7.js'

export const PY = 6, OX = 90, OY = 40
const FW = 53.33

const F5 = {
  A: ' ### |#   #|#   #|#####|#   #|#   #|#   #', D: '#### |#   #|#   #|#   #|#   #|#   #|#### ', E: '#####|#    |#    |#### |#    |#    |#####',
  G: ' ####|#    |#    |#  ##|#   #|#   #| ####', H: '#   #|#   #|#   #|#####|#   #|#   #|#   #', M: '#   #|## ##|# # #|# # #|#   #|#   #|#   #',
  N: '#   #|##  #|# # #|#  ##|#   #|#   #|#   #', O: ' ### |#   #|#   #|#   #|#   #|#   #| ### ', Q: ' ### |#   #|#   #|#   #|# # #|#  # | ## #',
  R: '#### |#   #|#   #|#### |# #  |#  # |#   #', S: ' ####|#    |#    | ### |    #|    #|#### ', T: '#####|  #  |  #  |  #  |  #  |  #  |  #  ',
  U: '#   #|#   #|#   #|#   #|#   #|#   #| ### ', W: '#   #|#   #|#   #|# # #|# # #|## ##|#   #',
  0: ' ### |#   #|#  ##|# # #|##  #|#   #| ### ', 1: '  #  | ##  |  #  |  #  |  #  |  #  | ### ', 2: ' ### |#   #|    #|   # |  #  | #   |#####',
  3: '#### |    #|    #| ### |    #|    #|#### ', 4: '#   #|#   #|#   #|#####|    #|    #|    #', 5: '#####|#    |#### |    #|    #|#   #| ### ',
  ' ': '     |     |     |     |     |     |     ',
}
const txt = (c, s, x, y, col, k = 1) => {
  c.fillStyle = col
  ;[...String(s)].forEach((ch, i) => (F5[ch] || F5[' ']).split('|').forEach((row, r) => [...row].forEach((b, q) => { if (b === '#') c.fillRect(x + (i * 6 + q) * k, y + r * k, k, k) })))
}
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return [c, c.getContext('2d')] }

// The colour a student section wears: the team's brighter colour, never plain white.
export function cheerColor(team) {
  const [c0, c1] = team.colors
  return lum(c1) > 0.9 ? c0 : c1
}
const rgbOf = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))

function bleachers(wYd, hYd, team, r, { student = false, band = false } = {}) {
  const [c, x] = mk(wYd * PY, hYd * PY), w = c.width, h = c.height
  const colors = team.colors, cheer = cheerColor(team)
  x.fillStyle = '#20232a'; x.fillRect(0, 0, w, h)
  const rows = Math.floor((h - 4) / 4)
  for (let row = 0; row < rows; row++) {
    const y = 2 + row * 4
    x.fillStyle = '#8e97a2'; x.fillRect(0, y + 3, w, 1)
    for (let i = 1; i < w - 1; i += 2) {
      const f = i / w
      const inStudent = student && f > 0.38 && f < 0.62
      const inBand = band && f > 0.82 && f < 0.97
      if (r() < (inStudent || inBand ? 0.04 : 0.32)) continue
      let shirt = r() < 0.7 ? colors[Math.floor(r() * colors.length)] : ['#d0d4dc', '#6b7280', '#2f3b55', '#8b5a2b'][Math.floor(r() * 4)]
      if (inStudent) shirt = r() < 0.75 ? cheer : colors[0]
      if (inBand) shirt = colors[0]
      x.fillStyle = shirt; x.fillRect(i, y + 1, 2, 2)
      x.fillStyle = inBand && row % 2 === 0 ? '#f0c14b' : SKIN[Math.floor(r() * SKIN.length)]
      x.fillRect(i, y, 2, 1)
      if (inBand && r() < 0.3) { x.fillStyle = '#f7f3d0'; x.fillRect(i, y - 1, 1, 1) }
    }
  }
  x.fillStyle = '#5b636e'; x.fillRect(0, h - 3, w, 3)
  x.fillStyle = '#b8c0c9'; x.fillRect(0, 0, w, 1); for (let i = 0; i < w; i += 12) x.fillRect(i, 0, 1, 3)
  return c
}
function pressBox() {
  const [c, x] = mk(20 * PY, 4 * PY), w = c.width, h = c.height
  x.fillStyle = '#3c414c'; x.fillRect(0, 0, w, h)
  x.fillStyle = '#2a2e36'; x.fillRect(0, 0, w, 3)
  x.fillStyle = '#f2e6a6'; x.fillRect(4, 7, w - 8, 9)
  for (let i = 6; i < w - 8; i += 9) { x.fillStyle = '#1a1c22'; x.fillRect(i, 9, 3, 7); x.fillRect(i, 8, 3, 2) }
  x.fillStyle = '#9aa3ad'; x.fillRect(0, h - 4, w, 1)
  return c
}
function school(r) {
  const [c, x] = mk(78 * PY, 15 * PY), w = c.width, h = c.height
  const brick = (x0, y0, ww, hh) => { x.fillStyle = '#6e3326'; x.fillRect(x0, y0, ww, hh); for (let y = y0; y < y0 + hh; y += 3) { x.fillStyle = '#5a2a20'; x.fillRect(x0, y, ww, 1); for (let i = x0 + ((y / 3) % 2) * 3; i < x0 + ww; i += 6) x.fillRect(i, y, 1, 3) } }
  brick(0, 6, 150, h - 6); brick(150, 26, w - 150, h - 26)
  x.fillStyle = '#9a8f80'; x.fillRect(0, 6, 150, 2); x.fillRect(150, 26, w - 150, 2)
  for (const y0 of [34, 56]) for (let i = 162; i < w - 10; i += 14) {
    x.fillStyle = r() < 0.45 ? '#f4d98a' : '#1a2233'; x.fillRect(i, y0, 9, 10)
    x.fillStyle = '#c9c2b5'; x.fillRect(i, y0 + 4, 9, 1); x.fillRect(i + 4, y0, 1, 10)
  }
  for (let i = 12; i < 140; i += 18) { x.fillStyle = r() < 0.3 ? '#f4d98a' : '#1a2233'; x.fillRect(i, 18, 12, 30) }
  x.fillStyle = '#9a8f80'; x.fillRect(272, 50, 44, 4)
  x.fillStyle = '#f7e7a8'; x.fillRect(278, 56, 32, h - 56)
  x.fillStyle = '#3a3a3a'; x.fillRect(293, 56, 2, h - 56)
  x.fillStyle = '#c9ccd4'; x.fillRect(340, 0, 1, h)
  x.fillStyle = '#b22234'; x.fillRect(341, 2, 14, 9); x.fillStyle = '#ffffff'; x.fillRect(341, 4, 14, 1); x.fillRect(341, 7, 14, 1); x.fillStyle = '#3c3b6e'; x.fillRect(341, 2, 6, 5)
  return c
}
// BK's words, 17:13: HOME · GUEST · QTR · DOWN · TO GO.
export function scoreboardCanvas(home, { you = 0, them = 0, qtr = 1, down = 1, togo = 10 } = {}) {
  const [c, x] = mk(20 * PY, 6 * PY), w = c.width, h = c.height
  const trim = cheerColor(home)
  x.fillStyle = '#0c0d10'; x.fillRect(0, 0, w, h)
  x.fillStyle = trim; x.fillRect(0, 0, w, 2); x.fillRect(0, h - 2, w, 2); x.fillRect(0, 0, 2, h); x.fillRect(w - 2, 0, 2, h)
  txt(x, 'HOME', 8, 4, '#f4f6fa'); txt(x, 'GUEST', w - 37, 4, '#f4f6fa')
  txt(x, String(you).padStart(2, '0').slice(-2), 8, 13, '#ff3b2f', 2); txt(x, String(them).padStart(2, '0').slice(-2), w - 32, 13, '#ff3b2f', 2)
  txt(x, 'QTR', 51, 4, '#f4f6fa'); txt(x, String(qtr), 57, 14, '#ffb000')
  txt(x, 'DOWN', 8, 30, '#f4f6fa'); txt(x, String(down), 36, 30, '#ffb000'); txt(x, 'TO GO', 58, 30, '#f4f6fa'); txt(x, String(togo).slice(0, 2), 94, 30, '#ffb000')
  return c
}
function solid(wYd, hYd, col, hi) { const [c, x] = mk(Math.max(2, wYd * PY), hYd * PY); x.fillStyle = col; x.fillRect(0, 0, c.width, c.height); if (hi) { x.fillStyle = hi; x.fillRect(0, 0, 1, c.height) } return c }
function bank() {
  const [c, x] = mk(5 * PY, 3 * PY)
  x.fillStyle = '#2a2e36'; x.fillRect(0, 0, c.width, c.height)
  for (let r = 0; r < 3; r++) for (let i = 0; i < 5; i++) { x.fillStyle = '#fffbe0'; x.fillRect(2 + i * 6, 2 + r * 6, 4, 4); x.fillStyle = '#ffffff'; x.fillRect(3 + i * 6, 3 + r * 6, 2, 2) }
  return c
}
function fence(lenYd) {
  const [c, x] = mk(lenYd * PY, 2.2 * PY)
  x.fillStyle = 'rgba(190,198,208,1)'
  for (let y = 1; y < c.height; y++) for (let i = (y % 2); i < c.width; i += 2) if ((i + y) % 4 === 0) x.fillRect(i, y, 1, 1)
  x.fillStyle = '#c9d1d9'; x.fillRect(0, 0, c.width, 1)
  for (let i = 0; i < c.width; i += 18) { x.fillStyle = '#8e97a2'; x.fillRect(i, 0, 1, c.height) }
  return c
}

// The floor: field, track, walks, the parking lot. ezNear / ezFar: the end zones' colours.
function floorCanvas(home, away, ezNear, ezFar, r) {
  const TW = 260 * PY, TH = 135 * PY
  const [tex, t] = mk(TW, TH)
  const X = x => Math.round((x + OX) * PY), Y = y => Math.round((y + OY) * PY)
  const R = (x0, y0, x1, y1, c) => { t.fillStyle = c; t.fillRect(X(x0), Y(y0), X(x1) - X(x0), Y(y1) - Y(y0)) }
  t.fillStyle = '#1d3f1c'; t.fillRect(0, 0, TW, TH)
  for (let y = 0; y < TH; y += 2) for (let x = (y / 2) % 2; x < TW; x += 3) if (r() < 0.25) { t.fillStyle = '#244a22'; t.fillRect(x, y, 1, 1) }
  // the parking lot behind the near end zone; a few cars with their headlights on
  R(-90, -30, -42, 88, '#26282e')
  for (let y = -28; y < 86; y += 3.2) { R(-88, y, -76, y + 0.25, '#5d6068'); R(-64, y, -52, y + 0.25, '#5d6068') }
  R(-76, -30, -64, 88, '#2c2e35')
  for (const col of [-87.5, -63.5]) for (let y = -27.5; y < 85; y += 3.2) {
    if (r() < 0.3) continue
    const body = ['#8a1d1d', '#1d3a6b', '#c9ccd4', '#2b2b2b', '#5a6a3a', '#d8d2bf', '#3a2a4a'][Math.floor(r() * 7)]
    R(col, y + 0.4, col + 5, y + 2.6, '#0d0e12'); R(col + 0.2, y + 0.5, col + 4.8, y + 2.5, body)
    R(col + 3.2, y + 0.7, col + 4.2, y + 2.3, '#9fc3d9'); R(col + 0.6, y + 0.7, col + 1.3, y + 2.3, '#6d8aa0')
    if (r() < 0.35) {
      t.fillStyle = 'rgba(255,244,190,.16)'; t.beginPath(); t.moveTo(X(col + 5), Y(y + 0.6)); t.lineTo(X(col + 14), Y(y - 1.5)); t.lineTo(X(col + 14), Y(y + 4.5)); t.lineTo(X(col + 5), Y(y + 2.4)); t.fill()
      R(col + 4.8, y + 0.6, col + 5.1, y + 1.0, '#fff6c8'); R(col + 4.8, y + 2.0, col + 5.1, y + 2.4, '#fff6c8')
    }
  }
  R(-30, -24, 140, -14.5, '#4a4c52'); R(-30, 67.8, 140, 75, '#4a4c52')
  // the track
  const rr = (x0, y0, x1, y1, rad, c, stroke) => {
    t.beginPath()
    if (t.roundRect) t.roundRect(X(x0), Y(y0), X(x1) - X(x0), Y(y1) - Y(y0), rad * PY); else t.rect(X(x0), Y(y0), X(x1) - X(x0), Y(y1) - Y(y0))
    if (stroke) { t.strokeStyle = c; t.lineWidth = 1; t.stroke() } else { t.fillStyle = c; t.fill() }
  }
  rr(-24, -12.5, 134, 65.8, 26, '#8f3a2b')
  for (let i = 1; i < 6; i++) rr(-24 + i * 1.6, -12.5 + i * 1.6, 134 - i * 1.6, 65.8 - i * 1.6, 26 - i * 1.6, 'rgba(255,255,255,.55)', true)
  rr(-14, -3, 124, 56.3, 17, '#245a22')
  // the field of play
  for (let yd = 0; yd < 100; yd += 5) R(yd, 0, yd + 5, FW, (yd / 5) % 2 ? '#3B8A38' : '#357F33')
  R(-10, 0, 0, FW, ezNear); R(100, 0, 110, FW, ezFar)
  R(-10, 0, 110, 0.3, '#fff'); R(-10, FW - 0.3, 110, FW, '#fff'); R(-10, 0, -9.7, FW, '#fff'); R(109.7, 0, 110, FW, '#fff')
  for (let yd = 0; yd <= 100; yd += 5) R(yd - 0.15, 0, yd + 0.15, FW, '#fff')
  for (let yd = 1; yd < 100; yd++) if (yd % 5) { R(yd - 0.08, 0.4, yd + 0.08, 1.2, '#fff'); R(yd - 0.08, 52.1, yd + 0.08, 52.9, '#fff'); R(yd - 0.08, 22.2, yd + 0.08, 22.9, '#fff'); R(yd - 0.08, 30.4, yd + 0.08, 31.1, '#fff') }
  for (let yd = 10; yd <= 90; yd += 10) {
    const n = String(yd <= 50 ? yd : 100 - yd)
    txt(t, n, X(yd) - 16, Y(7), 'rgba(255,255,255,.85)', 3)
    t.save(); t.translate(X(yd) + 16, Y(46.3)); t.rotate(Math.PI); txt(t, n, 0, 0, 'rgba(255,255,255,.85)', 3); t.restore()
  }
  return tex
}

function skyCanvas(W, r) {
  const [sky, s] = mk(W * 4, 90)
  ;['#03050b', '#060a16', '#0a1122', '#0e182f', '#13203d'].forEach((c, i) => { s.fillStyle = c; s.fillRect(0, i * 18, sky.width, 18) })
  for (let i = 0; i < 260; i++) { s.fillStyle = r() < 0.2 ? '#ffffff' : '#9fb0d0'; s.fillRect(Math.floor(r() * sky.width), Math.floor(r() * 60), 1, 1) }
  s.fillStyle = '#e9e6d4'; s.beginPath(); s.arc(1300 % sky.width, 18, 6, 0, 7); s.fill(); s.fillStyle = '#060a16'; s.beginPath(); s.arc(1303 % sky.width, 16, 6, 0, 7); s.fill()
  for (let x = 0; x < sky.width; x += 2) { const hh = 6 + Math.round(Math.abs(Math.sin(x / 13) * 5 + Math.sin(x / 37) * 4) + r() * 2); s.fillStyle = '#07120c'; s.fillRect(x, 90 - hh, 2, hh) }
  for (let i = 0; i < 40; i++) { s.fillStyle = 'rgba(244,217,138,.7)'; s.fillRect(Math.floor(r() * sky.width), 86 + Math.floor(r() * 3), 1, 1) }
  return sky
}

export const POLES = [[12, -16.5], [88, -16.5], [88, 69.8], [12, 69.8]]

// home, away: league teams. ez: { near, far } end-zone colours (default: home near, away far).
const cache = new Map()
export function campusScene(home, away, ez = {}, W = 480) {
  const near = ez.near || home.kit?.zone || home.kit?.jersey || home.colors[0]
  const far = ez.far || away.kit?.zone || away.kit?.jersey || away.colors[0]
  const key = `${home.id}|${away.id}|${near}|${far}|${W}`
  if (cache.has(key)) return cache.get(key)
  const r = rng(home.name.length * 131 + away.name.length * 17 + 7)
  const walls = []
  const wall = (x0, y0, x1, y1, z0, z1, cv) => walls.push({ x0, y0, x1, y1, z0, z1, tex: texture(cv) })
  wall(20, -19, 80, -19, 0, 6.5, bleachers(60, 6.5, home, r, { student: true, band: true }))
  wall(40, -20, 60, -20, 6.5, 10.5, pressBox())
  wall(75, 72, 25, 72, 0, 3.5, bleachers(50, 3.5, away, r))
  wall(146, -12, 146, 66, 0, 15, school(r))
  wall(-36, 36.6, -36, 16.6, 5, 11, scoreboardCanvas(home))
  wall(-36.1, 33.6, -36.1, 33, 0, 5, solid(0.6, 5, '#7b828c', '#b8c0c9')); wall(-36.1, 20.2, -36.1, 19.6, 0, 5, solid(0.6, 5, '#7b828c', '#b8c0c9'))
  for (const [a, b, c2, d] of [[-30, -15, 140, -15], [140, 68.3, -30, 68.3], [-30, 68.3, -30, -15], [140, -15, 140, 68.3]])
    wall(a, b, c2, d, 0, 2.2, fence(Math.hypot(c2 - a, d - b)))
  const glows = []
  for (const [px, py] of POLES) {
    wall(px - 0.4, py, px + 0.4, py, 0, 23, solid(0.8, 23, '#7b828c', '#c9d1d9'))
    wall(px - 2.5, py, px + 2.5, py, 23, 26, bank())
    glows.push({ x: px, y: py, z: 24.5, r: 4.5, toward: [px + (px < 50 ? 18 : -18), py + (py < 20 ? 24 : -24)] })
  }
  const scene = {
    PY, OX, OY, band: 300, out: [22, 40, 22],
    floor: texture(floorCanvas(home, away, near, far, r)),
    sky: texture(skyCanvas(W, r)),
    walls, glows,
  }
  cache.set(key, scene)
  if (cache.size > 6) cache.delete(cache.keys().next().value)
  return scene
}

// The kickoff flyover (Mode 7 "A"): high over the parking lot, past the scoreboard and the fence,
// down onto the field at your 25 under the lights. k runs 0 → 1.
// Slow over the parking lot, quick past the fence, settling onto the field.
const ease = k => k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2
export function flyoverCam(k) {
  const e = ease(Math.max(0, Math.min(1, k)))
  return { x: -86 + e * 99, y: 26.66 + Math.sin(e * Math.PI) * 4, a: 0.32 * (1 - e) - 0.06 * Math.sin(e * Math.PI), h: 26 - e * 20.5, hz: 72, f: 230 }
}

export { rgbOf }
