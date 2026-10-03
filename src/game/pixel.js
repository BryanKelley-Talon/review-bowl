// ============================================================
// PIXEL KIT — the Review Bowl's shared 16-bit drawing tools (2026-10-03).
//
// BK, 2026-10-03 01:54: "16-bit across every sport, consistently." Volleyball's court
// (court.js) drew this way first; football's reskin and the shared cut-ins draw with these.
// The 5×7 font, the three-tone shade, the outline pass and the dither are the concept's,
// lifted into one place so every sport reads as the same game.
// ============================================================

export const OUTC = '#170f1c'

export const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))
export const toHex = c => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')
export const lum = h => { const [r, g, b] = rgb(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255 }
// a < 0 darkens toward black, a > 0 lightens toward white
export const shade = (h, a) => toHex(rgb(h).map(v => (a < 0 ? v * (1 + a) : v + (255 - v) * a)))

export function rng(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

// 5×7 pixel font: capitals, digits and the few marks the game prints.
const F = {
  A: ' ### |#   #|#   #|#####|#   #|#   #|#   #', B: '#### |#   #|#   #|#### |#   #|#   #|#### ', C: ' ####|#    |#    |#    |#    |#    | ####',
  D: '#### |#   #|#   #|#   #|#   #|#   #|#### ', E: '#####|#    |#    |#### |#    |#    |#####', F: '#####|#    |#    |#### |#    |#    |#    ',
  G: ' ####|#    |#    |#  ##|#   #|#   #| ####', H: '#   #|#   #|#   #|#####|#   #|#   #|#   #', I: '#####|  #  |  #  |  #  |  #  |  #  |#####',
  J: '  ###|   # |   # |   # |   # |#  # | ##  ', K: '#   #|#  # |# #  |##   |# #  |#  # |#   #', L: '#    |#    |#    |#    |#    |#    |#####',
  M: '#   #|## ##|# # #|# # #|#   #|#   #|#   #', N: '#   #|##  #|# # #|#  ##|#   #|#   #|#   #', O: ' ### |#   #|#   #|#   #|#   #|#   #| ### ',
  P: '#### |#   #|#   #|#### |#    |#    |#    ', Q: ' ### |#   #|#   #|#   #|# # #|#  # | ## #', R: '#### |#   #|#   #|#### |# #  |#  # |#   #',
  S: ' ####|#    |#    | ### |    #|    #|#### ', T: '#####|  #  |  #  |  #  |  #  |  #  |  #  ', U: '#   #|#   #|#   #|#   #|#   #|#   #| ### ',
  V: '#   #|#   #|#   #|#   #|#   #| # # |  #  ', W: '#   #|#   #|#   #|# # #|# # #|## ##|#   #', X: '#   #|#   #| # # |  #  | # # |#   #|#   #',
  Y: '#   #|#   #| # # |  #  |  #  |  #  |  #  ', Z: '#####|    #|   # |  #  | #   |#    |#####',
  0: ' ### |#   #|#  ##|# # #|##  #|#   #| ### ', 1: '  #  | ##  |  #  |  #  |  #  |  #  | ### ', 2: ' ### |#   #|    #|   # |  #  | #   |#####',
  3: '#### |    #|    #| ### |    #|    #|#### ', 4: '#   #|#   #|#   #|#####|    #|    #|    #', 5: '#####|#    |#### |    #|    #|#   #| ### ',
  6: ' ### |#    |#    |#### |#   #|#   #| ### ', 7: '#####|    #|   # |  #  |  #  |  #  |  #  ', 8: ' ### |#   #|#   #| ### |#   #|#   #| ### ',
  9: ' ### |#   #|#   #| ####|    #|    #| ### ',
  '!': '  #  |  #  |  #  |  #  |  #  |     |  #  ', '-': '     |     |     |#####|     |     |     ', ':': '     |  #  |     |     |     |  #  |     ',
  '.': '     |     |     |     |     |     |  #  ', ' ': '     |     |     |     |     |     |     ', '+': '     |  #  |  #  |#####|  #  |  #  |     ',
  '&': ' ##  |#  # |# #  | #   |# # #|#  # | ## #', '·': '     |     |     |  #  |     |     |     ', "'": '  #  |  #  |     |     |     |     |     ',
}
const FG = {}
for (const k in F) FG[k] = F[k].split('|')

export const tw = (s, k = 1) => String(s).length * 6 * k - k

export function txt(g, s, x, y, c, k = 1, shadow) {
  s = String(s).toUpperCase()
  if (shadow) { const o = Math.min(k, 2); txt(g, s, x + o, y + o, shadow, k) }
  g.fillStyle = c
  for (let i = 0; i < s.length; i++) {
    const gl = FG[s[i]] || FG[' ']
    for (let r = 0; r < 7; r++) for (let q = 0; q < 5; q++)
      if (gl[r][q] === '#') g.fillRect(Math.round(x + (i * 6 + q) * k), Math.round(y + r * k), k, k)
  }
}

// Gradient letters with a thick outline: the Tecmo cut-in word.
export function txtG(g, s, x, y, k, cols, out) {
  s = String(s).toUpperCase()
  if (out) {
    g.fillStyle = out
    for (let i = 0; i < s.length; i++) {
      const gl = FG[s[i]] || FG[' ']
      for (let r = 0; r < 7; r++) for (let q = 0; q < 5; q++)
        if (gl[r][q] === '#') g.fillRect(Math.round(x + (i * 6 + q) * k) - 2, Math.round(y + r * k) - 2, k + 4, k + 4)
    }
  }
  for (let i = 0; i < s.length; i++) {
    const gl = FG[s[i]] || FG[' ']
    for (let r = 0; r < 7; r++) {
      g.fillStyle = cols[r]
      for (let q = 0; q < 5; q++) if (gl[r][q] === '#') g.fillRect(Math.round(x + (i * 6 + q) * k), Math.round(y + r * k), k, k)
    }
  }
}

export function dith(g, x, y, w, h, c) {
  g.fillStyle = c
  for (let yy = y; yy < y + h; yy++) for (let xx = x + (yy & 1); xx < x + w; xx += 2) g.fillRect(xx, yy, 1, 1)
}

// A dark outline around everything opaque on a sprite canvas: the 16-bit edge.
export function outline(cv, col = OUTC, th = 1) {
  const c = cv.getContext('2d')
  const d = c.getImageData(0, 0, cv.width, cv.height)
  const a = d.data, w = cv.width, h = cv.height
  const src = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) src[i] = a[i * 4 + 3] > 40 ? 1 : 0
  const [r, g, b] = rgb(col)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x
    if (src[i]) continue
    let hit = false
    for (let dy = -th; dy <= th && !hit; dy++) for (let dx = -th; dx <= th; dx++) {
      if (Math.abs(dx) + Math.abs(dy) > th) continue
      const xx = x + dx, yy = y + dy
      if (xx >= 0 && yy >= 0 && xx < w && yy < h && src[yy * w + xx]) { hit = true; break }
    }
    if (hit) { a[i * 4] = r; a[i * 4 + 1] = g; a[i * 4 + 2] = b; a[i * 4 + 3] = 255 }
  }
  c.putImageData(d, 0, 0)
}

export const SKIN = ['#f1c7a3', '#e3b089', '#c98e62', '#a8714a', '#7a4b2c', '#5c3a22']
export const HAIR = ['#2a1a10', '#5a3a1e', '#8b5a2b', '#c99a55', '#1a1a1a', '#6b2f1a']
export const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
