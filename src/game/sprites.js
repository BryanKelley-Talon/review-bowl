// ============================================================
// FOOTBALL SPRITES — the 16-bit reskin (BK 2026-10-03 15:10 / 15:16; Leo's order 15:13;
// BK 16:06: "make sure our art is good and our players look good").
//
// Volleyball's art standard carried to football: bigger players, three tones of every colour,
// a dark outline, two running frames, cached per kit, pose, skin and number so a Chromebook
// paints each one once. Every player has his own skin tone and a jersey number. Helmet, jersey
// and pants stay three separate colours (teams.js): that is what keeps two sides readable.
// The cut-in close-up (s > 1) adds a face: eyes, brow, mouth, the facemask bars.
// Original art only: no league marks, no real players.
// ============================================================
import { OUTC, SKIN, lum, outline, shade } from './pixel.js'

const W = 26, H = 34, AX = 13, AY = 31        // sprite canvas and the feet anchor inside it
const DIG = {
  0: '111|101|101|101|111', 1: '010|110|010|010|111', 2: '111|001|111|100|111', 3: '111|001|111|001|111', 4: '101|101|111|001|001',
  5: '111|100|111|001|111', 6: '111|100|111|101|111', 7: '111|001|001|001|001', 8: '111|101|111|101|111', 9: '111|101|111|001|111',
}

function paint(g, kit, pose, s, skinIdx, num, face) {
  const J = kit.jersey, Hm = kit.helmet, P = kit.pants
  const darkJ = lum(J) < 0.2
  const Jd = shade(J, darkJ ? 0.12 : -0.32), Jl = shade(J, darkJ ? 0.38 : 0.26)
  const darkH = lum(Hm) < 0.2
  const Hd = shade(Hm, darkH ? 0.1 : -0.32), Hl = shade(Hm, darkH ? 0.5 : 0.55), Hm2 = shade(Hm, darkH ? 0.22 : -0.12)
  const Pd = shade(P, lum(P) < 0.2 ? 0.1 : -0.28), Pl = shade(P, lum(P) < 0.2 ? 0.3 : 0.25)
  const SK = SKIN[skinIdx % SKIN.length], SKd = shade(SK, -0.22), SKl = shade(SK, 0.16)
  const trim = Math.abs(lum(J) - lum(Hm)) > 0.25 ? Hm : (lum(J) > 0.5 ? '#1a1a22' : '#f2f2f2')
  const r = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round((AX + x) * s), Math.round((AY + y) * s), Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s))) }
  const run = pose === 'run0' ? 1 : pose === 'run1' ? -1 : 0
  const hero = pose === 'hero'

  // legs: the back leg a shade darker; they scissor when he runs; socks and cleats
  const bl = run ? -2 * run : 0, fl = run ? 2 * run : 0
  r(-4 + bl, -10, 3, 7, Pd); r(-4 + bl, -4, 3, 2, shade(trim, -0.2))
  r(-4 + bl, -2, 4, 2, '#141418')
  r(1 + fl, -10, 3, 7, P); r(1 + fl, -10, 1, 5, Pl); r(1 + fl, -5, 3, 1, Pd); r(1 + fl, -4, 3, 2, trim)
  r(1 + fl, -2, 4, 2, '#1d1d22'); r(3 + fl, -2, 2, 1, '#4a4a55')
  // pants: a stripe down the side, a belt
  r(-5, -12, 10, 3, P); r(-5, -12, 3, 3, Pd); r(-5, -12, 10, 1, '#202028'); r(1, -11, 1, 2, trim)
  // torso: jersey in three tones, shoulder pads wider than the waist
  r(-5, -20, 10, 8, J); r(-5, -20, 3, 8, Jd); r(-5, -13, 10, 1, Jd)
  r(-6, -22, 12, 3, J); r(-6, -22, 3, 3, Jd); r(1, -22, 4, 1, Jl); r(3, -20, 1, 6, Jl)
  r(-6, -21, 1, 2, trim); r(5, -21, 1, 2, trim)                         // sleeve stripes
  // the number, never mirrored (the sprite is painted facing right; the caller mirrors the canvas,
  // so the number is painted mirrored here when it will be flipped back)
  if (num != null) {
    const str = String(num)
    const w = str.length * 4 - 1, x0 = -w / 2 + 0.5
    ;[...str].forEach((ch, i) => {
      const rows = (DIG[ch] || DIG[0]).split('|')
      rows.forEach((row, j) => [...row].forEach((b, k) => {
        if (b !== '1') return
        const kk = face < 0 ? 2 - k : k
        const ii = face < 0 ? str.length - 1 - i : i
        r(x0 + ii * 4 + kk, -19 + j, 1, 1, trim)
      }))
    })
  }
  // arms
  if (hero) {
    r(-7, -20, 2, 7, SKd); r(-7, -14, 2, 1, Jd)
    r(5, -29, 2, 8, SK); r(5, -23, 2, 2, J); r(6, -28, 1, 5, SKl)
    r(4, -33, 5, 3, '#7a3f16'); r(5, -33, 3, 1, '#a0581f'); r(5, -32, 3, 1, '#f4f6fa')   // ball held high, laces
  } else {
    r(-7 - run, -20, 2, 7, SKd); r(-7 - run, -21, 2, 2, Jd)
    r(5 + run, -20, 2, 7, SK); r(5 + run, -21, 2, 2, J); r(6 + run, -19, 1, 4, SKl)
  }
  // neck
  r(-1, -24, 3, 2, SKd)
  // helmet: rounded, three tones, a crown stripe, a shine, the facemask facing forward
  r(-4, -31, 7, 1, Hm); r(-5, -30, 9, 6, Hm); r(-4, -24, 6, 1, Hd)
  r(-5, -27, 3, 3, Hd); r(-5, -30, 1, 3, Hm2)
  r(-1, -31, 3, 1, Hl); r(1, -30, 2, 2, Hl); r(2, -30, 1, 1, '#ffffff')
  r(-3, -32, 2, 1, Hm); r(-2, -32, 1, 9, shade(trim, -0.05)); r(-2, -32, 1, 1, shade(trim, 0.3))     // crown stripe
  r(-3, -27, 1, 1, '#141418')                                                              // ear hole
  r(3, -28, 2, 4, SK); r(3, -25, 2, 1, SKd)                                               // face
  const mask = lum(Hm) > 0.55 ? '#2a2a30' : '#c9ccd4'
  r(5, -29, 1, 5, mask); r(3, -27, 3, 1, mask); r(3, -25, 3, 1, mask)
  if (s > 1) {                                                                             // the close-up face
    const px = 1 / s
    r(3.6, -27.6, 0.7, 0.7, '#141418'); r(3.4, -28.4, 1.3, px * 1.5, shade(SK, -0.5))        // eye, brow
    r(3.4, -24.9, 1.2, px * 1.5, shade(SK, -0.45))                                          // mouth
    r(5.2, -28.6, px * 2, 4.2, shade(mask, 0.3))                                             // mask shine
  }
}

