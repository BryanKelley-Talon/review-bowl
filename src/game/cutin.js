// ============================================================
// CUT-INS — the Tecmo-style celebrations and the band (BK 2026-10-03; words approved 15:46).
//
// Football: TOUCHDOWN!, FIRST DOWN!, BIG PLAY!, TAKEAWAY!, STOPPED!, and the HALFTIME SHOW band
// before the halftime questions ("a nod to the marching band"). Volleyball's set break gets the
// same band, captioned PEP BAND. Every cut-in is a tap (or a key) to skip, and reduced motion
// gets a still frame. These draw on whatever canvas the sport plays on, at its own size.
// ============================================================
import { OUTC, lum, rng, shade, tw, txt, txtG } from './pixel.js'

const GRAD = ['#fff6c8', '#ffe27a', '#f7c948', '#f0b232', '#e8962a', '#df7a22', '#c85a18']

// c: { word, sub, t0, kit: { j, t } }, e: seconds since t0, hero: () => canvas (a 3× sprite), reduced
export function drawCelebration(g, W, H, c, e, hero, reduced) {
  const k = reduced ? 1 : Math.min(1, e / 0.2), ease = 1 - (1 - k) * (1 - k)
  if (!reduced && e < 0.05) { g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H); return }
  g.fillStyle = '#05070d'; g.fillRect(0, 0, W, H)
  const cx = Math.round(W * 0.29), cy = Math.round(H * 0.55), n = 20, rot = reduced ? 0 : e * 0.5
  const c1 = c.kit.j, c2 = lum(c.kit.j) < 0.15 ? shade(c.kit.t, -0.35) : shade(c.kit.j, -0.35)
  for (let i = 0; i < n; i++) {
    const a0 = rot + i / n * Math.PI * 2, a1 = a0 + Math.PI / n
    g.fillStyle = i % 2 ? c1 : c2
    g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a0) * W * 1.2, cy + Math.sin(a0) * W * 1.2)
    g.lineTo(cx + Math.cos(a1) * W * 1.2, cy + Math.sin(a1) * W * 1.2); g.closePath(); g.fill()
  }
  const band = Math.round(H * 0.13)
  g.globalAlpha = 0.55; g.fillStyle = '#05070d'; g.fillRect(0, 0, W, band); g.fillRect(0, H - band - 2, W, band + 2); g.globalAlpha = 1
  g.fillStyle = '#E3B341'; g.fillRect(0, band, W, 2); g.fillRect(0, H - band - 2, W, 2)
  const spr = hero && hero()
  if (spr) {
    const hx = Math.round(-spr.width * 0.6 + ease * (spr.width * 0.6 + W * 0.29 - spr.width / 2))
    g.drawImage(spr, hx, H - band - spr.height + Math.round(spr.height * 0.12))
  }
  const word = c.word
  const ks = Math.max(3, Math.min(Math.floor((W * 0.56) / (word.length * 6)), Math.round(H / 43)))
  const ww = tw(word, ks), wx = Math.round(W - 14 - ww + (1 - ease) * W * 0.6), wy = Math.round(H * 0.3)
  g.fillStyle = 'rgba(5,7,13,.72)'; g.fillRect(wx - 10, wy - 8, ww + 20, 7 * ks + 16)
  txtG(g, word, wx, wy, ks, GRAD, OUTC)
  if (c.sub) {
    const s2 = Math.max(1, Math.round(ks / 2.5))
    txt(g, c.sub, W - 14 - tw(c.sub, s2), wy + 7 * ks + 18, '#ffffff', s2, OUTC)
  }
}

