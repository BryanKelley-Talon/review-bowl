// ============================================================
// THE HOME COURT — Review Bowl basketball's possession engine and its 16-bit gym.
//
// BK, 2026-10-31 18:25–18:38 (Out/josh-scope-2026-10-31-1832-review-bowl-basketball.md):
//   • inspiration: Bulls vs Blazers (1991, Genesis). Side-on court, the camera follows the ball,
//     close-up cut-ins on a dunk, a shot clock.
//   • "The basketball arena, the home court." The gym is the HOME team's gym: lane paint, the centre
//     circle, the baseline name and the wall stripe in the home team's colours, not the Arena's
//     navy and gold. The band at halftime wears the home colours too.
//   • a basketball emblem of our own drawing at centre court (no league's mark); the home team's
//     name on both baselines, in its colours, the way an end zone carries it.
//   • boys' and girls' basketball both offered (opts.girls); fake names only, as always.
//
// The same split as volleyball's court.js: this file draws the floor and runs possessions; the
// stoppages (tip-off, timeouts, quarter breaks, halftime, the last-trip big moment, the press
// conference) belong to HoopsMatch.jsx. The court never asks a question; it pauses and hands over.
// Every roll goes through hoopsRules.js, which scripts/test.mjs plays whole games with.
// Every word a student reads comes from sport.js (BB), and every one of them is PROPOSED.
//
// ENGINE PASS (2026-10-31): the art here is a working first pass, drawn to the Pixel Standard so it
// is playable and checkable. The art session refines the sprites, the centre emblem, the baseline
// lettering, the free-throw view from behind the shooter (Mode 7) and the gym flyover.
//
// Nothing here is stored or sent. The court forgets everything when the game ends.
// ============================================================
import { TEAMS as LEAGUE, apart } from './teams.js'
import { BB as W8 } from './sport.js'
import { BAND_SECONDS, RUNTHROUGH_SECONDS, drawBand, drawRunThrough } from './cutin.js'
import { HAIR, LITE, OUTC, Particles, SKIN, lum, rgb, rng, shade, tw, txt as ptxt, txtG as ptxtG } from './pixel.js'
import { cheerColor } from './campus.js'
import * as RU from './hoopsRules.js'

// The league's kits in the court's shape: jersey + trim (court.js's rule).
function trimOf(k) { return k.helmet && k.helmet !== k.jersey ? k.helmet : k.pants && k.pants !== k.jersey ? k.pants : '#F2F2F2' }
const TEAMS = LEAGUE.map(t => ({ id: t.id, name: t.name, abbr: t.abbr, c: t.colors, changeAgainst: t.changeAgainst,
  kit: { j: t.kit.jersey, t: trimOf(t.kit) }, alt: { j: t.alt.jersey, t: trimOf(t.alt) } }))
function kitFor(t, other) { return [t.kit, t.alt, { j: '#2B2F36', t: '#F2F2F2' }].filter((k, i) => !(i === 0 && (t.changeAgainst || []).includes(other.id))) }

// The ink that reads best on a painted colour, from the school's own colours first, then white or black.
// WCAG 2 contrast, from relative luminance (not the quick perceived brightness `lum` the sprites shade with).
const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
const relLum = h => { const [r, g, b] = rgb(h); return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b) }
export function contrast(a, b) { const la = relLum(a) + 0.05, lb = relLum(b) + 0.05; return Math.max(la, lb) / Math.min(la, lb) }
// BK 18:38 wants the name in the team's colours, so a school colour wins whenever it reads (4.5:1).
export function bestInk(bg, colors) {
  const own = colors.filter(c => c.toLowerCase() !== bg.toLowerCase() && contrast(bg, c) >= 4.5)
  if (own.length) return own.reduce((a, c) => (contrast(bg, c) > contrast(bg, a) ? c : a))
  return contrast(bg, '#FFFFFF') >= contrast(bg, '#111111') ? '#FFFFFF' : '#111111'
}
// What a home team paints its floor with: the lane and baseline in its first colour (a near-white
// first colour hands over to the second), and the centre circle in the other.
export function courtPaint(team) {
  const [c0, c1 = '#FFFFFF'] = team.colors
  const paint = lum(c0) > 0.85 ? c1 : c0
  const circle = paint === c0 ? (lum(c1) > 0.85 ? shade(c0, 0.35) : c1) : c0
  return { paint, circle, ink: bestInk(paint, team.colors) }
}

// Legal high school numbers (digits 0–5 only), so a jersey never shows a number the officials wouldn't allow.
const LEGAL = [0, 1, 2, 3, 4, 5, 10, 11, 12, 13, 14, 15, 20, 21, 22, 23, 24, 25, 30, 31, 32, 33, 34, 35, 40, 41, 42, 43, 44, 45, 50, 51, 52, 53, 54, 55]
// How long the baseline is in the floor texture (46 feet at 4 px a foot), less a little margin at each end.
export const BASELINE_PX = 46 * 4
// The lettering size a name gets on the baseline: 2 (big), 1 (small), or 0 (cut: it doesn't fit).
export const baselineFit = name => { const n = String(name).length; return n * 12 - 2 <= BASELINE_PX ? 2 : n * 6 - 1 <= BASELINE_PX ? 1 : 0 }
const ROLES = ['PG', 'SG', 'SF', 'PF', 'C']
const SHOOTER = { drive: 'SG', shooter: 'SF', post: 'PF' }

export function createHoops(canvas, opts = {}) {
// ───────────────────────── canvas + projection ─────────────────────────
// The Pixel Standard: 480×270, whole-number scaling, smoothing off. The court is a high school
// court, 84 by 50 feet, seen from the side and a little above (oblique, like the Genesis game):
// x runs baseline to baseline, y from the near sideline (0) to the far one (50), z is height.
// BK 19:44, the Bulls vs Blazers frame: a high, close camera; about 46 feet of floor across the screen.
const W = 480, H = 270, KX = 10.4, KY = 3.4, KZ = 9, Y0 = 245, SPR = 1, PERS = 0.0035
const SC = y => 1 - PERS * y                                // the far sideline sits a little smaller
const HALF = 42, MARGIN = 9, RIM = 36.75, RIMZ = 10, FTX = 23
const CAMMAX = HALF + MARGIN - W / 2 / KX
const PAR = 0.55                                           // the wall and stands slide at this share of the floor
const cv = canvas
const screenCtx = cv.getContext('2d')
let G = screenCtx
let camX = 0
const P = (x, y, z = 0) => [Math.round(W / 2 + (x - camX) * KX * SC(y)), Math.round(Y0 - y * KY - z * KZ)]
const R = (x, y, w, h, c) => { G.fillStyle = c; G.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)) }
const txt = (s, x, y, c, k = 1, sh) => ptxt(G, s, x, y, c, k, sh)
const txtG = (s, x, y, k, cols, out) => ptxtG(G, s, x, y, k, cols, out)
function L(x0, y0, x1, y1, c) { x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1)
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy; G.fillStyle = c
  for (let i = 0; i < 2000; i++) { G.fillRect(x0, y0, 1, 1); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx } if (e2 <= dx) { e += dx; y0 += sy } } }
function ell(cx, cy, rx, ry, c) { G.fillStyle = c; const n = Math.max(16, Math.round(rx * 4)); for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; G.fillRect(Math.round(cx + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry), 1, 1) } }
function disc(cx, cy, r, c) { G.fillStyle = c; for (let yy = -r; yy <= r; yy++) { const w = Math.round(Math.sqrt(r * r - yy * yy)); G.fillRect(Math.round(cx - w), Math.round(cy + yy), w * 2 + 1, 1) } }

const rand = (a = 0, b = 1) => a + Math.random() * (b - a)
const clamp = RU.clamp
const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
const AUTO = !!opts.auto
const CALLWIN = 2.4                                        // game seconds to make a call (the shot clock)

// ───────────────────────── state ─────────────────────────
const S = { phase: 'idle', ts: 1, paused: false, g: null, trip: 0, you: opts.you ?? 0, opp: opts.opp ?? 1,
  homeYou: opts.home !== 'them', girls: !!opts.girls, stats: {}, ostats: {}, oppStrength: 5, steady: !!opts.steady, readBoost: false,
  players: [], ball: { x: 0, y: 25, z: 0, f: null, held: null, dribble: false, trail: [] }, pops: [], cele: null, band: null, film: null,
  q: 3, play: null, guess: null, aiCall: null, readAt: Infinity, callEnd: 0, contactAt: 0, win: null, grade: null, contest: null, box: null,
  shooter: null, chances: 0, bench: null, netSnap: 0, boardShake: 0, rimBend: 0, ref: null, meter: null, ft: null, tutorial: null, bigAsked: -1, cheerUntil: 0, kits: null, shake: 0 }
let gt = 0, rt = 0, timers = []
const after = (t, fn) => timers.push({ at: gt + t, fn })
// A possession's own timers: anything left over from a trip that has ended does nothing.
const later = (t, fn) => { const trip = S.trip; after(t, () => { if (S.trip === trip) fn() }) }

function setStats(v, oppStrength) { S.stats = RU.bbStats(v); S.oppStrength = clamp(oppStrength ?? 5, 1, 10); S.ostats = RU.oppStats(S.oppStrength) }
const home = () => TEAMS[S.homeYou ? S.you : S.opp]
const away = () => TEAMS[S.homeYou ? S.opp : S.you]
// Side 0 is the student's team. It attacks the right-hand basket in the first half, the left after.
const dirOf = side => (side === 0 ? 1 : -1) * (S.g && S.g.period >= 3 ? -1 : 1)

// ───────────────────────── players ─────────────────────────
function makeSide(side, r) {
  const mine = side === 0 ? (opts.numbers || {}) : {}
  const used = new Set(Object.values(mine))
  const pool = LEGAL.filter(n => !used.has(n)).sort(() => r() - 0.5)
  let pi = 0
  return ROLES.map(role => ({ role, side, x: 0, y: 25, z: 0, tx: 0, ty: 25, pose: 'ready', poseUntil: 0, jump: null, face: 1,
    skin: SKIN[Math.floor(r() * SKIN.length)], hair: HAIR[Math.floor(r() * HAIR.length)],
    hairStyle: (S.girls ? ['pony', 'bun', 'braids', 'pony', 'puffs', 'short'] : ['short', 'fade', 'afro', 'braids', 'buzz', 'fade'])[Math.floor(r() * 6)],
    band: r() < 0.25, sleeve: r() < 0.22 ? (r() < 0.5 ? '#f2f2f2' : '#1a1a1e') : null, num: mine[role] ?? pool[pi++] }))
}
const side = s => S.players.filter(p => p.side === s)
const roleOf = (s, ro) => S.players.find(p => p.side === s && p.role === ro)
const OFF = { PG: [24, 25], SG: [17, 8], SF: [15, 42], PF: [6, 18], C: [6, 32] }  // feet from the rim, then depth
function spot(ro, d) { return { x: d * (RIM - OFF[ro][0]), y: OFF[ro][1] } }
function pose(p, ps, dur = 0.5) { p.pose = ps; p.poseUntil = gt + dur }
function jump(p, h, dur) { p.jump = { t0: gt, h, dur } }
// Defenders sit between their player and the rim they protect.
function guardSpots(offSide) {
  const d = dirOf(offSide), rx = d * RIM
  for (const p of side(1 - offSide)) {
    const m = roleOf(offSide, p.role)
    if (!m || p.jump || p.locked) continue
    p.tx = m.tx + (rx - m.tx) * 0.28; p.ty = m.ty + (25 - m.ty) * 0.28; p.face = -d
  }
}

// ───────────────────────── ball ─────────────────────────
function fly(from, to, dur, apex, onEnd) { const b = S.ball; b.held = null; b.dribble = false; b.f = { from: { ...from }, to: { ...to }, t0: gt, dur, apex, onEnd }; b.x = from.x; b.y = from.y; b.z = from.z }
function ballStep() {
  const b = S.ball
  if (b.held) {
    const p = b.held
    // the dribble: the ball goes floor to hand, and the hand pose follows it (drawPlayer reads dribUp)
    if (b.dribble) { const u = Math.abs(Math.cos(gt * 7.5)); b.x = p.x + p.face * 1.15; b.y = p.y - 0.3; b.z = 0.3 + (2.9 + p.z - 0.3) * u; p.dribUp = u > 0.55 }
    else { const h = handOf(p); b.x = h.x; b.y = h.y; b.z = h.z }
    return
  }
  const f = b.f; if (!f) return
  const u = clamp((gt - f.t0) / f.dur, 0, 1)
  b.x = f.from.x + (f.to.x - f.from.x) * u; b.y = f.from.y + (f.to.y - f.from.y) * u
  b.z = Math.max(0, f.from.z + (f.to.z - f.from.z) * u + 4 * f.apex * u * (1 - u))
  if (u >= 1) { b.f = null; f.onEnd && f.onEnd() }
}
const rimPt = d => ({ x: d * RIM, y: 25, z: RIMZ + 0.2 })

