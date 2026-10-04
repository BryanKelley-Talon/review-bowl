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
  const band = Math.round(H * 0.16)
  const rows = 4, cols = 7, gapX = 22 * s
  const top = band + 29 * s
  const span = cols * gapX
  const prog = reduced ? 0.5 : Math.min(1.15, e / 3.2)
  const x0 = Math.round(-span + prog * (W + span * 0.9))
  const r = rng(7)
  for (let row = 0; row < rows; row++) {
    const kind = row === 0 ? 'drum' : row === rows - 1 ? 'tuba' : 'horn'
    for (let c = 0; c < cols; c++) {
      const step = reduced ? 0 : (Math.floor(e * 6) + c + row) % 2
      marcher(g, x0 + c * gapX + (row % 2) * gapX / 2, Math.round(top + row * Math.floor((H - top - 4) / rows) + r() * 2), s, kind, b.colors, step)
    }
  }
  g.globalAlpha = 0.8; g.fillStyle = '#05070d'; g.fillRect(0, 0, W, band); g.globalAlpha = 1
  g.fillStyle = '#E3B341'; g.fillRect(0, band, W, 2)
  const ks = Math.max(2, Math.floor(band / 11))
  txtG(g, b.caption, Math.round(W / 2 - tw(b.caption, ks) / 2), Math.round((band - 7 * ks) / 2), ks, GRAD, OUTC)
}

export const BAND_SECONDS = 3.4
// Football's cut-ins hold one second longer (BK 2026-10-03 23:43: "cut scenes need another second on
// the screen"). Volleyball's PEP BAND keeps BAND_SECONDS; football's band adds FOOTBALL_EXTRA.
export const CELE_SECONDS = { long: 2.5, short: 1.9 }
export const FOOTBALL_EXTRA = 1

// ============================================================
// FRIDAY NIGHT CUT SCENES (the Pixel Standard; BK 2026-10-04 17:12–17:24).
// The run-through (your school's name on the paper, BK 17:13), captains at midfield for the coin
// toss, and the student section on a touchdown. No new words on screen: the banner carries the
// school's name and nothing else. Every one is a tap or a key to skip, reduced motion gets a still
// frame, and nothing flashes.
// ============================================================
import { cheerColor } from './campus.js'
import { LITE, SKIN as SKN } from './pixel.js'

// The night behind every scene: banded sky, stars, two light banks with a banded glow.
function night(g, W, H, seed, lightsAt = [0.125, 0.875]) {
  g.fillStyle = '#05070d'; g.fillRect(0, 0, W, H)
  ;['#03050b', '#060a16', '#0a1122', '#0e182f'].forEach((c, i) => { g.fillStyle = c; g.fillRect(0, Math.round(i * H * 0.08), W, Math.ceil(H * 0.08)) })
  const r = rng(seed)
  for (let i = 0; i < 80; i++) { g.fillStyle = r() < 0.3 ? '#fff' : '#9fb0d0'; g.fillRect(Math.floor(r() * W), Math.floor(r() * H * 0.26), 1, 1) }
  for (const f of lightsAt) {
    const lx = Math.round(W * f), ly = Math.round(H * 0.1)
    if (!LITE.on) for (const [rr, a] of [[34, 0.05], [22, 0.09], [13, 0.16]]) { g.fillStyle = `rgba(255,246,200,${a})`; g.beginPath(); g.arc(lx, ly, rr, 0, 7); g.fill() }
    g.fillStyle = '#2a2e36'; g.fillRect(lx - 14, ly - 8, 28, 16)
    for (let y = 0; y < 3; y++) for (let x = 0; x < 5; x++) { g.fillStyle = '#fffbe0'; g.fillRect(lx - 12 + x * 5, ly - 6 + y * 5, 4, 4) }
    g.fillStyle = '#7b828c'; g.fillRect(lx - 1, ly + 8, 3, Math.round(H * 0.25))
  }
}
// Packed home bleachers: the student section in the school's colour, the band at one end.
// jump: 0–1, how many are on their feet with their arms up.
function stands(g, W, y0, rows, team, seed, jump = 0, t = 0, big = 1, wood = false) {
  const r = rng(seed), [c0] = team.colors, cheer = cheerColor(team)
  const rowH = 6 * big
  for (let row = 0; row < rows; row++) {
    const y = y0 + row * rowH
    if (wood) { g.fillStyle = '#4a3423'; g.fillRect(0, y, W, rowH); g.fillStyle = '#a87a48'; g.fillRect(0, y + rowH - 3 * big, W, 2 * big); g.fillStyle = '#d6a86c'; g.fillRect(0, y + rowH - 3 * big, W, big) }
    else { g.fillStyle = '#20232a'; g.fillRect(0, y, W, rowH); g.fillStyle = '#8e97a2'; g.fillRect(0, y + rowH - 1, W, 1) }
    for (let x = (row % 2) * 2 * big; x < W; x += 4 * big) {
      if (r() < 0.06) continue
      const band = x > W * 0.84
      const ph = r() * 6.28
      const upNow = !band && jump > 0 && r() < jump && Math.sin(t * 16 + ph) > -0.2
      const dy = upNow ? -2 * big : 0
      g.fillStyle = band ? c0 : r() < 0.7 ? cheer : r() < 0.6 ? c0 : '#d0d4dc'; g.fillRect(x, y + 2 * big + dy, 3 * big, 3 * big)
      g.fillStyle = band && row % 2 === 0 ? '#f0c14b' : SKN[Math.floor(r() * SKN.length)]; g.fillRect(x, y + dy, 3 * big, 2 * big)
      if (upNow) { g.fillStyle = SKN[1]; g.fillRect(x - big, y - 3 * big + dy, big, 3 * big); g.fillRect(x + 3 * big, y - 3 * big + dy, big, 3 * big) }
    }
  }
}
function bands(g, W, H) {
  const band = Math.round(H * 0.11)
  g.globalAlpha = 0.6; g.fillStyle = '#05070d'; g.fillRect(0, 0, W, band); g.fillRect(0, H - band, W, band); g.globalAlpha = 1
  g.fillStyle = '#E3B341'; g.fillRect(0, band, W, 2); g.fillRect(0, H - band - 2, W, 2)
}

