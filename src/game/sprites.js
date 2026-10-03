// ============================================================
// FOOTBALL SPRITES — the 16-bit reskin (BK 2026-10-03 15:10 / 15:16; Leo's order 15:13).
//
// Volleyball's art standard carried to football: bigger players, three tones of every colour,
// a dark outline, two running frames, cached per kit and pose so a Chromebook paints each one once.
// Helmet, jersey and pants stay three separate colours (teams.js): that is what keeps two sides
// readable at this size, and it is still the only thing that tells them apart besides the outline
// and which way they face. Original art only: no league marks, no real players.
// ============================================================
import { OUTC, lum, outline, shade } from './pixel.js'

const W = 26, H = 34, AX = 13, AY = 31        // sprite canvas and the feet anchor inside it

function paint(g, kit, pose, s) {
  const J = kit.jersey, Hm = kit.helmet, P = kit.pants
  const darkJ = lum(J) < 0.2
  const Jd = shade(J, darkJ ? 0.12 : -0.32), Jl = shade(J, darkJ ? 0.38 : 0.26)
  const Hd = shade(Hm, lum(Hm) < 0.2 ? 0.12 : -0.3), Hl = shade(Hm, lum(Hm) < 0.2 ? 0.45 : 0.4)
  const Pd = shade(P, lum(P) < 0.2 ? 0.1 : -0.28)
  const SK = '#d9a77c', SKd = '#b9875e'
  const r = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect((AX + x) * s, (AY + y) * s, w * s, h * s) }
  const run = pose === 'run0' ? 1 : pose === 'run1' ? -1 : 0
  const hero = pose === 'hero'

  // legs: the back leg a shade darker; they scissor when he runs
  const bl = run ? -2 * run : 0, fl = run ? 2 * run : 0
  r(-4 + bl, -10, 3, 8, Pd); r(-4 + bl, -4, 3, 1, Hd)                 // back leg, sock stripe
  r(-4 + bl, -2, 4, 2, '#141418')
  r(1 + fl, -10, 3, 8, P); r(1 + fl, -10, 1, 6, shade(P, 0.25)); r(1 + fl, -4, 3, 1, Hm)
  r(1 + fl, -2, 4, 2, '#1d1d22'); r(3 + fl, -2, 1, 1, '#4a4a55')
  // pants top / belt
  r(-5, -12, 10, 3, P); r(-5, -12, 3, 3, Pd); r(-5, -12, 10, 1, '#202028')
  // torso: jersey in three tones, shoulder pads wider than the waist
  r(-5, -20, 10, 8, J); r(-5, -20, 3, 8, Jd); r(-5, -13, 10, 1, Jd)
  r(-6, -21, 12, 3, J); r(-6, -21, 3, 3, Jd); r(1, -21, 4, 1, Jl); r(2, -19, 2, 5, Jl)
  // sleeve stripes in the helmet colour
  r(-7, -20, 2, 1, Hm); r(5, -20, 2, 1, Hm)
  // arms
  if (hero) {
    r(-7, -19, 2, 6, SKd)                                              // back arm down
    r(5, -27, 2, 7, SK); r(5, -22, 2, 2, J)                            // front arm up, ball high
    r(4, -31, 5, 3, '#7a3f16'); r(5, -31, 3, 1, '#a0581f'); r(6, -30, 1, 1, '#f4f6fa')
  } else {
    r(-7 - run, -19, 2, 6, SKd)
    r(5 + run, -19, 2, 6, SK); r(5 + run, -19, 2, 2, J)
  }
  // neck
  r(-1, -22, 3, 2, SKd)
  // helmet: rounded, shaded, a stripe over the crown, the facemask facing forward
  r(-4, -29, 8, 1, Hm); r(-5, -28, 10, 6, Hm)
  r(-5, -25, 3, 3, Hd); r(-4, -23, 7, 1, Hd)
  r(-2, -29, 3, 1, Hl); r(1, -28, 2, 2, Hl)
  r(-1, -30, 2, 1, lum(Hm) > 0.6 ? J : '#f2f2f2'); r(-1, -29, 2, 1, lum(Hm) > 0.6 ? J : '#e8e8e8')   // crown stripe
  r(-3, -26, 1, 1, '#141418')                                          // ear hole
  r(3, -26, 2, 3, SK)                                                  // face
  const mask = lum(Hm) > 0.55 ? '#2a2a30' : '#c9ccd4'
  r(5, -27, 1, 4, mask); r(4, -25, 2, 1, mask); r(4, -23, 2, 1, mask)
}

const cache = new Map()
// kit: { jersey, helmet, pants }. pose: stand · run0 · run1 · hero. face: 1 right, -1 left.
export function playerSprite(kit, pose = 'stand', face = 1, s = 1) {
  const key = `${kit.jersey}${kit.helmet}${kit.pants}|${pose}|${face}|${s}`
  let cv = cache.get(key)
  if (cv) return cv
  cv = document.createElement('canvas')
  cv.width = W * s; cv.height = H * s
  const g = cv.getContext('2d')
  if (face < 0) { g.translate(W * s, 0); g.scale(-1, 1) }
  paint(g, kit, pose, s)
  g.setTransform(1, 0, 0, 1, 0, 0)
  outline(cv, OUTC, s > 1 ? 2 : 1)
  cache.set(key, cv)
  return cv
}
export const SPRITE = { W, H, AX, AY }