// ───────────────────────── UI ─────────────────────────
let callFns = [], lastUI = { text: '', buttons: [] }
function ui(text, buttons = []) { callFns = buttons.map(b => (b.disabled ? null : b.fn)); lastUI = { text, buttons }; opts.onUI && opts.onUI(lastUI) }
function timeoutBtn() { const n = S.g ? S.g.timeouts : 0; return { label: W8.timeout(n), key: 'T', timeout: true, disabled: n <= 0, why: W8.noTimeouts, fn: askTimeout } }
function pop(text, x, y, z = 1) { const n = S.pops.filter(q => rt - q.t0 < 0.9).length; S.pops.push({ text, x, y, z, t0: rt, lift: n * 9 }) }
const CORE = ['call', 'shoot', 'guard', 'contest']
function coach(key) { const T = S.tutorial; if (!T || T.seen[key]) return; T.seen[key] = true; T.queue.push(key)
  if (!S.paused) { S.paused = true; opts.onCoach && opts.onCoach(T.queue[0]) } }
function coachDone(skip) { const T = S.tutorial; if (!T) return
  if (skip) { S.tutorial = null; S.paused = false; opts.onCoach && opts.onCoach(null); const n = S.afterCoach; S.afterCoach = null; n && n(); return }
  T.queue.shift(); if (T.queue.length) { opts.onCoach && opts.onCoach(T.queue[0]); return }
  S.paused = false; opts.onCoach && opts.onCoach(null)
  if (T.wrapShown) { S.tutorial = null; const n = S.afterCoach; S.afterCoach = null; n && n() } }
function coachWrap() { const T = S.tutorial; if (!T || T.wrapShown || !CORE.every(k => T.seen[k])) return false
  T.wrapShown = true; T.queue.push('wrap'); S.paused = true; opts.onCoach && opts.onCoach('wrap'); return true }

// ───────────────────────── the game ─────────────────────────
function startGame(tipWinner, tutorial) {
  S.g = RU.newHoopsGame(tipWinner)
  S.tutorial = tutorial ? { seen: {}, queue: [], wrapShown: false } : null
  S.bigAsked = -1; S.paused = false
  startPossession()
}
function report() { const g = S.g; opts.onScore && opts.onScore({ score: [...g.score], period: g.period, periodName: RU.periodName(g), clock: RU.clockText(g), timeouts: g.timeouts }) }
function startPossession() {
  const g = S.g; S.trip++
  if (RU.isBigMoment(g) && S.bigAsked !== g.period && opts.beforePossession) {
    S.bigAsked = g.period; S.paused = true
    opts.beforePossession({ who: g.offense === 0 ? 'you' : 'them', ot: RU.isOT(g) }, () => { S.paused = false; bringUp() })
    return
  }
  bringUp()
}
function bringUp() {
  const g = S.g, off = g.offense, d = dirOf(off)
  S.chances = 0; S.play = null; S.guess = null; S.readAt = Infinity; S.grade = null; S.contest = null; S.box = null; S.meter = null; S.ft = null
  S.ts = 1; S.ball.f = null
  for (const p of S.players) { p.jump = null; p.z = 0; p.pose = 'ready'; p.locked = false }
  // the offense comes up from its own end, the defense is already back
  for (const p of side(off)) { const s = spot(p.role, d); p.x = -d * rand(4, 16); p.y = clamp(s.y + rand(-4, 4), 4, 46); p.tx = s.x; p.ty = s.y; p.face = d }
  const pg = roleOf(off, 'PG'); pg.x = -d * 18; pg.y = 25
  for (const p of side(1 - off)) { const s = spot(p.role, d); p.x = s.x + d * 4; p.y = s.y; p.face = -d }
  guardSpots(off)
  S.ball.held = pg; S.ball.dribble = true
  S.phase = 'bringUp'
  ui(off === 0 ? W8.bringUp : W8.theyBringUp, [timeoutBtn()])
  report()
  later(1.6, () => (off === 0 ? callPlay(false) : guardPlay(false)))
}

// Your ball: call the play before the shot clock runs out.
function callPlay(second) {
  S.q = second ? Math.min(S.q, 2) : RU.entryQuality(S.stats.Passing, S.ostats.Defense, Math.random())
  const open = RU.openPlays(S.q)
  S.phase = 'callPlay'; S.ts = AUTO ? 1 : 0.45; S.callEnd = gt + CALLWIN
  const lbl = W8.playLabels
  ui(S.q === 3 ? W8.callPlay : S.q === 2 ? W8.callPlayPost : W8.pressure,
    [...RU.PLAYS.map((pl, i) => ({ label: lbl[pl], key: String(i + 1), disabled: !open.includes(pl), why: W8.needsEntry, fn: () => choosePlay(pl) })), timeoutBtn()])
  coach('call')
  later(CALLWIN, () => { if (S.phase !== 'callPlay') return; const pg = roleOf(0, 'PG'); pop(W8.pop.shotClock, pg.x, pg.y, 6); ui(W8.shotClock, []); runPlay(0, 'shooter', true) })
  if (AUTO) later(0.5, () => { if (S.phase === 'callPlay') choosePlay(open[Math.floor(Math.random() * open.length)]) })
}
function choosePlay(pl) { if (S.phase !== 'callPlay' || S.paused) return; ui(W8.playTo(pl), []); runPlay(0, pl, false) }

// Their ball: guess the play. The read shows above their point guard, earlier with more Defense.
function guardPlay(second) {
  S.q = second ? Math.min(S.q, 2) : RU.entryQuality(S.ostats.Passing, S.stats.Defense, Math.random())
  S.aiCall = RU.aiPlay(S.q, Math.random()); S.guess = null
  S.phase = 'guard'; S.ts = AUTO ? 1 : 0.45; S.callEnd = gt + CALLWIN
  const lead = Math.min(CALLWIN - 0.2, RU.readLead(S.stats.Defense, S.readBoost))
  S.readAt = S.callEnd - lead
  const lbl = W8.guardLabels
  ui(W8.guardCall, [...RU.PLAYS.map((pl, i) => ({ label: lbl[pl], key: String(i + 1), fn: () => { if (S.phase !== 'guard') return; S.guess = pl; ui(W8.guarding(pl), []) } })), timeoutBtn()])
  coach('guard')
  if (AUTO) later(CALLWIN - lead + 0.1, () => { if (!S.guess) S.guess = Math.random() < 0.6 ? S.aiCall : 'drive' })
  later(CALLWIN, () => { if (S.phase === 'guard') { S.readAt = Infinity; runPlay(1, S.aiCall, false) } })
}

// The play runs: the entry pass, the turnover check, then the shot.
function runPlay(off, play, forced) {
  const d = dirOf(off), O = off === 0 ? S.stats : S.ostats, D = off === 0 ? S.ostats : S.stats
  S.phase = 'play'; S.ts = 1; S.play = play; S.forced = forced
  S.guessed = off === 0 ? (!forced && RU.aiGuessRight(S.oppStrength, Math.random())) : S.guess === play
  const sh = roleOf(off, forced ? 'PG' : SHOOTER[play]), pg = roleOf(off, 'PG')
  S.shooter = sh
  const tov = !forced && Math.random() < RU.turnoverChance({ handling: O.Handling, def: D.Defense, guessed: S.guessed, play })
  // the defender who read it jumps the lane
  const mark = roleOf(1 - off, sh.role)
  if (S.guessed && mark) { mark.tx = sh.x + (d * RIM - sh.x) * 0.15; mark.ty = sh.y }
  if (sh === pg) { tov ? steal(off, mark) : shotSetup(off, play, d, O, D); return }
  pose(pg, 'bump', 0.4)
  const from = handOf(pg), to = { x: sh.x, y: sh.y, z: 3.4 }
  if (tov) { const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2, z: 3 }; if (mark) { mark.tx = mid.x; mark.ty = mid.y }
    fly(from, mid, 0.35, 0.4, () => steal(off, mark)); return }
  fly(from, to, 0.4, 0.5, () => { S.ball.held = sh; shotSetup(off, play, d, O, D) })
}
function steal(off, by) {
  const p = by || side(1 - off)[0]
  pop(W8.pop.steal, S.ball.x, S.ball.y, 4); S.ball.f = null; S.ball.held = p; S.ball.dribble = true; pose(p, 'bump', 0.4)
  endTrip(off, 0)
}
// Each play goes to its spot; the ring closes on the release (a drive: on the takeoff).
function shotSetup(off, play, d, O, D) {
  const sh = S.shooter
  const windup = play === 'drive' ? 0.95 : play === 'post' ? 0.85 : 0.7
  if (play === 'drive') { sh.tx = d * (RIM - 4.8); sh.ty = 25 + (sh.y < 25 ? -2.5 : 2.5); S.ball.dribble = true }
  else if (play === 'post') { sh.tx = d * (RIM - 4.5); sh.ty = sh.y; S.ball.dribble = true; later(windup - 0.3, () => { S.ball.dribble = false; pose(sh, 'shootLoad', 0.4) }) }
  else { S.ball.dribble = false; later(windup - 0.6, () => pose(sh, 'shootLoad', 0.3)); later(windup - 0.3, () => { jump(sh, 0.75, 0.75); pose(sh, 'set', 0.8) }) }
  const mark = roleOf(1 - off, sh.role)
  if (mark) { mark.locked = true; later(windup - 0.2, () => { jump(mark, 1.0, 0.7); pose(mark, 'block', 0.75) }) }
  S.contactAt = gt + windup
  if (off === 0) {
    if (S.forced) { S.phase = 'play'; later(windup, () => release(off, 'off')); return }
    S.win = RU.shotWindow(play, S.stats, { steady: S.steady, boost: S.readBoost })
    S.phase = 'shoot'; S.ts = AUTO ? 1 : 0.6; S.grade = null
    ui(W8.shootCall, []); coach('shoot')
    later(windup + S.win.ok, () => { if (S.phase === 'shoot') { pop(W8.pop.late, sh.x, sh.y, 8); release(off, 'off') } })
    if (AUTO) later(windup + rand(-0.06, 0.06), shootTap)
  } else {
    S.win = RU.contestWindow(S.stats.Defense, { steady: S.steady, boost: S.readBoost })
    S.phase = 'contest'; S.ts = AUTO ? 1 : 0.6; S.contest = null
    ui(W8.contestCall, []); coach('contest')
    later(windup, () => { if (S.phase === 'contest') S.phase = 'contestLate' })
    later(windup + S.win.ok, () => release(off, RU.aiGrade(S.ostats[RU.FINISH_STAT[play]], Math.random())))
    if (AUTO) later(windup + rand(-0.08, 0.08), contestTap)
  }
}
function shootTap() {
  if (S.phase !== 'shoot') return
  const err = gt - S.contactAt; if (err < -0.5) return
  const g = RU.gradeOf(err, S.win)
  pop(g === 'perfect' ? W8.pop.perfect : g === 'good' ? W8.pop.good : err < 0 ? W8.pop.early : W8.pop.late, S.ball.x, S.ball.y, S.ball.z + 1.5)
  release(0, g)
}
function contestTap() {
  if (S.phase !== 'contest' && S.phase !== 'contestLate') return
  if (S.contest) return
  const err = gt - S.contactAt, sh = S.shooter
  if (err < -0.45) { S.contest = 'early'; pop(W8.pop.reach, sh.x, sh.y, 7) }
  else { S.contest = RU.gradeOf(err, S.win); pop(S.contest === 'perfect' ? W8.pop.perfect : S.contest === 'good' ? W8.pop.good : err < 0 ? W8.pop.early : W8.pop.late, sh.x, sh.y, 7) }
}
// The ball leaves the shooter's hands: foul, make or miss, all from hoopsRules. A perfect drive that
// goes in is a dunk (the computer's perfect drives dunk most of the time too).
function release(off, grade) {
  if (!['shoot', 'play', 'contest', 'contestLate'].includes(S.phase)) return
  const d = dirOf(off), O = off === 0 ? S.stats : S.ostats, D = off === 0 ? S.ostats : S.stats, play = S.play
  const contest = off === 0 ? (S.guessed ? RU.aiGrade(S.oppStrength, Math.random()) : 'none') : (S.contest || 'none')
  S.phase = 'flight'; S.ts = 1; ui(off === 0 ? '' : W8.theyShoot, [])
  const foul = Math.random() < RU.foulChance({ play, contest })
  const made = Math.random() < RU.makeChance({ play, grade, off: O, def: D, guessed: S.guessed, contest })
  const sh = S.shooter, rim = rimPt(d)
  const dunk = play === 'drive' && made && grade === 'perfect' && (off === 0 || Math.random() < 0.6)
  if (foul) { pop(W8.pop.foul, sh.x, sh.y, 9); refSignal('foul') }
  const finish = isDunk => {
    S.netSnap = Math.max(S.netSnap, 0.7)
    const pts = RU.POINTS[play]
    pop(play === 'shooter' ? W8.pop.swish : W8.pop.bucket, rim.x, 25, 13)
    if (!foul) refSignal(play === 'shooter' ? 'three' : 'two')
    const word = foul ? W8.cele.andOne : isDunk ? W8.cele.dunk : play === 'shooter' ? W8.cele.three : null
    const then = () => (foul ? freeThrows(off, RU.ftCount(play, true), pts) : endTrip(off, pts))
    const go = () => { if (off === 0 && word) { S.cheerUntil = rt + 1.8; celebrate(word, play === 'shooter' ? 'release' : 'layup', then, isDunk) } else later(0.5, then) }
    if (isDunk) later(0.6, go); else go()
  }
  const shoot = () => {
    const from = handOf(sh), dist = Math.hypot(d * RIM - sh.x, 25 - sh.y)
    fly(from, made ? rim : { x: rim.x - d * rand(0.3, 0.9), y: rim.y + rand(-0.8, 0.8), z: rim.z + 0.4 }, clamp(0.4 + dist * 0.025, 0.42, 0.95), clamp(dist * 0.12, 0.8, 3.2), () => {
      if (made) { fly({ ...S.ball }, { x: rim.x, y: 25, z: 0.4 }, 0.35, 0, null); finish(false); return }
      pop(W8.pop.miss, rim.x, 25, 14)
      if (foul) { later(0.4, () => freeThrows(off, RU.ftCount(play, false), 0)); return }
      rebound(off)
    })
  }
  if (dunk) { dunkSeq(sh, d, () => finish(true)); return }
  if (play === 'drive') { S.ball.dribble = false; sh.tx = d * (RIM - 3); jump(sh, 1.15, 0.75); pose(sh, 'layup', 0.8); later(0.3, shoot); return }
  if (play === 'post') { jump(sh, 0.7, 0.6); pose(sh, 'layup', 0.7); later(0.22, shoot); return }
  pose(sh, 'release', 0.5); shoot()
}
// ── the rebound: both sides box out, and the student taps for the student's team either way ──
function rebound(off) {
  const d = dirOf(off), rim = rimPt(d)
  const land = { x: d * (RIM - rand(2, 9)), y: 25 + rand(-9, 9), z: 0 }
  S.phase = 'rebound'; S.ts = AUTO ? 1 : 0.6; S.box = null
  const v = S.stats.Rebounding, k = (S.steady ? 1.9 : 1) * (S.readBoost ? 1.3 : 1)
  S.win = { perfect: (0.06 + v * 0.006) * k, ok: (0.14 + v * 0.012) * k }
  S.land = land; S.contactAt = gt + 0.75
  for (const s of [0, 1]) { const big = roleOf(s, s === off ? 'PF' : 'C'); big.tx = land.x + rand(-1, 1); big.ty = land.y + (s === off ? -1.2 : 1.2); big.face = Math.sign(d * RIM - big.x) || d; pose(big, 'boxout', 0.8) }
  ui(W8.reboundCall, []); coach('rebound')
  fly({ ...S.ball }, { ...land, z: 4.5 }, 0.75, 1.6, null)
  later(0.75 + S.win.ok, () => { if (S.phase === 'rebound') resolveBoard(off) })
  if (AUTO) later(0.75 + rand(-0.08, 0.08), boxTap)
}
function boxTap() { if (S.phase !== 'rebound' || S.box) return; const err = gt - S.contactAt; if (err < -0.5) return
  S.box = RU.gradeOf(err, S.win); pop(S.box === 'perfect' ? W8.pop.perfect : S.box === 'good' ? W8.pop.good : err < 0 ? W8.pop.early : W8.pop.late, S.land.x, S.land.y, 7) }