// THE RUN-THROUGH. o: { team, kit, num, heroFn, mateFn }. The paper bulges, tears, and your
// school comes through. The banner shows the school's name only (BK 17:13).
export const RUNTHROUGH_SECONDS = 2.4
export function drawRunThrough(g, W, H, o, e, reduced) {
  const k0 = reduced ? 1 : Math.min(1, e / RUNTHROUGH_SECONDS)
  const burst = reduced ? 1 : Math.max(0, Math.min(1, (e - 0.7) / 0.5))
  const rr = rng(23)
  if (o.indoor) {
    // the high school gym: painted block wall, the lamps, wooden pull-out bleachers, the floor
    g.fillStyle = '#151b30'; g.fillRect(0, 0, W, H)
    ;['#151b30', '#1b2340', '#222c4d'].forEach((c, i) => { g.fillStyle = c; g.fillRect(0, Math.round(i * H * 0.08), W, Math.ceil(H * 0.08)) })
    for (let y = 6; y < H * 0.24; y += 7) { g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, y, W, 1) }
    for (const lx of [0.12, 0.37, 0.63, 0.88]) {
      const x = Math.round(W * lx)
      g.fillStyle = '#6b7385'; g.fillRect(x - 10, 0, 20, 3); g.fillStyle = '#fff3cf'; g.fillRect(x - 9, 3, 18, 1)
      if (!LITE.on) { g.globalAlpha = 0.1; for (let i = 0; i < 5; i++) { g.fillStyle = '#fff3cf'; g.fillRect(x - 12 - i * 3, 4 + i * 4, 24 + i * 6, 4) } g.globalAlpha = 1 }
    }
    const st = lum(o.team.colors[0]) < 0.12 ? shade(o.team.colors[1], -0.2) : o.team.colors[0]
    g.fillStyle = st; g.fillRect(0, Math.round(H * 0.2), W, 4)
  } else night(g, W, H, 5)
  stands(g, W, Math.round(H * 0.24), 8, o.team, 9, burst, e, 1, !!o.indoor)
  g.fillStyle = '#5b636e'; g.fillRect(0, Math.round(H * 0.415), W, 4)
  const ty = Math.round(H * 0.43)
  if (o.indoor) {
    for (let y = ty; y < H; y += 2) { g.fillStyle = ((y - ty) / 2) % 2 ? '#c58b50' : '#bf854a'; g.fillRect(0, y, W, 2); const off = ((y - ty) / 2) % 3 * 9; for (let x = off; x < W; x += 27) { g.fillStyle = '#a8733f'; g.fillRect(x, y, 1, 2) } }
  } else {
    g.fillStyle = '#8f3a2b'; g.fillRect(0, ty, W, 14)
    for (let y = ty + 2; y < ty + 14; y += 3) { g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(0, y, W, 1) }
    for (let y = ty + 14; y < H; y += 8) { g.fillStyle = ((y - ty) / 8) % 2 ? '#357F33' : '#3B8A38'; g.fillRect(0, y, W, 8) }
  }
  // the banner and its poles
  const bx0 = Math.round(W * 0.083), bx1 = Math.round(W * 0.917), by0 = Math.round(H * 0.363), by1 = Math.round(H * 0.874)
  g.fillStyle = '#7b828c'; g.fillRect(bx0 - 4, by0 - 10, 4, by1 - by0 + 40); g.fillRect(bx1, by0 - 10, 4, by1 - by0 + 40)
  const bulge = reduced ? 0 : Math.round(Math.sin(Math.min(1, e / 0.7) * Math.PI) * 3) * (burst ? 0 : 1)
  g.fillStyle = '#f3efe4'; g.fillRect(bx0, by0 - bulge, bx1 - bx0, by1 - by0 + bulge * 2)
  g.fillStyle = '#ddd6c4'; for (let x = bx0; x < bx1; x += 22) g.fillRect(x, by0, 1, by1 - by0)
  const [c0] = o.team.colors, edge = cheerColor(o.team)
  const word = String(o.team.name || '').toUpperCase()
  const kk = Math.max(3, Math.min(6, Math.floor(((bx1 - bx0) - 24) / (word.length * 6))))
  const ww = tw(word, kk)
  txtG(g, word, Math.round(W / 2 - ww / 2), by0 + 8, kk, Array(7).fill(c0), edge)
  for (let i = 0; i < 18; i++) { const x = Math.round(W / 2 - ww / 2 + rr() * ww); g.fillStyle = c0; g.fillRect(x, by0 + 8 + 7 * kk, 1, 2 + Math.floor(rr() * 5)) }
  // the hole: ragged, with paper flaps curling out
  const cx = Math.round(W * 0.512), cy = Math.round(H * 0.75)
  if (burst > 0) {
    const rx = 52 * burst + 4, ry = 44 * burst + 4
    g.fillStyle = '#0a0f08'; g.beginPath()
    for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 2, jj = 0.78 + rr() * 0.3; g.lineTo(cx + Math.cos(a) * rx * jj, cy + Math.sin(a) * ry * jj) }
    g.fill()
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * Math.PI * 2 + rr() * 0.2, x0 = cx + Math.cos(a) * rx * 0.85, y0 = cy + Math.sin(a) * ry * 0.85
      g.fillStyle = i % 2 ? '#e6e0d0' : '#f8f5ec'; g.beginPath()
      g.moveTo(x0 - Math.sin(a) * 7, y0 + Math.cos(a) * 7); g.lineTo(x0 + Math.sin(a) * 7, y0 - Math.cos(a) * 7); g.lineTo(x0 + Math.cos(a) * 14 * burst, y0 + Math.sin(a) * 14 * burst); g.fill()
    }
    const mate = o.mateFn && o.mateFn()
    if (mate) g.drawImage(mate, cx - 78, cy - mate.height + (o.mateDrop ?? 30))
    const hero = o.heroFn && o.heroFn()
    if (hero) {
      const push = reduced ? 0 : Math.round((1 - burst) * 30)
      g.drawImage(hero, Math.round(cx - hero.width / 2 + 12), Math.round(cy - hero.height * (o.heroLift ?? 0.3) + push))
    }
    // paper shreds and confetti in the school's colours
    const n = LITE.on ? 24 : 70
    for (let i = 0; i < n; i++) {
      const a = rr() * Math.PI * 2, d = (0.6 + rr() * 1.6) * rx * (0.6 + k0)
      const x = Math.round(cx + Math.cos(a) * d), y = Math.round(cy + Math.sin(a) * d * 0.8 + (reduced ? 0 : e * 8))
      g.fillStyle = i % 3 === 0 ? '#f3efe4' : i % 3 === 1 ? edge : shade(edge, 0.4)
      g.fillRect(x, y, i % 3 === 0 ? 4 : 2, i % 3 === 0 ? 3 : 2)
    }
  }
  bands(g, W, H)
}