// ── the band ──────────────────────────────────────────────────────────────────
// Rows of marchers in the home colours cross the field, left to right: a drum line, the brass
// with gold bells, the sousaphones at the back, plumes on every hat. Original art, no school's marks.
function marcher(g, x, y, s, kind, colors, step) {
  const [c0, c1] = colors
  const coat = lum(c0) < 0.1 ? shade(c1, -0.15) : c0
  const trim = coat === c0 ? c1 : '#f2f2f2'
  const r = (dx, dy, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x + dx * s), Math.round(y + dy * s), Math.ceil(w * s), Math.ceil(h * s)) }
  const lift = step ? 1 : 0
  // legs (white spats), coat, cross-belts, shako with plume
  r(-3, -6, 2, 6 - lift, '#1b1d24'); r(1, -6, 2, 6 - (1 - lift), '#1b1d24')
  r(-3, -1 - lift, 2, 1, '#f4f4f4'); r(1, -1 - (1 - lift), 2, 1, '#f4f4f4')
  r(-4, -15, 8, 9, coat); r(-4, -15, 2, 9, shade(coat, -0.3)); r(2, -14, 1, 7, shade(coat, 0.25))
  r(-4, -15, 8, 1, trim); r(-1, -14, 2, 8, trim)
  r(-2, -18, 4, 3, '#d9a77c')
  r(-3, -23, 6, 5, '#121218'); r(-3, -19, 6, 1, trim); r(-1, -27, 2, 4, '#f4f4f4'); r(0, -28, 2, 2, trim)
  if (kind === 'drum') { r(-4, -11, 8, 5, '#f2f2f2'); r(-4, -11, 8, 1, trim); r(-4, -7, 8, 1, trim); r(-5, -13 + lift * 2, 1, 4, '#c9a24a'); r(4, -13 + (1 - lift) * 2, 1, 4, '#c9a24a') }
  if (kind === 'horn') { r(3, -16, 6, 2, '#e8b84a'); r(8, -18, 3, 6, '#f5d27a'); r(8, -17, 1, 4, '#b7882a') }
  if (kind === 'tuba') { r(-6, -24, 10, 10, '#e8b84a'); r(-4, -22, 6, 6, '#121218'); r(-5, -23, 2, 8, '#f5d27a'); r(-6, -14, 4, 4, '#b7882a') }
}

// b: { caption, colors: [c0, c1], t0, floor: 'grass' | 'wood' }
export function drawBand(g, W, H, b, e, reduced) {
  g.fillStyle = b.floor === 'wood' ? '#c58b50' : '#357F33'; g.fillRect(0, 0, W, H)
  if (b.floor === 'wood') { for (let y = 0; y < H; y += 4) { g.fillStyle = (y / 4) % 2 ? '#bf854a' : '#c58b50'; g.fillRect(0, y, W, 4) } }
  else { for (let x = 0; x < W; x += 40) { g.fillStyle = (x / 40) % 2 ? '#3B8A38' : '#357F33'; g.fillRect(x, 0, 40, H) } g.fillStyle = 'rgba(255,255,255,.75)'; for (let x = 20; x < W; x += 40) g.fillRect(x, 0, 2, H) }
  const s = Math.max(1, Math.round(H / 140))
  const rows = 4, cols = 7, gapX = 22 * s, gapY = Math.round((H * 0.62) / rows)
  const span = cols * gapX
  const prog = reduced ? 0.5 : Math.min(1.15, e / 3.2)
  const x0 = Math.round(-span + prog * (W + span * 0.9))
  const r = rng(7)
  for (let row = 0; row < rows; row++) {
    const kind = row === 0 ? 'drum' : row === rows - 1 ? 'tuba' : 'horn'
    for (let c = 0; c < cols; c++) {
      const step = reduced ? 0 : (Math.floor(e * 6) + c + row) % 2
      marcher(g, x0 + c * gapX + (row % 2) * gapX / 2, Math.round(H * 0.33 + row * gapY + r() * 2), s, kind, b.colors, step)
    }
  }
  const band = Math.round(H * 0.16)
  g.globalAlpha = 0.8; g.fillStyle = '#05070d'; g.fillRect(0, 0, W, band); g.globalAlpha = 1
  g.fillStyle = '#E3B341'; g.fillRect(0, band, W, 2)
  const ks = Math.max(2, Math.floor(band / 11))
  txtG(g, b.caption, Math.round(W / 2 - tw(b.caption, ks) / 2), Math.round((band - 7 * ks) / 2), ks, GRAD, OUTC)
}

export const BAND_SECONDS = 3.4
export const CELE_SECONDS = { long: 1.5, short: 0.9 }