function resolveBoard(off) {
  const O = off === 0 ? S.stats : S.ostats, D = off === 0 ? S.ostats : S.stats
  const p = RU.offRebChance({ offReb: O.Rebounding, defReb: D.Rebounding, box: S.box || 'none', studentOnOffense: off === 0 })
  const keep = S.chances < RU.HOOPS.maxSecondChances && Math.random() < p
  const who = keep ? roleOf(off, 'PF') : roleOf(1 - off, 'C')
  who.x = S.land.x; who.y = S.land.y; jump(who, 0.8, 0.55); pose(who, 'block', 0.6)
  S.ball.f = null; S.ball.held = who; S.ball.dribble = false
  if (!keep) { pop(W8.pop.board, S.land.x, S.land.y, 8); endTrip(off, 0); return }
  S.chances++
  pop(W8.pop.second, S.land.x, S.land.y, 8)
  S.phase = 'play'
  later(0.7, () => {
    // the ball goes back out to the point; the floor resets
    const d = dirOf(off), pg = roleOf(off, 'PG')
    for (const p of side(off)) { const s = spot(p.role, d); p.tx = s.x; p.ty = s.y }
    guardSpots(off)
    fly(handOf(who), handOf(pg), 0.4, 0.4, () => { S.ball.held = pg; S.ball.dribble = true; for (const p of S.players) p.locked = false; later(0.5, () => (off === 0 ? callPlay(true) : guardPlay(true))) })
  })
}

// ── free throws: the meter for your shooter, the computer's percentage for theirs ──
function freeThrows(off, n, ptsSoFar) {
  const d = dirOf(off), sh = S.shooter
  S.ft = { off, n, i: 0, pts: ptsSoFar }
  for (const p of S.players) { p.jump = null; p.z = 0; p.pose = 'ready'; p.locked = false }
  sh.x = sh.tx = d * (FTX - 0.8); sh.y = sh.ty = 25; sh.face = d
  const lane = [[RIM - 7, 17.5], [RIM - 7, 32.5], [RIM - 10, 17.5], [RIM - 10, 32.5]]
  let li = 0
  for (const p of S.players) { if (p === sh) continue; if (li < 4) { const [x, y] = lane[li++]; p.x = p.tx = d * x; p.y = p.ty = y } else { p.x = p.tx = d * (RIM - 22); p.y = p.ty = 12 + li * 6; li++ } p.face = d }
  S.ball.f = null; S.ball.held = sh; S.ball.dribble = false
  coach('ft')
  later(0.5, nextFt)
}
function nextFt() {
  const F = S.ft; if (!F) return
  if (F.i >= F.n) { const pts = F.pts; S.ft = null; endTrip(F.off, pts); return }
  F.i++
  if (F.off === 0) {
    S.phase = 'ftMeter'; S.ts = 1; S.meter = { t0: gt, green: RU.ftGreen(S.stats.FreeThrows, S.steady) }; pose(S.shooter, 'shootLoad', 30)
    ui(W8.ftCall(F.i, F.n), [])
    if (AUTO) later(0.6 + Math.random() * 0.5, ftTap)
  } else {
    S.phase = 'ftAI'; ui(W8.theirFt, [])
    later(0.9, () => ftShot(Math.random() < RU.aiFtChance(S.ostats.FreeThrows)))
  }
}
function meterPos() { return 0.5 + 0.5 * Math.sin((gt - S.meter.t0) * Math.PI * 2 / 1.3 - Math.PI / 2) }
function ftTap() { if (S.phase !== 'ftMeter' || !S.meter) return
  const dd = Math.abs(meterPos() - 0.5), made = Math.random() < RU.ftChance(dd, S.meter.green)
  S.meter = null; ftShot(made) }
function ftShot(made) {
  const F = S.ft, d = dirOf(F.off), sh = S.shooter, rim = rimPt(d)
  S.phase = 'ftFlight'; pose(sh, 'release', 0.6)
  fly(handOf(sh), made ? rim : { x: rim.x - d * 0.7, y: 25 + rand(-0.6, 0.6), z: rim.z + 0.3 }, 0.75, 2.2, () => {
    if (made) { F.pts++; S.netSnap = 0.6; fly({ ...S.ball }, { x: rim.x, y: 25, z: 0.4 }, 0.3, 0, null); pop(W8.pop.ftGood, rim.x, 25, 13) }
    else { pop(W8.pop.ftMiss, rim.x, 25, 12); fly({ ...S.ball }, { x: rim.x - d * 3, y: 25 + rand(-4, 4), z: 0 }, 0.4, 0.6, null) }
    later(0.6, () => { S.ball.f = null; S.ball.held = sh; nextFt() })
  })
}

// ── a trip ends ──
function endTrip(off, pts) {
  const g = S.g
  S.phase = 'point'; S.ts = 1; S.readAt = Infinity
  const res = RU.endPossession(g, off, pts)
  if (pts > 0 && off === 0) S.cheerUntil = Math.max(S.cheerUntil, rt + 1.2)
  ui(pts > 0 ? W8.scored(TEAMS[off === 0 ? S.you : S.opp].abbr, pts, g.score[0], g.score[1]) : off === 0 ? W8.theirBall : W8.yourBall, [])
  report()
  const next = () => {
    S.readBoost = false
    if (coachWrap()) { S.afterCoach = next; return }
    if (res === 'final') { S.phase = 'over'; opts.onGameEnd && opts.onGameEnd({ score: [...g.score], period: g.period }); return }
    if (res === 'half' || res === 'period') { S.phase = 'between'; S.paused = true; opts.onPeriodEnd && opts.onPeriodEnd({ period: g.period, score: [...g.score], half: res === 'half' }); return }
    startPossession()
  }
  later(1.0, next)
}
function celebrate(word, heroPose, then, dunk = false) { S.cele = { word, heroPose, dunk, t0: rt, dur: reduced ? 1.2 : dunk ? 2.0 : 1.6, then } }
function askTimeout() {
  if (S.paused || !S.g || S.g.timeouts <= 0 || !['bringUp', 'callPlay', 'guard'].includes(S.phase)) return
  S.paused = true; opts.onTimeout && opts.onTimeout()
}
function timeoutTaken(read) {
  S.g.timeouts = Math.max(0, S.g.timeouts - 1); if (read) S.readBoost = true; S.paused = false
  // the call bar comes back with the count updated
  if (S.phase === 'callPlay' || S.phase === 'guard') { const b = lastUI.buttons.map(x => (x.timeout ? timeoutBtn() : x)); ui(lastUI.text, b) }
  else if (S.phase === 'bringUp') ui(lastUI.text, [timeoutBtn()])
  report()
}

// ───────────────────────── input ─────────────────────────
function tap() {
  if (S.cele) { S.cele.dur = 0; return }
  if (S.phase === 'shoot') shootTap()
  else if (S.phase === 'contest' || S.phase === 'contestLate') contestTap()
  else if (S.phase === 'rebound') boxTap()
  else if (S.phase === 'ftMeter') ftTap()
}
const endBand = () => { const b = S.band; S.band = null; b && b.then && b.then() }
let filmQ = []
function showFilm(f) { f.t0 = rt; if (S.film) filmQ.push(f); else S.film = f }
function endFilm() { const f = S.film; S.film = null; const n = filmQ.shift(); if (n) { n.t0 = rt; S.film = n } f && f.then && f.then() }
const onDown = e => { if (S.film) { endFilm(); return } if (S.band) { endBand(); return } if (S.paused) return; e.preventDefault && e.preventDefault(); tap() }
cv.addEventListener('pointerdown', onDown)
const onKey = e => {
  if ((S.film || S.band) && [' ', 'Enter', 'Escape'].includes(e.key)) { e.preventDefault(); S.film ? endFilm() : endBand(); return }
  if (S.paused || S.phase === 'idle' || (opts.blocked && opts.blocked())) return
  const tg = document.activeElement && document.activeElement.tagName; if (tg === 'INPUT' || tg === 'TEXTAREA') return
  const k = e.key
  if (k === ' ' || k === 'Enter') { if (tg === 'BUTTON') return; e.preventDefault(); tap(); return }
  if (['1', '2', '3'].includes(k)) { const f = callFns[+k - 1]; if (f) f(); return }
  if (k === 't' || k === 'T') askTimeout()
}
addEventListener('keydown', onKey)

