// ============================================================
// FOOTBALL SPRITES — the Pixel Standard (BK 2026-10-04 17:24, "Approved. Signed.").
//
// Before: the 16-bit reskin (BK 2026-10-03 15:10 / 15:16; Leo's order 15:13; BK 16:06: "make sure
// our art is good and our players look good"): a 26×34 box, two running frames, three tones.
// Now, to the standard (CONVENTIONS §6): a 30×38 box; four tones of every colour (highlight, base,
// shade, deep shade); a four-frame run; frames for the throw, the catch, the tackle and the
// celebration; a two-frame idle so nobody stands frozen. Players are posed skeletons, like
// volleyball's, cached per kit, pose, skin and number so a Chromebook paints each one once.
// Helmet, jersey and pants stay three separate colours (teams.js): that is what keeps two sides
// readable. Every player has his own skin tone and a jersey number. The number is never mirrored.
// Original art only: no league marks, no real players.
// ============================================================
import { OUTC, SKIN, lum, outline, ramp4, shade } from './pixel.js'

const W = 30, H = 38, AX = 15, AY = 36        // sprite canvas and the feet anchor inside it
const DIG = {
  0: '111|101|101|101|111', 1: '010|110|010|010|111', 2: '111|001|111|100|111', 3: '111|001|111|001|111', 4: '101|101|111|001|001',
  5: '111|100|111|001|111', 6: '111|100|111|101|111', 7: '111|001|001|001|001', 8: '111|101|111|101|111', 9: '111|101|111|001|111',
}

// Poses, Tecmo's three-quarter view: chest to the camera so the number always shows, the helmet
// and facemask turned the way he plays. Feet on y = 0, facing +x. Legs: [dx, lift] for the far
// (B) and near (F) leg. Arms: shoulder → elbow → hand. up: the whole body raised (a hop, a bob).
// lean: the upper body pushed forward (the tackle).
const ARM_SH = { B: [-7, -25], F: [7, -25] }
const P = (legs, armB, armF, extra = {}) => ({ legs, armB, armF, up: 0, lean: 0, ...extra })
const POSES = {
  stand0: P({ B: [-0.5, 0], F: [0.5, 0] }, [[-8.5, -20], [-8.5, -15]], [[8.5, -20], [8.5, -15]]),
  stand1: P({ B: [-0.5, 0], F: [0.5, 0] }, [[-8.5, -19], [-8.8, -14]], [[8.5, -19], [8.8, -14]], { breath: 1 }),
  run0: P({ B: [-2.5, 0], F: [2.5, 1] }, [[-8, -21], [-6.5, -18]], [[9, -19], [10, -15]], { up: 0 }),
  run1: P({ B: [-0.5, 0], F: [1, 3] }, [[-8.5, -20], [-8, -16]], [[8.5, -20], [8.5, -16]], { up: 1 }),
  run2: P({ B: [2, 1], F: [-2, 0] }, [[-9, -19], [-10, -15]], [[8, -21], [6.5, -18]], { up: 0 }),
  run3: P({ B: [1, 3], F: [-0.5, 0] }, [[-8.5, -20], [-8.5, -16]], [[8.5, -20], [8, -16]], { up: 1 }),
  throw0: P({ B: [-2, 0], F: [2, 0] }, [[-9, -21], [-6, -21]], [[9, -29], [7, -33]], { ball: 'F' }),
  throw1: P({ B: [-2.5, 0], F: [2.5, 0] }, [[-8.5, -19], [-9, -15]], [[11, -22], [13, -19]], { lean: 1 }),
  catch: P({ B: [-1.5, 1], F: [1.5, 0] }, [[-7, -30], [-5, -35]], [[7, -30], [5, -35]], { up: 1 }),
  tackle: P({ B: [-3.5, 0], F: [1.5, 0] }, [[-3, -20], [3, -18]], [[11, -21], [14, -20]], { lean: 3, down: 2 }),
  hero0: P({ B: [-1, 0], F: [1, 0] }, [[-9, -29], [-9, -34]], [[9, -30], [9, -36]], { ball: 'F' }),
  hero1: P({ B: [-1.5, 3], F: [1.5, 3] }, [[-10, -31], [-10, -36]], [[10, -32], [10, -38]], { ball: 'F', up: 3 }),
}
POSES.stand = POSES.stand0
POSES.hero = POSES.hero0
export const POSE_NAMES = Object.keys(POSES)