const cache = new Map()
// kit: { jersey, helmet, pants }. pose: stand · run0 · run1 · hero. face: 1 right, -1 left.
export function playerSprite(kit, pose = 'stand', face = 1, s = 1, skin = 1, num = null) {
  const key = `${kit.jersey}${kit.helmet}${kit.pants}|${pose}|${face}|${s}|${skin}|${num}`
  let cv = cache.get(key)
  if (cv) return cv
  cv = document.createElement('canvas')
  cv.width = W * s; cv.height = H * s
  const g = cv.getContext('2d')
  if (face < 0) { g.translate(W * s, 0); g.scale(-1, 1) }
  paint(g, kit, pose, s, skin, num, face)
  g.setTransform(1, 0, 0, 1, 0, 0)
  outline(cv, OUTC, s > 1 ? 2 : 1)
  cache.set(key, cv)
  return cv
}
export const SPRITE = { W, H, AX, AY }

// ── the cut-in close-up ──────────────────────────────────────────────────────
// Drawn for the cut-ins at its own resolution (not a blown-up field sprite): a waist-up
// player, helmet in profile with a cage facemask and a crown stripe, eye black, shoulder pads,
// the number big on the chest, the ball held high. Your kit, your quarterback's number.
const hcache = new Map()
export function heroSprite(kit, num = 7, skin = 2, s = 2) {
  const key = `${kit.jersey}${kit.helmet}${kit.pants}|${num}|${skin}|${s}`
  if (hcache.has(key)) return hcache.get(key)
  const HW = 70, HH = 96
  const cv = document.createElement('canvas'); cv.width = HW * s; cv.height = HH * s
  const g = cv.getContext('2d')
  const r = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x * s), Math.round(y * s), Math.round(w * s), Math.round(h * s)) }
  const ell = (cx, cy, rx, ry, c) => { for (let y = -ry; y <= ry; y++) { const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry)))); r(cx - w, cy + y, w * 2 + 1, 1, c) } }
  const J = kit.jersey, Hm = kit.helmet, P = kit.pants
  const dJ = lum(J) < 0.2, dH = lum(Hm) < 0.2
  const Jd = shade(J, dJ ? 0.14 : -0.32), Jl = shade(J, dJ ? 0.4 : 0.28)
  const Hd = shade(Hm, dH ? 0.12 : -0.3), Hl = shade(Hm, dH ? 0.55 : 0.6), Hdd = shade(Hm, dH ? 0.05 : -0.45)
  const Pd = shade(P, lum(P) < 0.2 ? 0.12 : -0.3)
  const SK = SKIN[skin % SKIN.length], SKd = shade(SK, -0.24), SKl = shade(SK, 0.18)
  const trim = Math.abs(lum(J) - lum(Hm)) > 0.25 ? Hm : (lum(J) > 0.5 ? '#1a1a22' : '#f2f2f2')
  const stripe = Math.abs(lum(Hm) - lum(J)) > 0.25 ? J : (lum(Hm) > 0.5 ? '#1a1a22' : '#f2f2f2')
  // legs and pants (waist-up framing, cut by the cut-in's band)
  r(20, 76, 11, 20, Pd); r(34, 76, 12, 20, P); r(36, 76, 2, 20, shade(P, 0.25)); r(31, 76, 3, 20, trim)
  r(18, 70, 30, 8, P); r(18, 70, 9, 8, Pd); r(18, 70, 30, 2, '#202028')
  // torso and shoulder pads
  r(18, 44, 30, 27, J); r(18, 44, 9, 27, Jd); r(40, 46, 3, 20, Jl)
  ell(33, 42, 19, 8, J); ell(26, 42, 10, 7, Jd); r(36, 36, 12, 2, Jl)
  r(13, 40, 6, 3, trim); r(47, 40, 6, 3, trim)                              // sleeve stripes
  // the number, big
  const D = String(num)
  const dw = D.length * 8 - 2
  ;[...D].forEach((ch, i) => (DIG[ch] || DIG[0]).split('|').forEach((row, j) => [...row].forEach((b, k) => { if (b === '1') r(33 - dw / 2 + i * 8 + k * 2, 50 + j * 3, 2, 3, trim) })))
  // the back arm, down
  r(11, 44, 7, 22, SKd); r(11, 41, 8, 6, Jd); ell(14, 67, 3, 3, SKd)
  // neck
  r(28, 30, 10, 8, SKd)
  // helmet: shell, shading, crown stripe, shine, ear hole
  ell(32, 18, 14, 13, Hm); ell(27, 22, 9, 8, Hd); r(19, 25, 10, 5, Hdd)
  ell(37, 11, 6, 3, Hl); r(38, 9, 3, 2, '#ffffff')
  for (let x = 19; x <= 43; x++) { const y = 18 - Math.round(12.6 * Math.sqrt(Math.max(0, 1 - ((x - 32) / 14) ** 2))); r(x, y + 1, 1, 3, stripe) }
  ell(27, 20, 2, 2, '#141418'); r(27, 20, 1, 1, '#3a3a44')
  // face behind the cage: eye, eye black, nose, mouth
  r(38, 13, 8, 15, SK); r(38, 13, 2, 15, SKd); r(44, 16, 2, 6, SKl)
  r(41, 16, 3, 2, '#141418'); r(42, 16, 1, 1, '#ffffff'); r(40, 15, 5, 1, shade(SK, -0.5))
  r(40, 19, 5, 2, '#141418')                                                   // eye black
  r(45, 21, 2, 3, SKd); r(41, 25, 4, 1, shade(SK, -0.45))
  // facemask cage
  const M = lum(Hm) > 0.55 ? '#2a2a30' : '#c9ccd4', Md = lum(Hm) > 0.55 ? '#111118' : '#8e929c'
  r(47, 12, 2, 18, M); r(37, 18, 12, 2, M); r(37, 23, 12, 2, M); r(39, 28, 10, 2, M); r(47, 12, 1, 18, Md)
  r(34, 27, 4, 4, Md)                                                          // chin strap
  // the front arm up, the ball high
  r(52, 17, 7, 25, SK); r(52, 17, 2, 25, SKd); r(57, 21, 2, 17, SKl); r(48, 36, 12, 8, J); r(48, 36, 12, 2, trim); r(48, 36, 3, 8, Jd)
  ell(56, 14, 4, 4, SK); r(53, 12, 2, 4, SKd)
  ell(57, 6, 9, 5, '#7a3f16'); ell(57, 5, 7, 3, '#94501d'); r(53, 3, 8, 1, '#f4f6fa'); for (let i = 0; i < 4; i++) r(54 + i * 2, 2, 1, 3, '#f4f6fa')
  outline(cv, OUTC, 2)
  hcache.set(key, cv)
  return cv
}