// ───────────────────────── 16-bit art ─────────────────────────
// THE LOOK (BK 2026-10-31 19:44, with a Bulls vs Blazers frame: "This is the look for all of it that I
// want! Clock placement too."): a high, close camera on a flat maple floor with black lines and a
// painted lane; a dense crowd up top, the benches, the coaches and the scorer's table along the far
// sideline; tall, lean players; the scoreboard top right with the game clock in the middle; the shot
// clock in its own box at the bottom, under the near sideline. Original art only, no marks.
//
// The floor is painted once, top down, into a texture; each frame draws it row by row with the
// perspective scale for that row (a Mode 7 floor, the Pixel Standard's own tool). The crowd strip
// slides at PAR of the floor's speed; everything else is drawn in court feet through P().
const TXK = KX, TYK = 4, TEX_X0 = HALF + MARGIN, TEX_Y0 = 54, TEX_Y1 = -9
const TEX_W = Math.ceil(2 * TEX_X0 * TXK), TEX_H = Math.ceil((TEX_Y0 - TEX_Y1) * TYK)
const tex = document.createElement('canvas'); tex.width = TEX_W; tex.height = TEX_H
const Tp = (x, y) => [(x + TEX_X0) * TXK, (TEX_Y0 - y) * TYK]     // court feet → texture px
const FAR = Y0 - TEX_Y0 * KY                                        // the top of the floor on screen
const CROWD_H = 36, CROWD_W = Math.ceil(W + 2 * CAMMAX * KX * PAR + 8), CX0 = (CROWD_W - W) / 2
const crowdCv = document.createElement('canvas'); crowdCv.width = CROWD_W; crowdCv.height = Math.ceil(FAR)
let crowd = []
function dith(x, y, w, h, c) { G.fillStyle = c; for (let yy = y; yy < y + h; yy++) for (let xx = x + (yy & 1); xx < x + w; xx += 2) G.fillRect(xx, yy, 1, 1) }
function buildCrowd() {
  const r = rng(S.you * 13 + S.opp * 3 + 5); crowd = []
  const hc = home().c, ac = away().c, cheer = cheerColor(LEAGUE[S.homeYou ? S.you : S.opp])
  const rowsN = 7, rowH = CROWD_H / rowsN
  for (let row = 0; row < rowsN; row++) for (let x = 2 + (row % 2) * 2; x < CROWD_W - 3; x += 4) {
    if (r() < 0.05) continue
    const pick = r()
    const f = { x: x + Math.floor(r() * 2), y: Math.round(4 + row * rowH), skin: SKIN[Math.floor(r() * SKIN.length)], hair: HAIR[Math.floor(r() * HAIR.length)],
      shirt: pick < 0.5 ? hc[Math.floor(r() * hc.length)] : pick < 0.72 ? ac[Math.floor(r() * ac.length)] : ['#d9dde4', '#6b7280', '#2f3b55', '#9b3a2c', '#3d6b4a', '#c9a227', '#5d4a8a'][Math.floor(r() * 7)],
      ph: r() * 6.28, home: pick < 0.5 }
    if (x > CROWD_W * 0.42 && x < CROWD_W * 0.58 && row < 4) { f.shirt = r() < 0.8 ? cheer : hc[0]; f.home = true; f.student = true }
    crowd.push(f)
  }
}
// the arena behind the crowd: dark, a few lamps, the home stripe under the seats
function buildWall() {
  const save = G; G = crowdCv.getContext('2d'); G.clearRect(0, 0, CROWD_W, crowdCv.height)
  R(0, 0, CROWD_W, crowdCv.height, '#141826')
  for (let y = 0; y < CROWD_H + 4; y += 5) R(0, y + 3, CROWD_W, 2, '#1d2334')
  const hm = home(), st = lum(hm.c[0]) < 0.12 ? hm.c[1] : hm.c[0]
  R(0, CROWD_H + 2, CROWD_W, 3, st); R(0, CROWD_H + 2, CROWD_W, 1, shade(st, 0.3))
  R(0, CROWD_H + 5, CROWD_W, crowdCv.height - CROWD_H - 5, '#3a2a1c'); dith(0, CROWD_H + 5, CROWD_W, 2, '#2a1e14')
  G = save
}
function drawCrowd(ox) {
  const cheer = rt < S.cheerUntil && !reduced && !LITE.on
  for (const f of crowd) {
    const x = f.x - ox; if (x < -4 || x > W + 4) continue
    const up = cheer && f.home && (f.student || Math.sin(rt * 18 + f.ph) > 0), dy = up ? -2 : 0, y = f.y + dy
    R(x - 1, y + 3, 4, 3, f.shirt); R(x, y, 2, 3, f.skin); R(x, y, 2, 1, f.hair)
    if (up) { R(x - 2, y - 1, 1, 3, f.skin); R(x + 3, y - 1, 1, 3, f.skin) }
  }
}

// ── the floor, painted top down ──
function tPoly(pts, c) { G.fillStyle = c; G.beginPath(); pts.forEach(([x, y], i) => { const [a, b] = Tp(x, y); i ? G.lineTo(a, b) : G.moveTo(a, b) }); G.closePath(); G.fill() }
function tRect(x0, y0, x1, y1, c) { tPoly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], c) }
function tLine(x0, y0, x1, y1, c, w = 2) { G.strokeStyle = c; G.lineWidth = w; G.beginPath(); const [a, b] = Tp(x0, y0), [e, f] = Tp(x1, y1); G.moveTo(a, b); G.lineTo(e, f); G.stroke() }
function tArc(cx, cy, r, a0, a1, c, fill, w = 2) {
  G.beginPath(); for (let i = 0; i <= 64; i++) { const a = a0 + (a1 - a0) * i / 64, [x, y] = Tp(cx + Math.cos(a) * r, cy + Math.sin(a) * r); i ? G.lineTo(x, y) : G.moveTo(x, y) }
  if (fill) { G.closePath(); G.fillStyle = fill; G.fill() } else { G.strokeStyle = c; G.lineWidth = w; G.stroke() }
}
// The name along each baseline (BK 19:05), reading top to bottom at both ends (BK 19:54).
function baselineName(xc, name, ink, s) {
  const word = String(name).toUpperCase(), k = baselineFit(word)
  if (!k) return
  const tc = document.createElement('canvas'), tw0 = tw(word, k), th = 7 * k
  tc.width = tw0; tc.height = th; ptxt(tc.getContext('2d'), word, 0, 0, ink, k)
  const [ox, oy] = Tp(xc, 25)
  // both ends read top to bottom, the same way (BK 19:54: the right end read upside down)
  G.save(); G.imageSmoothingEnabled = false; G.setTransform(0, 1, -1, 0, ox, oy); G.drawImage(tc, -tw0 / 2, -th / 2); G.restore()
}
// Centre court: a basketball emblem of our own drawing (BK 18:38), a ring in the home colour.
function emblem(color) {
  const [cx, cy] = Tp(0, 25), rx = 3.4 * TXK, ry = 3.4 * TYK
  G.fillStyle = '#2a1608'; G.beginPath(); G.ellipse(cx, cy, rx + 2, ry + 2, 0, 0, Math.PI * 2); G.fill()
  G.fillStyle = '#E07A2E'; G.beginPath(); G.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); G.fill()
  G.fillStyle = '#F29A4A'; G.beginPath(); G.ellipse(cx - rx * 0.25, cy - ry * 0.3, rx * 0.45, ry * 0.35, 0, 0, Math.PI * 2); G.fill()
  G.strokeStyle = '#2a1608'; G.lineWidth = 2
  G.beginPath(); G.moveTo(cx - rx, cy); G.lineTo(cx + rx, cy); G.stroke(); G.beginPath(); G.moveTo(cx, cy - ry); G.lineTo(cx, cy + ry); G.stroke()
  G.beginPath(); G.ellipse(cx - rx * 0.95, cy, rx * 0.55, ry * 0.9, 0, -Math.PI / 2, Math.PI / 2); G.stroke()
  G.beginPath(); G.ellipse(cx + rx * 0.95, cy, rx * 0.55, ry * 0.9, 0, Math.PI / 2, Math.PI * 1.5); G.stroke()
  G.strokeStyle = color; G.lineWidth = 3; G.beginPath(); G.ellipse(cx, cy, rx + 6, ry + 4, 0, 0, Math.PI * 2); G.stroke(); G.lineWidth = 1
}
const LINE = '#17120d'
function buildFloor() {
  const save = G; G = tex.getContext('2d'); G.clearRect(0, 0, TEX_W, TEX_H)
  const hm = LEAGUE[S.homeYou ? S.you : S.opp], cp = courtPaint(hm)
  // flat maple, the faintest boards
  R(0, 0, TEX_W, TEX_H, '#e8b866')
  for (let y = 0; y < TEX_H; y += 6) { R(0, y, TEX_W, 1, '#e2b05e'); for (let x = (y / 6 % 4) * 23; x < TEX_W; x += 92) R(x, y, 1, 6, '#dcaa58') }
  // the apron beyond each sideline, a shade darker
  tRect(-TEX_X0, 50, TEX_X0, TEX_Y0, '#d59f55'); tRect(-TEX_X0, 0, TEX_X0, TEX_Y1, '#d59f55')
  // beyond each baseline, the home colour and the name
  for (const s of [-1, 1]) { tRect(s * HALF, TEX_Y1, s * TEX_X0, TEX_Y0, cp.paint); baselineName(s * (HALF + 2.5), hm.name, cp.ink, s) }
  // the painted lanes and the centre circle
  for (const s of [-1, 1]) tRect(s * HALF, 19, s * FTX, 31, cp.paint)
  tArc(0, 25, 6, 0, Math.PI * 2, null, cp.circle)
  emblem(cp.ink)
  // the lines: black, as the picture has them; on dark paint they take the ink colour
  const laneLine = lum(cp.paint) < 0.2 ? cp.ink : LINE
  tLine(-HALF, 0, HALF, 0, LINE, 3); tLine(-HALF, 50, HALF, 50, LINE, 3); tLine(-HALF, 0, -HALF, 50, LINE, 3); tLine(HALF, 0, HALF, 50, LINE, 3)
  tLine(0, 0, 0, 50, LINE, 3); tArc(0, 25, 6, 0, Math.PI * 2, LINE, null, 2)
  for (const s of [-1, 1]) {
    const rx = s * RIM
    tLine(s * HALF, 19, s * FTX, 19, laneLine); tLine(s * HALF, 31, s * FTX, 31, laneLine); tLine(s * FTX, 19, s * FTX, 31, laneLine)
    tArc(s * FTX, 25, 6, s > 0 ? Math.PI / 2 : -Math.PI / 2, s > 0 ? Math.PI * 1.5 : Math.PI / 2, LINE)
    const r3 = 19.75, reach = Math.acos((HALF - RIM) / r3)
    tArc(rx, 25, r3, s > 0 ? reach : -(Math.PI - reach), s > 0 ? 2 * Math.PI - reach : Math.PI - reach, LINE, null, 2)
    // the low-block hash marks
    for (const yy of [19, 31]) tLine(s * (HALF - 7), yy, s * (HALF - 7), yy + (yy < 25 ? -0.8 : 0.8), laneLine)
  }
  G = save
}
// One row of the floor per screen row, each at its own perspective scale.
function drawFloor() {
  const top = Math.max(0, Math.floor(FAR))
  for (let sy = top; sy < H; sy++) {
    const y = clamp((Y0 - sy) / KY, TEX_Y1 + 0.01, TEX_Y0), sc = SC(y), ftW = W / (KX * sc)
    const x0 = camX - ftW / 2, srcX = (x0 + TEX_X0) * TXK, srcW = ftW * TXK, ty = Math.min(TEX_H - 1, Math.floor((TEX_Y0 - y) * TYK))
    G.drawImage(tex, srcX, ty, srcW, 1, 0, sy, W, 1)
  }
}

// ── the scoreboard, top right, and the shot clock, bottom centre (BK 19:44: "Clock placement too.") ──
function dotTxt(s, x, y, k, on, off) {
  // dot-matrix lettering: every lit pixel a dot with a gap around it, and a faint ghost under the digits
  const S2 = String(s).toUpperCase()
  const d = Math.max(1, k - 1)
  if (off) { G.fillStyle = off; for (let i = 0; i < S2.length; i++) for (let r = 0; r < 7; r++) for (let q = 0; q < 5; q++) G.fillRect(x + (i * 6 + q) * k, y + r * k, d, d) }
  G.fillStyle = on
  for (let i = 0; i < S2.length; i++) { const tmp = FONT_ROWS(S2[i]); for (let r = 0; r < 7; r++) for (let q = 0; q < 5; q++) if (tmp[r][q] === '#') G.fillRect(x + (i * 6 + q) * k, y + r * k, d, d) }
}
// the 5×7 font's rows, read off the shared pixel font by drawing one glyph once into a scratch canvas
const glyphCache = {}
function FONT_ROWS(ch) {
  if (glyphCache[ch]) return glyphCache[ch]
  const c = document.createElement('canvas'); c.width = 5; c.height = 7; const g = c.getContext('2d'); ptxt(g, ch, 0, 0, '#ffffff', 1)
  const d = g.getImageData(0, 0, 5, 7).data, rows = []
  for (let r = 0; r < 7; r++) { let row = ''; for (let q = 0; q < 5; q++) row += d[(r * 5 + q) * 4 + 3] > 100 ? '#' : ' '; rows.push(row) }
  return (glyphCache[ch] = rows)
}
function drawScoreboard() {
  const g = S.g, you = TEAMS[S.you], opp = TEAMS[S.opp], bw = 200, bh = 44, x0 = W - bw - 3, y0 = 2
  R(x0 - 1, y0 - 1, bw + 2, bh + 2, '#4a4f5a'); R(x0, y0, bw, bh, '#050506')
  txt(you.abbr, x0 + 8, y0 + 4, '#f2f2f2'); txt(opp.abbr, x0 + bw - 8 - tw(opp.abbr), y0 + 4, '#f2f2f2')
  const per = g ? RU.periodName(g) : 'Q1'
  R(x0 + bw / 2 - 18, y0 + 2, 36, 11, '#14161c'); R(x0 + bw / 2 - 18, y0 + 2, 36, 1, '#3a3f4a'); txt(per, x0 + bw / 2 - tw(per) / 2, y0 + 4, '#f2f2f2')
  const a = String(g ? g.score[0] : 0).padStart(3, '0'), b = String(g ? g.score[1] : 0).padStart(3, '0')
  dotTxt(a, x0 + 6, y0 + 17, 3, '#f2f2f2', '#1c1c1f'); dotTxt(b, x0 + bw - 6 - (b.length * 18 - 3), y0 + 17, 3, '#f2f2f2', '#1c1c1f')
  const frac = S.phase === 'callPlay' || S.phase === 'guard' ? clamp(1 - (S.callEnd - gt) / CALLWIN, 0, 1) * 0.6 : 0
  const clk = g ? RU.clockText(g, frac) : '8:00'
  const cw = clk.length * 18 + 5
  R(Math.round(x0 + bw / 2 - cw / 2), y0 + 14, cw, 26, '#0d0f14'); R(Math.round(x0 + bw / 2 - cw / 2), y0 + 14, cw, 1, '#3a3f4a')
  dotTxt(clk, Math.round(x0 + bw / 2 - (clk.length * 18 - 3) / 2), y0 + 17, 3, '#ffb02e', '#221808')
}
let shotShown = RU.HOOPS.shotClock
function drawShotClock() {
  if (S.phase === 'callPlay' || S.phase === 'guard') shotShown = clamp(Math.ceil(RU.HOOPS.shotClock * (S.callEnd - gt) / CALLWIN - 1e-6), 0, RU.HOOPS.shotClock)
  else if (S.phase === 'bringUp' || S.phase === 'idle') shotShown = RU.HOOPS.shotClock
  const t = ':' + String(shotShown).padStart(2, '0'), w = t.length * 18 + 5, x0 = Math.round(W / 2 - w / 2), y0 = H - 26
  R(x0 - 1, y0 - 1, w + 2, 27, '#4a4f5a'); R(x0, y0, w, 25, '#050506'); dotTxt(t, x0 + 4, y0 + 2, 3, '#f2f2f2', '#1c1c1f')
}