function paint(g, kit, pose, s, skinIdx, num, face) {
  const j = POSES[pose] || POSES.stand0
  const Jr = ramp4(kit.jersey), Hr = ramp4(kit.helmet), Pr = ramp4(kit.pants)
  const SK = SKIN[skinIdx % SKIN.length], Sr = ramp4(SK)
  const trim = Math.abs(lum(kit.jersey) - lum(kit.helmet)) > 0.25 ? kit.helmet : (lum(kit.jersey) > 0.5 ? '#1a1a22' : '#f2f2f2')
  const f = face < 0 ? -1 : 1
  const ox = AX * s, oy = AY * s
  const up = j.up || 0, lean = j.lean || 0, down = j.down || 0
  const X = v => ox + f * v * s, Y = v => oy + v * s
  // r(): a rectangle in sprite space, mirrored as a whole when he faces left
  const r = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(f > 0 ? X(x) : X(x + w)), Math.round(Y(y)), Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s))) }
  const seg = (a, b, t, c) => {
    const x0 = X(a[0]), y0 = Y(a[1]), x1 = X(b[0]), y1 = Y(b[1])
    const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))) + 1, tt = Math.max(1, t * s)
    g.fillStyle = c
    for (let i = 0; i <= n; i++) { const u = i / n; g.fillRect(Math.round(x0 + (x1 - x0) * u - tt / 2), Math.round(y0 + (y1 - y0) * u - tt / 2), Math.round(tt), Math.round(tt)) }
  }
  const disc = (cx, cy, rad, col) => {
    const X0 = X(cx), Y0 = Y(cy), rr = rad * s
    g.fillStyle = col
    for (let yy = -rr; yy <= rr; yy++) { const w = Math.sqrt(Math.max(0, rr * rr - yy * yy)); g.fillRect(Math.round(X0 - w), Math.round(Y0 + yy), Math.round(w * 2), 1) }
  }
  const U = up - down          // body lift (a hop) or drop (a tackle's crouch)
  const L = lean               // upper body forward

  // legs: pants to the knee, a sock in the trim, a cleat; the far leg a tone darker
  const leg = (x0, [dx, lift], back) => {
    const hipY = -12 - U, footY = -lift
    const kx = x0 + dx * 0.5, ky = (hipY + footY) / 2 - lift * 0.3
    const fx = x0 + dx
    const P0 = back ? Pr.sh : Pr.base
    seg([x0, hipY], [kx, ky], 3.4, P0)
    if (!back) seg([x0 + 1, hipY + 1], [kx + 1, ky - 1], 1, Pr.hi)
    seg([x0 - 1.4, hipY], [kx - 1.4, ky], 1, back ? Pr.deep : Pr.sh)
    seg([kx, ky], [fx, footY - 2], 3, back ? shade(trim, -0.3) : trim)
    seg([kx, ky + 0.2], [kx + (fx - kx) * 0.3, ky + (footY - 2 - ky) * 0.3], 3, back ? Sr.sh : Sr.base)
    r(fx - 1.6, footY - 2, 4.4, 2, back ? '#101014' : '#18181e')
    if (!back) r(fx + 1.4, footY - 2, 1.2, 0.8, '#4a4a55')
  }
  leg(-2.6, j.legs.B, true)
  leg(2.4, j.legs.F, false)
  // pants: hips and a belt
  r(-5.5, -15 - U, 11, 4, Pr.base); r(-5.5, -15 - U, 3, 4, Pr.sh); r(-5.5, -15 - U, 1, 4, Pr.deep); r(3.5, -15 - U, 1, 4, Pr.hi)
  r(-5.5, -15.5 - U, 11, 1, '#202028'); r(4.6, -14.5 - U, 0.8, 3, trim)
  // the far arm, behind the body
  const arm = (pts, side) => {
    const [sx, sy] = ARM_SH[side]
    const sh = [sx + L, sy - U], el = [pts[0][0] + L, pts[0][1] - U], hd = [pts[1][0] + L, pts[1][1] - U]
    const back = side === 'B'
    seg(sh, [sh[0] + (el[0] - sh[0]) * 0.5, sh[1] + (el[1] - sh[1]) * 0.5], 3.4, back ? Jr.sh : Jr.base)
    seg([sh[0] + (el[0] - sh[0]) * 0.45, sh[1] + (el[1] - sh[1]) * 0.45], [sh[0] + (el[0] - sh[0]) * 0.55, sh[1] + (el[1] - sh[1]) * 0.55], 3.4, back ? shade(trim, -0.25) : trim)
    seg([sh[0] + (el[0] - sh[0]) * 0.55, sh[1] + (el[1] - sh[1]) * 0.55], el, 2.8, back ? Sr.sh : Sr.base)
    seg(el, hd, 2.6, back ? Sr.sh : Sr.base)
    if (!back) seg([el[0] + 0.6, el[1]], [hd[0] + 0.6, hd[1] - 0.5], 1, Sr.hi)
    disc(hd[0], hd[1], 1.4, back ? Sr.deep : Sr.sh)
    return hd
  }
  arm(j.armB, 'B')
  // torso: the jersey in four tones, the number on the chest
  const T0 = -24 - U + (j.breath || 0)
  r(-6 + L * 0.5, T0, 12, 9.5, Jr.base)
  r(-6 + L * 0.5, T0, 3, 9.5, Jr.sh); r(-6 + L * 0.5, T0, 1, 9.5, Jr.deep)
  r(4 + L * 0.5, T0 + 1, 1, 7, Jr.hi)
  r(-6 + L * 0.5, T0 + 8.5, 12, 1, Jr.sh)
  // shoulder pads: wider than the waist, rounded, lit on top
  r(-7.5 + L, T0 - 3, 15, 4, Jr.base); r(-6.5 + L, T0 - 4, 13, 1, Jr.base)
  r(-5.5 + L, T0 - 4, 9, 1, Jr.hi); r(-7.5 + L, T0 - 3, 3, 4, Jr.sh); r(-7.5 + L, T0 - 1, 15, 1, Jr.sh)
  r(-7.5 + L, T0 - 2.5, 1, 2, trim); r(6.5 + L, T0 - 2.5, 1, 2, trim)
  if (num != null) {
    const str = String(num), wN = str.length * 4 - 1
    const cx = X(0.3 + L * 0.5), ny = Y(T0 + 1.5)
    g.fillStyle = trim
    ;[...str].forEach((ch, i) => (DIG[ch] || DIG[0]).split('|').forEach((row, rr) => [...row].forEach((b, k) => {
      if (b === '1') g.fillRect(Math.round(cx - (wN / 2) * s + (i * 4 + k) * s), Math.round(ny + rr * s), Math.max(1, Math.round(s)), Math.max(1, Math.round(s)))
    })))
  }
  // neck and helmet: rounded, four tones, a crown stripe and a shine; the facemask faces forward
  const hx = 0.6 + L * 1.3, hy = -31.5 - U + (j.breath || 0)
  r(hx - 1.6, hy + 3.6, 3.2, 2.4, Sr.sh)
  disc(hx, hy, 4.9, Hr.deep)
  disc(hx + 0.1, hy - 0.2, 4.4, Hr.sh)
  disc(hx + 0.5, hy - 0.5, 3.8, Hr.base)
  disc(hx + 1.3, hy - 2.3, 1.6, Hr.hi)
  r(hx + 1.6, hy - 3.6, 1, 1, '#ffffff')
  seg([hx - 0.6, hy - 4.6], [hx - 0.6, hy + 2], 1, shade(trim, 0.05))       // crown stripe
  disc(hx - 2.1, hy + 0.6, 0.8, '#141418')                                  // ear hole
  r(hx + 2.1, hy - 0.6, 2.6, 3.8, Sr.base)                                 // face
  r(hx + 2.1, hy + 2.4, 2.6, 0.8, Sr.sh)
  r(hx + 2.6, hy, 0.8, 0.8, '#141418')                                     // eye
  const mask = lum(kit.helmet) > 0.55 ? '#2a2a30' : '#c9ccd4'
  r(hx + 4.6, hy - 1.2, 1, 5, mask)
  r(hx + 2.4, hy + 1.0, 3.2, 0.8, mask)
  r(hx + 2.4, hy + 2.8, 3.2, 0.8, mask)
  if (s > 1) r(hx + 2.4, hy - 0.9, 1.4, 0.4, Sr.deep)
  // the near arm, in front
  const hand = arm(j.armF, 'F')
  if (j.ball) {
    disc(hand[0] + 0.4, hand[1] - 1.8, 2.0, '#6f3912'); disc(hand[0] + 0.7, hand[1] - 2.2, 1.1, '#94501d')
    seg([hand[0] - 0.6, hand[1] - 1.8], [hand[0] + 1.4, hand[1] - 1.8], 0.6, '#f4f6fa')
  }
}