// CAPTAINS AT MIDFIELD. o: { you: { kit, num }, them: { kit, num }, capFn(kit, face, num) }.
// Two captains face each other, the referee flips the coin. The coin toss question follows.
export const CAPTAINS_SECONDS = 2.2
export function drawCaptains(g, W, H, o, e, reduced) {
  night(g, W, H, 11, [0.18, 0.82])
  stands(g, W, Math.round(H * 0.24), 6, o.home, 13, 0, e)
  const ry = Math.round(H * 0.24) + 36
  g.fillStyle = '#5b636e'; g.fillRect(0, ry, W, 4)
  g.fillStyle = '#8f3a2b'; g.fillRect(0, ry + 4, W, 14)
  for (let y = ry + 6; y < ry + 18; y += 3) { g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(0, y, W, 1) }
  const fy = ry + 18
  for (let y = fy; y < H; y += 10) { g.fillStyle = ((y - fy) / 10) % 2 ? '#357F33' : '#3B8A38'; g.fillRect(0, y, W, 10) }
  g.fillStyle = 'rgba(255,255,255,.8)'; g.fillRect(Math.round(W / 2) - 1, fy, 2, H - fy)
  const gy = Math.round(H * 0.86)
  const a = o.capFn(o.you.kit, 1, o.you.num), b = o.capFn(o.them.kit, -1, o.them.num)
  const step = reduced ? 1 : Math.min(1, e / 0.6)
  if (a) g.drawImage(a, Math.round(W / 2 - 92 - (1 - step) * 40), gy - a.height)
  if (b) g.drawImage(b, Math.round(W / 2 + 92 - b.width + (1 - step) * 40), gy - b.height)
  // the referee in stripes, arm up for the flip
  const rx = Math.round(W / 2), s = 3
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(rx + x * s, gy + y * s, w * s, h * s) }
  R(-3, -2, 2, 2, '#18181e'); R(1, -2, 2, 2, '#18181e'); R(-3, -12, 2, 10, '#16161a'); R(1, -12, 2, 10, '#16161a')
  R(-4, -22, 8, 10, '#f2f2f2'); for (let i = -4; i < 4; i += 2) R(i, -22, 1, 10, '#141414')
  R(-1, -24, 3, 2, SKN[2]); R(-3, -30, 6, 6, SKN[2]); R(-3, -31, 6, 2, '#141414'); R(-3, -29, 7, 1, '#141414')
  R(4, -30, 2, 9, SKN[2]); R(-6, -21, 2, 8, SKN[2])
  // the coin: up, spinning (a still coin at the top under reduced motion)
  const t = reduced ? 0.5 : Math.min(1, Math.max(0, (e - 0.6) / 1.4))
  const cy = gy - 31 * s - Math.round(Math.sin(t * Math.PI) * 60)
  const wv = reduced ? 1 : Math.abs(Math.cos(e * 14))
  g.fillStyle = '#c9a24a'; g.fillRect(rx + 5 * s - Math.round(4 * wv), cy, Math.max(1, Math.round(8 * wv)), 8)
  g.fillStyle = '#f2d27a'; g.fillRect(rx + 5 * s - Math.round(2 * wv), cy + 2, Math.max(1, Math.round(4 * wv)), 4)
  bands(g, W, H)
}

// THE STUDENT SECTION on a touchdown: on their feet, arms up, confetti, the band playing.
export const STUDENTS_SECONDS = 1.8
export function drawStudents(g, W, H, o, e, reduced) {
  g.fillStyle = '#05070d'; g.fillRect(0, 0, W, H)
  night(g, W, Math.round(H * 0.5), 17, [0.3, 0.7])
  const y0 = Math.round(H * 0.2)
  stands(g, W, y0, Math.ceil((H * 0.9 - y0) / 12), o.team, 19, reduced ? 1 : 0.85, reduced ? 0.3 : e, 2)
  const r = rng(31), edge = cheerColor(o.team)
  const n = LITE.on ? 30 : 110
  for (let i = 0; i < n; i++) {
    const x = Math.floor(r() * W), sp = 20 + r() * 50
    const y = Math.floor((r() * H + (reduced ? 0 : e * sp)) % H)
    g.fillStyle = i % 3 === 0 ? edge : i % 3 === 1 ? o.team.colors[0] : '#f4f6fa'
    g.fillRect(x, y, 2, 2)
  }
  bands(g, W, H)
}