// ── the basket ──
const hoopShake = () => (S.boardShake > 0.02 && !reduced ? Math.round(Math.sin(rt * 60) * S.boardShake * 2) : 0)
const RRX = 10, RRY = 3.4
function rimArc(cx, cy, back) {
  const bend = back ? 0 : S.rimBend * 4
  for (let i = 0; i <= 32; i++) {
    const a = (back ? Math.PI : 0) + Math.PI * i / 32
    const x = Math.round(cx + Math.cos(a) * RRX), y = Math.round(cy + Math.sin(a) * (RRY + (back ? 0 : bend)))
    if (back) R(x, y, 1, 2, '#9c3412')
    else { R(x, y, 1, 2, '#E2541F'); if (i > 4 && i < 28) R(x, y + 2, 1, 1, '#8a2a10'); if (i % 3 === 0) R(x, y, 1, 1, '#ff9a5a') }
  }
}
function drawHoopBack(s) {
  const hm = home(), pad = lum(hm.c[0]) < 0.12 ? hm.c[1] : hm.c[0], padD = shade(pad, -0.32), padL = shade(pad, 0.3), sh = hoopShake()
  const [b0x, b0y] = P(s * (HALF + MARGIN - 3.6), 25), [b1x] = P(s * (HALF + MARGIN - 0.4), 25)
  if (Math.max(b0x, b1x) < -60 || Math.min(b0x, b1x) > W + 60) return
  const left = Math.min(b0x, b1x), wB = Math.abs(b1x - b0x), baseH = Math.round(3.2 * KZ)
  R(left - 1, b0y - baseH - 1, wB + 2, baseH + 2, OUTC); R(left, b0y - baseH, wB, baseH, pad); R(left, b0y - baseH, wB, 2, padL); R(left, b0y - 4, wB, 4, padD)
  const px = Math.round((b0x + b1x) / 2), [, ptop] = P(s * (HALF + MARGIN - 2), 25, 13.4), baseTop = b0y - baseH
  R(px - 3, ptop, 7, baseTop - ptop, OUTC); R(px - 2, ptop, 5, baseTop - ptop, '#7d8494'); R(px - 2, ptop, 1, baseTop - ptop, '#aeb5c2')
  const [, pp] = P(s * HALF, 25, 6.6); R(px - 5, pp, 11, baseTop - pp, OUTC); R(px - 4, pp + 1, 9, baseTop - pp - 1, pad); R(px - 4, pp + 1, 2, baseTop - pp - 1, padL)
  const [ax, ayT] = P(s * 38.6, 25, 13.1), [, ayB] = P(s * 38.6, 25, 11.8)
  L(px, ptop + 1, ax, ayT + sh, '#4f5562'); L(px, ptop, ax, ayT - 1 + sh, '#a5acb9'); L(px, ptop + 11, ax, ayB + sh, '#4f5562')
  for (let i = 0; i < 6; i++) { const t0 = i / 6, t1 = (i + 1) / 6; L(px + (ax - px) * t0, ptop + (ayT - ptop) * t0, px + (ax - px) * t1, ptop + 11 + (ayB - ptop - 11) * t1, '#6c7380') }
  const [cx, cyM] = P(s * 38, 25, 11.6), bw = 44, bh = 32, x0 = Math.round(cx - bw / 2), y0 = Math.round(cyM - bh / 2) + sh
  G.globalAlpha = 0.34; R(x0, y0, bw, bh, '#cfe6f2'); G.globalAlpha = 0.2; R(x0 + 4, y0 + 3, 6, bh - 8, '#ffffff'); R(x0 + 12, y0 + 3, 2, bh - 8, '#ffffff'); G.globalAlpha = 1
  R(x0 - 1, y0 - 1, bw + 2, 1, OUTC); R(x0 - 1, y0 + bh, bw + 2, 1, OUTC); R(x0 - 1, y0, 1, bh, OUTC); R(x0 + bw, y0, 1, bh, OUTC)
  for (const [x, y, w, h] of [[x0, y0, bw, 2], [x0, y0 + bh - 2, bw, 2], [x0, y0, 2, bh], [x0 + bw - 2, y0, 2, bh]]) R(x, y, w, h, '#f2f6f9')
  const [rx, ry0] = P(s * RIM, 25, RIMZ), ry = ry0 + sh, sqW = 16, sqH = 11, sqX = Math.round(cx - sqW / 2), sqY = ry - sqH - 2
  R(sqX, sqY, sqW, 2, '#f2f6f9'); R(sqX, sqY, 2, sqH, '#f2f6f9'); R(sqX + sqW - 2, sqY, 2, sqH, '#f2f6f9')
  R(x0, y0 + bh, bw, 3, pad); R(x0, y0 + bh, bw, 1, padL)
  R(Math.min(cx, rx), ry - 1, Math.abs(rx - cx) + 1, 3, '#3f444e')
  rimArc(rx, ry, true)
}
function drawNet(rx, ry, wTop, wBot, len, snap, sway, rows = 4, cols = 6, col = '#eef1f4', thick = 1) {
  const at = (r, c) => { const t = r / rows, w = wTop + (wBot - wTop) * t; return [rx + sway * t + w * (-1 + 2 * c / cols), ry + 1 + len * t] }
  G.globalAlpha = 0.9
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const a = at(r, c), b = at(r + 1, c + 1), e = at(r, c + 1), f2 = at(r + 1, c)
    for (let k = 0; k < thick; k++) { L(a[0] + k, a[1], b[0] + k, b[1], col); L(e[0] + k, e[1], f2[0] + k, f2[1], col) }
  }
  G.globalAlpha = 1
}
function drawHoopFront(s) {
  const sh = hoopShake(), [rx, ry0] = P(s * RIM, 25, RIMZ), ry = ry0 + sh
  if (rx < -30 || rx > W + 30) return
  drawNet(rx, ry + Math.round(S.rimBend * 2), RRX - 1, 5.5, 16 * (1 + S.netSnap * 0.5), S.netSnap, reduced ? 0 : Math.sin(rt * 22) * S.netSnap * 2.5)
  rimArc(rx, ry, false)
}

// ── the dunk (BK 19:18) ──
function dunkSeq(sh, d, onSlam) {
  const rim = rimPt(d)
  sh.tx = d * (RIM - 1.6); sh.ty = 25; sh.face = d
  S.ball.dribble = false; S.ball.held = sh
  pose(sh, 'dunkReach', 0.6); jump(sh, 1.5, 0.9); dust(sh.x, sh.y, 8)
  later(0.42, () => {
    pose(sh, 'dunkSlam', 0.3)
    fly(handOf(sh), { x: rim.x, y: 25, z: RIMZ - 0.3 }, 0.07, 0, () => {
      S.netSnap = 1; S.boardShake = 1; S.rimBend = 1; S.shake = reduced ? 0 : 4
      fly({ ...S.ball }, { x: rim.x, y: 25, z: 0.4 }, 0.32, 0, null)
      onSlam()
    })
    later(0.1, () => { sh.jump = null; sh.z = HANG_Z; sh.hang = gt + 0.5; pose(sh, 'hang', 0.6) })
  })
}
function refSignal(kind) { if (S.ref) pose(S.ref, kind === 'three' ? 'block' : kind === 'foul' ? 'signalFoul' : 'bump', 0.9) }