const cache = new Map()
// kit: { jersey, helmet, pants }. pose: one of POSE_NAMES. face: 1 right, -1 left.
export function playerSprite(kit, pose = 'stand0', face = 1, s = 1, skin = 1, num = null) {
  const key = `${kit.jersey}${kit.helmet}${kit.pants}|${pose}|${face}|${s}|${skin}|${num}`
  let cv = cache.get(key)
  if (cv) return cv
  cv = document.createElement('canvas')
  cv.width = W * s; cv.height = H * s
  paint(cv.getContext('2d'), kit, pose, s, skin, num, face)
  outline(cv, OUTC, s > 1 ? 2 : 1)
  cache.set(key, cv)
  return cv
}
export const SPRITE = { W, H, AX, AY }

// The run cycle by distance covered: four frames, a stride every ~1.4 yards.
export const runFrame = (t, phase = 0) => 'run' + (Math.floor(t * 10 + phase) & 3)

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
  const JR = ramp4(J), Jd = JR.sh === J ? shade(J, 0.14) : JR.sh, Jl = JR.hi, Jdd = JR.deep
  const Hd = shade(Hm, dH ? 0.12 : -0.3), Hl = shade(Hm, dH ? 0.55 : 0.6), Hdd = shade(Hm, dH ? 0.05 : -0.45)
  const Pd = shade(P, lum(P) < 0.2 ? 0.12 : -0.3)
  const SK = SKIN[skin % SKIN.length], SKd = shade(SK, -0.24), SKl = shade(SK, 0.18)
  const trim = Math.abs(lum(J) - lum(Hm)) > 0.25 ? Hm : (lum(J) > 0.5 ? '#1a1a22' : '#f2f2f2')
  const stripe = Math.abs(lum(Hm) - lum(J)) > 0.25 ? J : (lum(Hm) > 0.5 ? '#1a1a22' : '#f2f2f2')
  // legs and pants (waist-up framing, cut by the cut-in's band)
  r(20, 76, 11, 20, Pd); r(34, 76, 12, 20, P); r(36, 76, 2, 20, shade(P, 0.25)); r(31, 76, 3, 20, trim)
  r(18, 70, 30, 8, P); r(18, 70, 9, 8, Pd); r(18, 70, 30, 2, '#202028')
  // torso and shoulder pads
  r(18, 44, 30, 27, J); r(18, 44, 9, 27, Jd); r(18, 44, 3, 27, Jdd); r(40, 46, 3, 20, Jl)
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