// ── sprites: tall, lean players (the picture), a referee, the benches and the coaches ──
// Joints, facing +x, feet on y = 0, one unit per pixel. A player stands 56 pixels tall: half of it
// legs, a small head.
const SOX = 30, SOY = 70, SW = 60, SH2 = 76
const JERSEY = Object.fromEntries(Object.entries({
  0: '.##.|#..#|#..#|#..#|#..#|.##.', 1: '.#.|##.|.#.|.#.|.#.|###', 2: '.##.|#..#|..#.|.#..|#...|####',
  3: '###.|...#|.##.|...#|...#|###.', 4: '#..#|#..#|####|...#|...#|...#', 5: '####|#...|###.|...#|...#|###.',
}).map(([k, v]) => [k, v.split('|')]))
const P0 = (o, ov) => ({ ...o, ...ov })
const READY = { hip: [0, -28], sh: [1, -44], head: [2, -51], kB: [-2, -14.5], fB: [-3, 0], kF: [3, -14.5], fF: [4, 0], eB: [-1, -36], hB: [0, -28], eF: [4, -36], hF: [6, -29] }
const RUN0 = { hip: [0, -29], sh: [3, -45], head: [4, -52], kB: [-4, -16], fB: [-9, -6], kF: [5, -16], fF: [6, 0], eB: [-3, -37], hB: [-2, -30], eF: [7, -38], hF: [9, -44] }
const RUN1 = P0(RUN0, { kB: [4, -16], fB: [3, 0], kF: [-4, -16], fF: [-9, -6], eB: [7, -38], hB: [9, -44], eF: [-3, -37], hF: [-2, -30] })
const RUNA = { hip: [0, -30], sh: [3, -46], head: [4, -53], kB: [-1, -15], fB: [-2, 0], kF: [5, -19], fF: [2, -10], eB: [1, -38], hB: [2, -31], eF: [4, -38], hF: [5, -32] }
const DEF = { hip: [-1, -24], sh: [1, -40], head: [3, -47], kB: [-6, -12], fB: [-9, 0], kF: [6, -12], fF: [9, 0], eB: [-5, -35], hB: [-11, -33], eF: [7, -35], hF: [13, -34] }
const POSES = {
  ready: READY,
  ready2: P0(READY, { hip: [0, -27.7], sh: [1, -43.6], head: [2, -50.6], hB: [0, -27.6], hF: [6, -28.6] }),
  dribbleUp: { hip: [0, -27], sh: [2, -43], head: [3, -50], kB: [-3, -14], fB: [-5, 0], kF: [4, -14], fF: [5, 0], eB: [-1, -35], hB: [0, -28], eF: [6, -35], hF: [10, -28] },
  dribbleDown: { hip: [0, -27], sh: [2, -43], head: [3, -50], kB: [-3, -14], fB: [-5, 0], kF: [4, -14], fF: [5, 0], eB: [-1, -35], hB: [0, -28], eF: [7, -33], hF: [11, -22] },
  run0: RUN0, run1: RUN1, runA: RUNA,
  runB: P0(RUNA, { kB: [5, -19], fB: [2, -10], kF: [-1, -15], fF: [-2, 0], eB: [4, -38], hB: [5, -32], eF: [1, -38], hF: [2, -31] }),
  dribRun0: P0(RUN0, { eF: [8, -36], hF: [12, -29] }),
  dribRun1: P0(RUN1, { eF: [8, -35], hF: [12, -27], eB: [-3, -37], hB: [-2, -30] }),
  defend: DEF,
  defend2: P0(DEF, { kB: [-3, -12], fB: [-5, 0], kF: [3, -12], fF: [5, 0] }),
  boxout: { hip: [-5, -25], sh: [0, -40], head: [3, -47], kB: [-9, -12], fB: [-11, 0], kF: [3, -12], fF: [5, 0], eB: [-7, -34], hB: [-13, -31], eF: [5, -36], hF: [10, -41] },
  shootLoad: { hip: [0, -25], sh: [1, -41], head: [2, -48], kB: [-2, -12], fB: [-3, 0], kF: [3, -12], fF: [4, 0], eB: [4, -35], hB: [5, -42], eF: [6, -35], hF: [6, -43] },
  set: { hip: [0, -30], sh: [0, -46], head: [1, -53], kB: [-1, -15], fB: [-2, 0], kF: [2, -15], fF: [3, 0], eB: [2, -54], hB: [3, -61], eF: [4, -54], hF: [4, -62] },
  release: { hip: [0, -30], sh: [0, -46], head: [1, -53], kB: [-1, -15], fB: [-2, -2], kF: [2, -15], fF: [3, -2], eB: [3, -53], hB: [5, -59], eF: [6, -55], hF: [11, -61] },
  layup: { hip: [-1, -30], sh: [0, -46], head: [2, -53], kB: [-3, -17], fB: [-6, -6], kF: [4, -22], fF: [3, -12], eB: [-3, -37], hB: [-2, -30], eF: [4, -56], hF: [6, -66] },
  block: { hip: [0, -30], sh: [0, -46], head: [0, -53], kB: [-1, -15], fB: [-1, -1], kF: [1, -15], fF: [1, -1], eB: [-1, -57], hB: [0, -66], eF: [2, -57], hF: [3, -66] },
  signalFoul: P0(READY, { eF: [1, -55], hF: [1, -64] }),
  dunkReach: { hip: [-1, -30], sh: [-1, -46], head: [1, -53], kB: [-3, -17], fB: [-6, -7], kF: [4, -21], fF: [2, -11], eB: [-3, -57], hB: [-8, -63], eF: [0, -58], hF: [-5, -64] },
  dunkSlam: { hip: [0, -30], sh: [1, -46], head: [0, -53], kB: [-2, -15], fB: [-4, -4], kF: [2, -15], fF: [2, -4], eB: [9, -50], hB: [16, -54], eF: [10, -49], hF: [17, -53] },
  hang: { hip: [-1, -32], sh: [1, -48], head: [-2, -55], kB: [-2, -18], fB: [-4, -5], kF: [1, -18], fF: [0, -5], eB: [7, -57], hB: [13, -65], eF: [8, -58], hF: [14, -66] },
  land: { hip: [0, -23], sh: [1, -39], head: [2, -46], kB: [-3, -11], fB: [-5, 0], kF: [3, -11], fF: [5, 0], eB: [3, -31], hB: [6, -25], eF: [4, -31], hF: [7, -25] },
  bump: P0(READY, { head: [3, -51], eB: [7, -38], hB: [14, -38], eF: [7, -37], hF: [14, -37] }),
  hero: { hip: [-1, -30], sh: [0, -46], head: [2, -53], kB: [-3, -17], fB: [-6, -7], kF: [4, -18], fF: [2, -5], eB: [5, -39], hB: [9, -34], eF: [6, -57], hF: [9, -66] },
  sit: { hip: [0, -15], sh: [1, -31], head: [2, -38], kB: [8, -15], fB: [8, 0], kF: [9, -15], fF: [10, 0], eB: [3, -23], hB: [7, -17], eF: [4, -23], hF: [8, -16] },
}
function handOf(p) {
  const ps = POSES[p.shown || p.pose] || POSES.ready, [hx, hy] = ps.hF
  return { x: p.x + p.face * hx * SPR / (KX * SC(p.y)), y: p.y - 0.2, z: p.z + -hy * SPR / KZ }
}
const HANG_Z = RIMZ - -POSES.hang.hF[1] * SPR / KZ + 0.15
function paintSprite(ctx, p, poseName, f, air, s, ox, oy) {
  const ref = !!p.ref, coachP = !!p.coach
  const kit = ref ? { j: '#f4f4f4', t: '#151515' } : coachP ? { j: p.suit || '#20263a', t: '#e8e8e8' } : S.kits[p.side], J = kit.j, T = kit.t
  const dark = lum(J) < 0.2
  const Jd = shade(J, dark ? 0.18 : -0.24), Jl = shade(J, dark ? 0.45 : 0.3), Jdd = shade(J, dark ? 0.06 : -0.45)
  const sk = p.skin, skd = shade(sk, -0.25), skl = shade(sk, 0.2)
  const hair = p.hair, hairl = shade(hair, 0.35), haird = shade(hair, -0.3)
  const j = POSES[poseName] || POSES.ready
  const X = v => ox + f * v * s, Y = v => oy + v * s
  const fr = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))) }
  const seg = (a, b, t, c) => { const x0 = X(a[0]), y0 = Y(a[1]), x1 = X(b[0]), y1 = Y(b[1]); const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))) + 1; const tt = Math.max(1, t * s); ctx.fillStyle = c
    for (let i = 0; i <= n; i++) { const u = i / n; ctx.fillRect(Math.round(x0 + (x1 - x0) * u - tt / 2), Math.round(y0 + (y1 - y0) * u - tt / 2), Math.round(tt), Math.round(tt)) } }
  const lp = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]
  const blob = (c, r, col, dx = 0, dy = 0) => { const cx = X(c[0] + dx), cy = Y(c[1] + dy), rr = r * s; ctx.fillStyle = col; for (let yy = -rr; yy <= rr; yy++) { const w = Math.sqrt(Math.max(0, rr * rr - yy * yy)); ctx.fillRect(Math.round(cx - w), Math.round(cy + yy), Math.max(1, Math.round(w * 2)), 1) } }
  const poly = (pts, c) => { ctx.fillStyle = c; ctx.beginPath(); pts.forEach(([a, b], i) => (i ? ctx.lineTo(X(a), Y(b)) : ctx.moveTo(X(a), Y(b)))); ctx.closePath(); ctx.fill() }
  const H0 = j.hip, S0 = j.sh, suitLegs = ref || coachP, legC = ref ? '#1d1d22' : coachP ? shade(J, -0.15) : null
  const leg = (kn, ft, back) => {
    const c = back ? skd : sk
    if (suitLegs) { seg(H0, kn, 4.4, back ? shade(legC, -0.3) : legC); seg(kn, ft, 3.8, back ? shade(legC, -0.3) : legC) }
    else {
      seg(H0, kn, 4, c); seg(kn, ft, 3.1, c)
      if (!back) seg(lp(kn, ft, 0.1), lp(kn, ft, 0.4), 1, skl)
      seg(lp(kn, ft, 0.45), ft, 3.4, back ? '#d5d8de' : '#f6f6f8')           // high white socks
      seg(lp(kn, ft, 0.5), lp(kn, ft, 0.55), 3.5, back ? shade(T, -0.3) : T)
    }
    const fx = X(ft[0]), fy = Y(ft[1]), sw = 6 * s, shh = 3 * s, x0 = f > 0 ? fx - 2 * s : fx - sw + 2 * s
    fr(x0, fy - shh + 0.6 * s, sw, shh, suitLegs ? (back ? '#0a0a0a' : '#151515') : back ? '#cfd0d8' : '#f8f8fa')
    fr(x0, fy + 0.5 * s, sw, 1 * s, '#2a2a30')
  }
  const sleeveC = ref ? '#f4f4f4' : coachP ? J : null
  const arm = (e, h, back) => {
    const c = back ? skd : sk
    seg(S0, e, 2.8, c); seg(e, h, 2.4, c)
    if (sleeveC) { seg(S0, coachP ? lp(e, h, 0.8) : lp(S0, e, 0.5), 3.2, back ? shade(sleeveC, -0.25) : sleeveC); if (ref) seg(lp(S0, e, 0.2), lp(S0, e, 0.28), 3.3, '#151515') }
    else if (!back) seg(lp(S0, e, 0.3), lp(S0, e, 0.75), 1, skl)
    if (p.sleeve && !back && !sleeveC) seg(lp(S0, e, 0.4), lp(e, h, 0.85), 2.7, p.sleeve)
    blob(h, 1.5, back ? skd : sk)
  }
  const armsUp = j.hF[1] < j.head[1] - 2
  arm(j.eB, j.hB, true)
  leg(j.kB, j.fB, true); leg(j.kF, j.fF, false)
  // shorts to the knee, the jersey colour, a stripe at the side seam and the hem
  if (!suitLegs) {
    const kF8 = lp(H0, j.kF, 0.62), kB8 = lp(H0, j.kB, 0.62)
    seg(H0, kB8, 5.8, shade(Jd, -0.12)); seg(H0, kF8, 6.2, Jd); seg([H0[0] + 0.6, H0[1]], lp(H0, j.kF, 0.56), 4.2, J)
    const sF = lp(H0, j.kF, 0.06); seg([sF[0] + 2.6, sF[1]], [kF8[0] + 2.6, kF8[1]], 1, T)
    seg([kF8[0] - 3, kF8[1] + 0.4], [kF8[0] + 3, kF8[1] + 0.4], 1, T)
  }
  // the jersey: a tank, shoulders a little wider than the waist
  const sw = 5.4, ww = 4.2
  if (!ref && !coachP) { blob([S0[0] - 4, S0[1] + 1.2], 1.8, skd); blob([S0[0] + 4.2, S0[1] + 1.2], 1.9, sk) }
  poly([[S0[0] - sw + 1, S0[1]], [S0[0] + sw - 0.8, S0[1]], [H0[0] + ww, H0[1] - 0.5], [H0[0] - ww, H0[1] - 0.5]], Jd)
  poly([[S0[0] - sw + 2.2, S0[1] + 0.5], [S0[0] + sw - 1.2, S0[1] + 0.5], [H0[0] + ww - 0.3, H0[1] - 0.8], [H0[0] - ww + 1.3, H0[1] - 0.8]], J)
  seg([S0[0] + sw - 1.6, S0[1] + 1.2], [H0[0] + ww - 0.8, H0[1] - 1], 1, Jl)
  if (ref) { for (let k = -2; k <= 2; k++) seg([S0[0] + k * 1.9, S0[1] + 0.3], [H0[0] + k * 1.5, H0[1] - 0.6], 0.9, '#151515'); seg([H0[0] - ww, H0[1] - 0.3], [H0[0] + ww, H0[1] - 0.3], 1.2, '#151515') }
  else if (coachP) { poly([[S0[0] - 0.5, S0[1] + 0.4], [S0[0] + 2.4, S0[1] + 0.4], [S0[0] + 1.2, S0[1] + 7]], '#e8e8e8'); seg([S0[0] + 1, S0[1] + 1], [S0[0] + 1.2, S0[1] + 7.5], 1, p.tie || '#a3202a') }
  else { seg([S0[0] - sw + 1.2, S0[1] + 0.3], [S0[0] - sw + 1.9, S0[1] + 3.4], 0.9, T); seg([S0[0] + sw - 1, S0[1] + 0.3], [S0[0] + sw - 1.7, S0[1] + 3.4], 0.9, T)
    seg([S0[0] - 1.2, S0[1] + 0.3], [S0[0] + 0.5, S0[1] + 2.4], 0.9, T); seg([S0[0] + 2.2, S0[1] + 0.3], [S0[0] + 0.5, S0[1] + 2.4], 0.9, T) }
  if (armsUp) arm(j.eF, j.hF, false)
  // neck, head and hair: small, the picture's proportions
  const hd = j.head, st = ref || coachP ? 'short' : p.hairStyle || 'short'
  seg([S0[0] + 0.5, S0[1] + 0.6], [hd[0], hd[1] + 2.6], 2.6, skd)
  if (ref) blob([S0[0] + 1.3, S0[1] + 1.8], 0.7, '#cfd6dc')
  if (st === 'pony') { seg([hd[0] - 2.8, hd[1] - 1], [hd[0] - 4.6, hd[1] + 1.6 + (air ? 1 : 0)], 2.2, hair); seg([hd[0] - 4.6, hd[1] + 1.6], [hd[0] - 5, hd[1] + 3.8], 1.8, haird) }
  if (st === 'bun') blob([hd[0] - 2.4, hd[1] - 3.2], 1.8, hair)
  if (st === 'afro') { blob(hd, 4.6, hair, -0.6, -1.4); blob(hd, 1.4, hairl, -1.2, -3.8) }
  if (st === 'puffs') { blob([hd[0] - 2.6, hd[1] - 3.3], 1.7, hair); blob([hd[0] + 0.8, hd[1] - 3.8], 1.6, hair) }
  blob(hd, st === 'buzz' ? 3.4 : 3.6, st === 'fade' ? shade(hair, 0.18) : hair, -0.4, st === 'buzz' ? -0.4 : -0.8)
  if (st === 'fade') blob(hd, 2.6, hair, -0.3, -1.8)
  blob(hd, 3.1, sk, 0.9, 0.8)
  blob(hd, 1.1, skd, -0.8, 1.6)
  if (st === 'braids') for (let i = 0; i < 3; i++) seg([hd[0] - 2.2 + i * 1.6, hd[1] - 3.3], [hd[0] - 3.3 + i * 1, hd[1] + 0.4], 0.7, haird)
  if (p.band) seg([hd[0] - 2.9, hd[1] - 1.9], [hd[0] + 2.9, hd[1] - 2.1], 1, T)
  const flip = n => (f > 0 ? 0 : n * s)
  fr(X(hd[0] + 2.2) - flip(1), Y(hd[1] - 0.4), Math.max(1, s), Math.max(1, s), '#141414')
  if (s > 2) {
    fr(X(hd[0] + 1.6) - flip(1.4), Y(hd[1] - 1.5), 1.4 * s, 0.5 * s, haird)
    const shout = ['dunkSlam', 'hang', 'hero'].includes(poseName)
    fr(X(hd[0] + 1.6) - flip(1.4), Y(hd[1] + 1.7), 1.4 * s, (shout ? 1.1 : 0.4) * s, shout ? '#3a1414' : shade(sk, -0.45))
    fr(X(hd[0] + 3.4) - flip(0.6), Y(hd[1] + 0.4), 0.6 * s, 0.9 * s, skd)
  }
  if (!armsUp) arm(j.eF, j.hF, false)
  // the number: block numerals at the game's own pixel size, trim colour, a contrast outline (BK 19:33)
  if (!ref && !coachP && p.num != null) {
    const m = lp(H0, S0, 0.55), n = String(p.num), px = Math.max(1, Math.round(s * 0.8))
    const glyphs = [...n].map(c => JERSEY[c]), wN = glyphs.reduce((w, g) => w + g[0].length, 0) + (glyphs.length - 1), hN = 6
    const nx = Math.round(X(m[0] + 0.5) - wN * px / 2), ny = Math.round(Y(m[1]) - hN * px / 2)
    const edge = lum(T) > 0.45 ? shade(J, dark ? -0.6 : -0.55) : '#f4f4f4', o = Math.max(1, Math.round(px / 2))
    for (const [pass, col] of [[0, edge], [1, T]]) {
      ctx.fillStyle = col; let cx = nx
      for (const g of glyphs) {
        for (let yy = 0; yy < hN; yy++) for (let xx = 0; xx < g[yy].length; xx++) if (g[yy][xx] === '#') {
          if (pass === 0) ctx.fillRect(cx + xx * px - o, ny + yy * px - o, px + 2 * o, px + 2 * o); else ctx.fillRect(cx + xx * px, ny + yy * px, px, px)
        }
        cx += (g[0].length + 1) * px
      }
    }
  }
}
function outline(c, col, th) { const x = c.getContext('2d'); const d = x.getImageData(0, 0, c.width, c.height); const a = d.data, w = c.width, h = c.height
  const src = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) src[i] = a[i * 4 + 3] > 40 ? 1 : 0; const [r, g, b] = rgb(col)
  for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) { const i = y * w + xx; if (src[i]) continue; let hit = false
    for (let dy = -th; dy <= th && !hit; dy++) for (let dx = -th; dx <= th; dx++) { if (Math.abs(dx) + Math.abs(dy) > th) continue; const X2 = xx + dx, Y2 = y + dy; if (X2 >= 0 && Y2 >= 0 && X2 < w && Y2 < h && src[Y2 * w + X2]) { hit = true; break } }
    if (hit) { a[i * 4] = r; a[i * 4 + 1] = g; a[i * 4 + 2] = b; a[i * 4 + 3] = 255 } }
  x.putImageData(d, 0, 0) }
const spriteCache = new Map()
function sprite(p, ps, f, air, s = SPR) {
  const key = `${p.side}${p.role}|${ps}|${f}|${air ? 1 : 0}|${s}`; let c = spriteCache.get(key)
  if (!c) {
    c = document.createElement('canvas'); c.width = Math.round(SW * s); c.height = Math.round(SH2 * s)
    paintSprite(c.getContext('2d'), p, ps, f, air, s, Math.round(SOX * s), Math.round(SOY * s))
    outline(c, '#2a1c14', s > 2 ? 2 : 1); spriteCache.set(key, c)
  }
  return c
}
const RUN = ['run0', 'runA', 'run1', 'runB'], DRUN = ['dribRun0', 'runA', 'dribRun1', 'runB']
function drawPlayer(p, ox, oy) {
  const air = p.z > 0.05, moving = Math.hypot(p.tx - p.x, p.ty - p.y) > 0.15
  let ps = p.pose
  if (ps === 'ready') {
    const onD = S.g && p.side < 2 && p.side !== S.g.offense && !['point', 'ftMeter', 'ftAI', 'ftFlight', 'over', 'between'].includes(S.phase)
    if (S.ball.held === p && S.ball.dribble) ps = moving ? DRUN[Math.floor(gt * 10 + (p.num || 0)) & 3] : p.dribUp ? 'dribbleUp' : 'dribbleDown'
    else if (moving && !air) ps = onD && S.phase !== 'rebound' ? (Math.floor(gt * 7 + (p.num || 0)) & 1 ? 'defend' : 'defend2') : RUN[Math.floor(gt * 10 + (p.num || 0)) & 3]
    else if (onD && !air) ps = 'defend'
    else ps = Math.floor(rt * 1.4 + (p.num || 0) * 0.37) % 2 ? 'ready2' : 'ready'
    if (air) ps = 'block'
  }
  p.shown = ps
  G.drawImage(sprite(p, ps, p.face, air), ox - SOX * SPR, oy - SOY * SPR)
}
function drawBall(b) {
  const [x, y] = P(b.x, b.y, b.z), cy = y - 3
  if (!reduced && b.trail) { b.trail.forEach((t, i) => { G.globalAlpha = 0.12 + i * 0.08; R(t[0] - 2, t[1] - 2, 4, 4, '#f08a3a') }); G.globalAlpha = 1 }
  disc(x, cy, 4, OUTC); disc(x, cy, 3, '#E07A2E'); R(x - 2, cy - 2, 2, 2, '#F6A85C'); R(x - 3, cy, 7, 1, '#5a2a10'); R(x, cy - 3, 1, 7, '#5a2a10')
}
// The benches and the coaches along the far sideline, and the scorer's table between them.
function makeBench() {
  const r = rng(S.you * 41 + S.opp * 29 + 3), out = []
  for (const sd of [0, 1]) {
    const d = sd === 0 ? -1 : 1
    for (let i = 0; i < 4; i++) {
      const pool = LEGAL.filter(n => !side(sd).some(p => p.num === n))
      out.push({ side: sd, role: 'B' + i, x: d * (11 + i * 4.2), y: 57, z: 0, tx: d * (11 + i * 4.2), ty: 57, face: -d, pose: 'sit', poseUntil: 0, bench: true,
        skin: SKIN[Math.floor(r() * SKIN.length)], hair: HAIR[Math.floor(r() * HAIR.length)],
        hairStyle: (S.girls ? ['pony', 'bun', 'braids', 'short'] : ['short', 'fade', 'buzz', 'afro'])[Math.floor(r() * 4)], num: pool[Math.floor(r() * pool.length)] })
    }
    out.push({ side: 3 + sd, role: 'COACH', coach: true, x: d * 30, y: 56, z: 0, tx: d * 30, ty: 56, face: -d, pose: 'ready', poseUntil: 0, bench: true,
      skin: SKIN[Math.floor(r() * SKIN.length)], hair: HAIR[Math.floor(r() * HAIR.length)], suit: ['#20263a', '#2b2b30', '#3a2f2a'][Math.floor(r() * 3)], tie: TEAMS[sd === 0 ? S.you : S.opp].c[0] })
  }
  return out
}
function drawChair(x, y) { R(x - 5, y - 15, 2, 15, '#6f7684'); R(x + 3, y - 9, 2, 9, '#6f7684'); R(x - 5, y - 16, 9, 6, '#8a92a1'); R(x - 5, y - 9, 10, 2, '#9aa2b1') }
function drawTable() {
  const [a, ay] = P(-7, 55.5), [b] = P(7, 55.5), hm = home(), skirt = lum(hm.c[0]) < 0.12 ? hm.c[1] : hm.c[0]
  R(a - 1, ay - 15, b - a + 2, 16, OUTC); R(a, ay - 14, b - a, 14, skirt); R(a, ay - 14, b - a, 2, '#e9e3d6'); R(a, ay - 3, b - a, 3, shade(skirt, -0.3))
}
const parts = new Particles(150)
function dust(x, y, n) { if (reduced) return; parts.burst({ x, y, z: 0.05, n, colors: ['#efe2c4', '#d9c69c', '#fff6e0'], speed: 2.4, up: 2, life: 0.4, size: 1, grav: 8 }) }

function render() {
  G = screenCtx; G.imageSmoothingEnabled = false; G.clearRect(0, 0, W, H)
  if (S.film && drawFilm()) return
  if (!S.bench) S.bench = makeBench()
  const shakeX = S.shake > 0 && !reduced ? Math.round((Math.random() - 0.5) * 2 * Math.min(4, S.shake)) : 0
  G.save(); G.translate(shakeX, 0)
  const cOx = CX0 + camX * KX * PAR
  G.drawImage(crowdCv, -Math.round(cOx), 0); drawCrowd(Math.round(cOx))
  drawFloor()
  // the bench row: chairs, the subs, the coaches, the table
  for (const b of S.bench) { if (b.coach) continue; const [x, y] = P(b.x, b.y); drawChair(x + b.face * -2, y) }
  for (const b of S.bench) { const [x, y] = P(b.x, b.y); if (x > -40 && x < W + 40) drawPlayer(b, x, y) }
  drawTable()
  // shadows
  for (const p of [...S.players, S.ref]) { const [x, y] = P(p.x, p.y); G.globalAlpha = 0.25; R(x - 8, y - 1, 16, 3, '#3a2210'); G.globalAlpha = 1 }
  { const [x, y] = P(S.ball.x, S.ball.y); G.globalAlpha = 0.4; R(x - 3, y - 1, 7, 2, '#3a2210'); G.globalAlpha = 1 }
  if (S.phase === 'rebound' && S.land && !S.box) { const [x, y] = P(S.land.x, S.land.y); const rem = Math.max(0, S.contactAt - gt); ell(x, y, 7, 2.6, '#ffffff'); const rr = 7 + rem * 44; ell(x, y, rr, rr * 0.4, '#E3B341'); ell(x, y, rr + 1, rr * 0.4 + 0.6, OUTC) }
  const list = [...S.players, S.ref].map(p => ({ y: p.y, k: 'p', p }))
  list.push({ y: 25.01, k: 'hoop', s: -1 }, { y: 25.01, k: 'hoop', s: 1 }, { y: S.ball.y - 0.05, k: 'ball' })
  list.sort((a, c) => c.y - a.y)
  for (const d of list) {
    if (d.k === 'hoop') drawHoopBack(d.s)
    else if (d.k === 'p') { const [x, y] = P(d.p.x, d.p.y, d.p.z); drawPlayer(d.p, x, y) }
    else drawBall(S.ball)
  }
  drawHoopFront(-1); drawHoopFront(1)
  if ((S.phase === 'shoot' || S.phase === 'contest') && S.shooter) {
    const rem = S.contactAt - gt
    if (rem < 1.0) { const sh = S.shooter, hh = handOf(sh), [cx, y] = P(hh.x, hh.y, hh.z); ell(cx, y, 6, 6, '#ffffff'); const rr = 6 + Math.max(0, rem) * 28; ell(cx, y, rr, rr, '#E3B341'); ell(cx, y, rr + 1, rr + 1, OUTC) }
  }
  if (S.phase === 'guard' && gt >= S.readAt && S.aiCall) {
    const pg = roleOf(1, 'PG'), [x, y] = P(pg.x, pg.y, pg.z), lab = W8.readCue[S.aiCall]
    const tgt = roleOf(1, SHOOTER[S.aiCall]), [tx] = P(tgt.x, tgt.y), dir = Math.sign(tx - x)
    const ax = clamp(x, 30, W - 30), ay = Math.max(48, y - 66)
    R(ax - tw(lab) / 2 - 4, ay - 12, tw(lab) + 8, 24, OUTC); R(ax - tw(lab) / 2 - 3, ay - 11, tw(lab) + 6, 22, '#0B1220'); R(ax - tw(lab) / 2 - 3, ay - 11, tw(lab) + 6, 1, '#E3B341')
    R(ax - 1, ay, 3, 6, '#E3B341'); if (dir) for (let i = 0; i < 4; i++) R(ax + dir * (2 + i), ay + 1 + (i / 2 | 0), 1, 4 - i, '#E3B341')
    txt(lab, ax - tw(lab) / 2, ay - 9, '#ffffff', 1, '#000000')
  }
  parts.draw(G, (x, y) => { const [a, b] = P(x, y); return { x: a, y: b } }, KZ)
  G.restore()
  drawScoreboard(); drawShotClock()
  if (S.phase === 'ftMeter' && S.meter) {
    const mw = 125, mx = Math.round(W / 2 - mw / 2), my = H - 38
    R(mx - 2, my - 2, mw + 4, 11, OUTC); R(mx, my, mw, 7, '#7a2a2a')
    const g = S.meter.green, yz = g + RU.FT_YELLOW; R(mx + mw * (0.5 - yz), my, mw * yz * 2, 7, '#8a7a2a'); R(mx + mw * (0.5 - g), my, mw * g * 2, 7, '#2f7a3a'); R(mx, my, mw, 2, 'rgba(255,255,255,.18)')
    R(mx + mw / 2, my - 2, 1, 11, '#ffffff'); const m = meterPos(); R(mx + mw * m - 2, my - 4, 5, 15, OUTC); R(mx + mw * m - 1, my - 3, 3, 13, '#E3B341')
  }
  S.pops = S.pops.filter(q => rt - q.t0 < 0.9)
  for (const q of S.pops) { const [x, y] = P(q.x, q.y, q.z); const up = reduced ? 0 : (rt - q.t0) * 10; txt(q.text, clamp(x - tw(q.text) / 2, 2, W - tw(q.text) - 2), Math.max(46, y - 6 - up - q.lift), '#ffffff', 1, '#0b1220') }
  if (S.cele) drawCele()
  if (S.band) { const e = rt - S.band.t0; if (e >= S.band.dur) endBand(); else drawBand(G, W, H, S.band, e, reduced) }
}
function drawFilm() {
  const f = S.film, e = rt - f.t0
  if (e >= f.dur) { endFilm(); if (S.film) return drawFilm(); return false }
  const hm = LEAGUE[S.homeYou ? S.you : S.opp], youTeam = side(0)
  drawRunThrough(G, W, H, { team: hm, indoor: true, heroLift: 0.5, mateDrop: 40,
    heroFn: () => sprite(youTeam[0], 'hero', 1, true, 2), mateFn: () => sprite(youTeam[4], 'run0', 1, false, 1.4) }, e, reduced)
  return true
}
function burstBg(e) {
  const kit = S.kits[0], cx = 138, cy = 148, n = 20, rot = reduced ? 0 : e * 0.5, c1 = kit.j, c2 = lum(kit.j) < 0.15 ? shade(kit.t, -0.35) : shade(kit.j, -0.35)
  R(0, 0, W, H, '#05070d')
  for (let i = 0; i < n; i++) { const a0 = rot + i / n * Math.PI * 2, a1 = a0 + Math.PI / n; G.fillStyle = i % 2 ? c1 : c2; G.beginPath(); G.moveTo(cx, cy); G.lineTo(cx + Math.cos(a0) * W * 1.1, cy + Math.sin(a0) * W * 1.1); G.lineTo(cx + Math.cos(a1) * W * 1.1, cy + Math.sin(a1) * W * 1.1); G.closePath(); G.fill() }
  const bd = 35; G.globalAlpha = 0.55; R(0, 0, W, bd, '#05070d'); R(0, H - bd - 2, W, bd + 2, '#05070d'); G.globalAlpha = 1; R(0, bd, W, 2, '#E3B341'); R(0, H - bd - 4, W, 2, '#E3B341')
}
const GRAD = ['#fff6c8', '#ffe27a', '#f7c948', '#f0b232', '#e8962a', '#df7a22', '#c85a18']
function drawDunkCele(c, e) {
  const k = reduced ? 1 : clamp((e - 0.05) / 0.3, 0, 1), ease = 1 - (1 - k) * (1 - k)
  burstBg(e)
  const rx = 330, ry = 132, RX = 62
  G.globalAlpha = 0.3; R(rx - 110, 36, 220, 92, '#cfe6f2'); G.globalAlpha = 1
  R(rx - 110, 124, 220, 5, '#f2f6f9'); R(rx - 112, 36, 4, 93, '#f2f6f9'); R(rx + 108, 36, 4, 93, '#f2f6f9')
  R(rx - 44, 64, 88, 5, '#f2f6f9'); R(rx - 44, 64, 5, 60, '#f2f6f9'); R(rx + 39, 64, 5, 60, '#f2f6f9')
  R(rx - 6, 128, 12, 6, '#3f444e')
  for (let i = 0; i <= 60; i++) { const a = Math.PI + Math.PI * i / 60; R(Math.round(rx + Math.cos(a) * RX), Math.round(ry + Math.sin(a) * 16), 3, 5, '#9c3412') }
  const bu = reduced ? 1 : clamp((e - 0.25) / 0.3, 0, 1), by = Math.round(ry - 46 + bu * 74), bx = rx - 6
  disc(bx, by, 17, OUTC); disc(bx, by, 15, '#E07A2E'); disc(bx - 5, by - 6, 5, '#F6A85C'); R(bx - 15, by, 31, 2, '#5a2a10'); R(bx, by - 15, 2, 31, '#5a2a10')
  const snap = reduced ? 0.4 : clamp(1 - Math.abs(e - 0.55) * 2.2, 0, 1)
  drawNet(rx, ry + 2, RX - 4, RX * 0.5, 64 * (1 + snap * 0.35), snap, reduced ? 0 : Math.sin(e * 30) * snap * 6, 4, 8, '#eef1f4', 2)
  const h = S.shooter || side(0)[0], s3 = 3, pz = bu >= 1 ? 'hang' : 'dunkSlam', spr = sprite(h, pz, 1, true, s3)
  const hf = POSES[pz].hF, hx = Math.round(SOX * s3 + hf[0] * s3), hy = Math.round(SOY * s3 + hf[1] * s3)
  G.drawImage(spr, Math.round(rx - RX + 14 - hx - (1 - ease) * 160), Math.round(ry - 6 - hy + (1 - ease) * 120))
  const bend = reduced ? 3 : 2 + snap * 5
  for (let i = 0; i <= 60; i++) { const a = Math.PI * i / 60; const x = Math.round(rx + Math.cos(a) * RX), y = Math.round(ry + Math.sin(a) * (16 + bend)); R(x, y, 3, 6, '#E2541F'); R(x, y, 3, 2, '#ff9a5a') }
  const kw = reduced ? 1 : clamp((e - 0.3) / 0.2, 0, 1), word = c.word, ks = 6, ww = tw(word, ks), wx = Math.round(16 - (1 - kw) * 200)
  R(wx - 8, 44, ww + 16, 60, 'rgba(5,7,13,.72)'); txtG(word, wx, 52, ks, GRAD, OUTC)
  const sub = W8.celeSub(TEAMS[S.you].abbr); txt(sub, wx, 112, '#ffffff', 2, OUTC)
}
function drawCele() {
  const c = S.cele, e = rt - c.t0, k = reduced ? 1 : clamp(e / 0.2, 0, 1), ease = 1 - (1 - k) * (1 - k)
  if (!reduced && e < 0.05) { R(0, 0, W, H, '#ffffff'); return }
  if (c.dunk) { drawDunkCele(c, e); return }
  burstBg(e)
  const bd = 35, h = S.shooter || side(0)[0], spr = sprite(h, c.heroPose || 'hero', 1, true, 3), hx = Math.round(-120 + ease * 190)
  G.drawImage(spr, hx, H - bd - 4 - spr.height + 30)
  const word = c.word, ks = 6, ww = tw(word, ks), wx = Math.round(W - 18 - ww + (1 - ease) * W * 0.57)
  R(wx - 10, 78, ww + 20, 70, 'rgba(5,7,13,.72)'); txtG(word, wx, 88, ks, GRAD, OUTC)
  const sub = W8.celeSub(TEAMS[S.you].abbr); txt(sub, W - 18 - tw(sub, 2), 162, '#ffffff', 2, OUTC)
}

// ───────────────────────── loop ─────────────────────────
let last = performance.now(), raf = 0, dead = false
function frame(now) {
  if (dead) return
  LITE.tick(now - last); const dt = Math.min(0.05, (now - last) / 1000); last = now; rt += dt; parts.step(dt)
  S.shake = Math.max(0, S.shake - dt * 14)
  S.netSnap = Math.max(0, S.netSnap - dt * 1.8); S.boardShake = Math.max(0, S.boardShake - dt * 2.4); S.rimBend = Math.max(0, S.rimBend - dt * 2.8)
  if (S.cele) { if (rt - S.cele.t0 >= S.cele.dur) { const t = S.cele.then; S.cele = null; t && t() } }
  else if (!S.paused && !S.band && !S.film && S.phase !== 'idle' && S.phase !== 'between' && S.phase !== 'over') {
    const g = dt * S.ts * (S.tutorial && !AUTO ? 0.75 : 1) * (AUTO ? 3 : 1); gt += g
    const due = timers.filter(t => t.at <= gt); timers = timers.filter(t => t.at > gt); due.forEach(t => t.fn())
    if (S.g && ['bringUp', 'callPlay', 'guard'].includes(S.phase)) guardSpots(S.g.offense)
    // the referee trails the play along the far sideline, facing the ball
    if (S.g && S.ref) { const R0 = S.ref; R0.tx = clamp(S.ball.x - dirOf(S.g.offense) * 7, -38, 38); R0.ty = 52; if (Math.abs(S.ball.x - R0.x) > 0.5) R0.face = Math.sign(S.ball.x - R0.x) }
    for (const p of [...S.players, S.ref]) {
      const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy), sp = (p.ref ? 9 : 11) * g
      if (d > 0.01) { const m = Math.min(1, sp / d); p.x += dx * m; p.y += dy * m }
      if (p.jump) { const u = (gt - p.jump.t0) / p.jump.dur; if (u >= 1) { p.jump = null; p.z = 0; pose(p, 'land', 0.2); dust(p.x, p.y, 5) } else p.z = 4 * p.jump.h * u * (1 - u) * 2.2 }
      // hanging on the rim after a dunk, then the drop
      if (p.hang) { if (gt < p.hang) p.z = HANG_Z; else { p.hang = 0; p.fall = { t0: gt, z0: p.z } } }
      if (p.fall) { const u = (gt - p.fall.t0) / 0.32; if (u >= 1) { p.fall = null; p.z = 0; pose(p, 'land', 0.25); dust(p.x, p.y, 10) } else p.z = p.fall.z0 * (1 - u * u) }
      if (p.poseUntil && gt > p.poseUntil) { p.pose = 'ready'; p.poseUntil = 0 }
    }
    ballStep()
    const b = S.ball; if (b.f && b.f.dur < 0.6) { const [x, y] = P(b.x, b.y, b.z); b.trail.push([x, y - 3]); if (b.trail.length > 3) b.trail.shift() } else b.trail.length = 0
  }
  // the camera eases after the ball, leaning toward the basket being attacked
  if (S.g) { const d = dirOf(S.g.offense), want = clamp(S.ball.x * 0.7 + d * RIM * 0.3, -CAMMAX, CAMMAX); camX += (want - camX) * Math.min(1, dt * (reduced ? 20 : 5)) }
  render(); raf = requestAnimationFrame(frame)
}

// ── the court before the tip ──
S.you = opts.you ?? 0; S.opp = opts.opp ?? 1
setStats(opts.stats || {}, opts.oppStrength ?? 5)
{ const y = TEAMS[S.you], o = TEAMS[S.opp], ok = kitFor(y, o)[0]; S.kits = { 0: ok, 1: kitFor(o, y).find(k => apart(ok.j, k.j)) || { j: '#2B2F36', t: '#F2F2F2' } } }
S.players = [...makeSide(0, rng(S.you * 31 + S.opp * 7 + 11)), ...makeSide(1, rng(S.opp * 17 + 4))]
// warm-ups: both teams at their own end, the ball at centre court
side(0).forEach((p, i) => { p.x = p.tx = -8 - i * 3; p.y = p.ty = 12 + i * 6; p.face = 1 })
side(1).forEach((p, i) => { p.x = p.tx = 8 + i * 3; p.y = p.ty = 12 + i * 6; p.face = -1 })
S.ball.x = 0; S.ball.y = 25; S.ball.z = 0.4
{ const r = rng(S.you * 5 + S.opp * 11 + 2); S.ref = { ref: true, side: 2, role: 'REF', x: 0, y: 52, z: 0, tx: 0, ty: 52, face: 1, pose: 'ready', poseUntil: 0, jump: null, skin: SKIN[Math.floor(r() * SKIN.length)], hair: HAIR[Math.floor(r() * HAIR.length)], hairStyle: 'buzz', num: null } }
buildCrowd(); buildWall(); buildFloor()
raf = requestAnimationFrame(frame)

return {
  start: (first, tutorial) => startGame(first === 'you' ? 0 : 1, tutorial),
  nextPeriod: () => { RU.nextPeriod(S.g); S.paused = false; report(); startPossession() },
  pause: () => { S.paused = true },
  resume: () => { S.paused = false },
  timeoutTaken,
  setReadBoost: on => { S.readBoost = !!on },
  setStats: (v, opp) => setStats(v, opp),
  setSteady: on => { S.steady = !!on },
  coachDone,
  // The run-through opens the game (the Pixel Standard). The art session adds the gym flyover.
  intro: then => { showFilm({ type: 'run', dur: reduced ? 1.2 : RUNTHROUGH_SECONDS, then }) },
  // The pep band at halftime, in the home school's colours (BK 18:37: "Band for halftime too").
  band: then => { S.band = { caption: W8.band, colors: home().c, floor: 'wood', t0: rt, dur: reduced ? 1.6 : BAND_SECONDS, then } },
  call: i => { const f = callFns[i]; if (f && !S.paused) f() },
  tap: () => { if (!S.paused) tap() },
  state: () => ({ score: S.g ? [...S.g.score] : [0, 0], period: S.g ? S.g.period : 1, poss: S.g ? S.g.poss : 0, timeouts: S.g ? S.g.timeouts : 0, phase: S.phase, offense: S.g ? S.g.offense : 0 }),
  ui: () => lastUI,
  destroy: () => { dead = true; cancelAnimationFrame(raf); removeEventListener('keydown', onKey); cv.removeEventListener('pointerdown', onDown) },
  _S: S,
  _rt: () => rt,
}
}
