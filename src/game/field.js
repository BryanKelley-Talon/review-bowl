// ============================================================
// THE FIELD — live snaps. Canvas, pixel-scaled, Retro Bowl feel.
//
// THIS FILE NEVER ASKS A QUESTION. Live snaps do not pause for content
// (FULL-SPEC §2.2, build-order rule 3). Content reaches this file only as numbers:
// `phys` — the stat layer's physics (ratings.js) — decides how tight the throws
// are, how far a receiver reaches, how long the line holds, how often a tackle
// breaks. Everything a student learned at the dead-ball gates shows up here as odds.
//
// CONTROLS (trackpad / mouse / touch first, keyboard in full):
//   before the throw   drag BACK from anywhere, release to throw (slingshot)
//                      tap a receiver = throw to him (led, like keys 1–4)
//                      quick tap anywhere else = the quarterback takes off running
//                      keys 1–4 throw to that receiver · Space runs · ↑/↓ slide in the pocket
//   ball carrier       hold and point up/down to steer · tap or Space to juke · ↑/↓ steer
//                      Dive button or D = dive · Jump button or J = jump (BK 2026-09-29 11:42)
//
// World units are yards. x runs 0–120 (0–10 own end zone, 110–120 theirs);
// y runs across the field, 0–53.3. In the WORLD the offense always drives toward
// x = 120. On SCREEN it drives right (dir 1) or left (dir -1): BK, 2026-09-23/26,
// "players should get to choose ... or it flips each quarter" (Tecmo Bowl did it).
// The flip lives in _toScreen/_toWorld and the arrow keys, nowhere else, so every
// rule, route and result is identical either way. Digits are never mirrored.
// ============================================================

import { heroSprite, playerSprite, SPRITE } from './sprites.js'
import { BAND_SECONDS, CELE_SECONDS, drawBand, drawCelebration } from './cutin.js'
import { OUTC, SKIN, HAIR, dith, lum, rng as prng, shade, tw, txt } from './pixel.js'
import { TEAMS } from './teams.js'
import { ROUTES_OF } from './plays.js'

export const VW = 480
export const VH = 270
const PX = 7
const VIEW_W = VW / PX
const VIEW_H = VH / PX
export const FIELD_W = 53.33
const C = FIELD_W / 2
// The slingshot (BK, 2026-09-28: "aiming, power, and moving receiver can be tough at times").
// AIM_GAIN: yards of throw per yard of pull. 3.6 puts a 55-yard throw inside a quarter of the
// field's width, a pull a trackpad can make (it was 2.6, about a third).
// MAGNET: an aim that lands within this many yards of a receiver, or of his LEAD SPOT (where he
// will be when the ball gets there), or of the line between them, locks onto him, and the throw
// is led at release, so a moving receiver is caught up with. The Throwing stat still sets the scatter ring around every throw.
const AIM_GAIN = 3.6
const MAX_THROW = 55
const MAGNET = 3.5
const TAP_HIT = 16            // logical px: a tap this close to a receiver (or his number) throws to him
// DIVE and JUMP (BK 2026-09-29, the kids' ask; words approved 11:42).
// DIVE: the carrier leaves his feet and falls forward DIVE_YDS. Nobody can tackle or
//   strip him mid-dive, and the play ends where he lands: the ball is safe, the run is over.
// JUMP: a hop over a low tackle. For JUMP_T nobody can bring him down. The cost: for
//   LAND_T after he lands, any tackle brings a ball-security question (Match asks it,
//   at the dead ball, like a flag; this file only marks the hit).
const DIVE_YDS = 1.6
const DIVE_T = 0.3
const JUMP_T = 0.45
const JUMP_CD = 1.6
const LAND_T = 1.0
const flightTime = d => clamp(d / 24, 0.35, 1.9)
// Distance from point p to the segment a–b.
const segDist = (p, a, b) => {
  const vx = b.x - a.x, vy = b.y - a.y, L = vx * vx + vy * vy
  const k = L ? Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / L)) : 0
  return Math.hypot(p.x - (a.x + vx * k), p.y - (a.y + vy * k))
}
const arcOf = T => Math.min(6, T * 3.2)

const DIGITS = {
  0: ['111', '101', '101', '101', '111'], 1: ['010', '110', '010', '010', '111'], 2: ['111', '001', '111', '100', '111'],
  3: ['111', '001', '111', '001', '111'], 4: ['101', '101', '111', '001', '001'], 5: ['111', '100', '111', '001', '111'],
  6: ['111', '100', '111', '101', '111'], 7: ['111', '001', '001', '001', '001'], 8: ['111', '101', '111', '101', '111'],
  9: ['111', '101', '111', '001', '111'],
}

const ROUTES = {
  go: [[30, 0]], slant: [[3, 0], [15, 9]], out: [[8, 0], [9, -9]], in: [[8, 0], [9, 12]],
  post: [[10, 0], [25, 9]], corner: [[10, 0], [22, -9]], curl: [[10, 0], [8, 1.5]], comeback: [[14, 0], [11, -3]],
  seam: [[25, 1]],
}
const STOP_AT_END = new Set(['curl', 'comeback'])
const WR_ROUTES = Object.keys(ROUTES)
const RB_ROUTES = ['flat', 'wheel', 'check', 'block']

// Is this colour light enough that dark detail reads on top of it?
const light = hex => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))
  return (r * 299 + g * 587 + b * 114) / 1000 > 140
}

const rand = (a, b) => a + Math.random() * (b - a)
const pick = arr => arr[Math.floor(Math.random() * arr.length)]
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

function moveToward(e, tx, ty, speed, dt) {
  const dx = tx - e.x, dy = ty - e.y
  const d = Math.hypot(dx, dy)
  if (d < 1e-3) { e.vx = 0; e.vy = 0; return }
  const s = Math.min(speed, d / dt)
  e.vx = dx / d * s; e.vy = dy / d * s
  e.x += e.vx * dt; e.y += e.vy * dt
}

export class FieldEngine {
  constructor(canvas, callbacks = {}) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    canvas.width = VW
    canvas.height = VH
    this.ctx.imageSmoothingEnabled = false
    this.cb = callbacks
    this.state = 'idle'
    this.cam = { x: 40, y: C }
    this.keys = {}
    this.pointer = null
    this.players = []
    // Feedback on the big moments (iteration order §3): a flash and a shake, no sound —
    // BK ruled audio out, a classroom is the wrong room for it. Reduced motion keeps
    // the flash and drops the shake.
    this.fx = { flash: 0, color: '#F5CB63', shake: 0 }
    this.calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
    this.t = 0
    this.dir = 1
    this.last = performance.now()
    // The 16-bit reskin (BK 2026-10-03): the stadium is painted once per game, per field
    // direction; the cut-ins and the halftime band draw over the field and are a tap to skip.
    this.stadium = { 1: null, '-1': null }
    this.teams = null
    this.overlay = null
    this._bind()
    // Dev only: lets a test script step the field when the tab is hidden (rAF pauses). Never in a build.
    if (import.meta.env?.DEV) window.__rbEngine = this
    this._loop = this._loop.bind(this)
    this.raf = requestAnimationFrame(this._loop)
  }

  // 1 = offense drives left→right on screen; -1 = right→left. Set between snaps.
  setDirection(d) { this.dir = d === -1 ? -1 : 1 }

  destroy() {
    cancelAnimationFrame(this.raf)
    this._unbind()
  }

  // ── the stadium, the cut-ins and the band (the 16-bit reskin, 2026-10-03) ───
  // home: your school (the crowd and the wall wear its colours); away: the other side.
  // Your five key players' numbers from the roster (teams.js), so the QB on the field is the QB
  // on the team page. Everyone else gets a made-up number for his position.
  setNumbers(numbers) { this.numbers = numbers }

  setStadium(home, away) {
    if (this.teams && this.teams.home === home && this.teams.away === away) return
    this.teams = { home, away }
    this.stadium = { 1: null, '-1': null }
  }

  // A Tecmo-style cut-in. kind 'short' is the quick one (first downs). then: after it ends or is skipped.
  celebrate(word, sub, kind = 'long', then) {
    const k = this.kits?.offense || { jersey: '#444', helmet: '#ddd', pants: '#ddd' }
    const dur = this.calm ? 1.0 : CELE_SECONDS[kind] || CELE_SECONDS.long
    this.overlay = { type: 'cele', word, sub, kit: { j: k.jersey, t: k.helmet }, k, t0: performance.now() / 1000, dur, then }
  }

  band(caption, colors, then) {
    this.overlay = { type: 'band', caption, colors, floor: 'grass', t0: performance.now() / 1000, dur: this.calm ? 1.6 : BAND_SECONDS, then }
  }

  skipOverlay() {
    const o = this.overlay
    if (!o) return false
    this.overlay = null
    o.then && o.then()
    return true
  }

  _buildStadium(dir) {
    const X0 = -22, X1 = 142, Y0 = -16, Y1 = FIELD_W + 16
    const cv = document.createElement('canvas')
    cv.width = Math.round((X1 - X0) * PX); cv.height = Math.round((Y1 - Y0) * PX)
    const g = cv.getContext('2d')
    const bx = x => Math.round((dir === 1 ? x - X0 : X1 - x) * PX)
    const by = y => Math.round((y - Y0) * PX)
    const rect = (x0, y0, x1, y1, c) => { const a = bx(x0), b = bx(x1); g.fillStyle = c; g.fillRect(Math.min(a, b), by(y0), Math.abs(b - a), by(y1) - by(y0)) }
    const home = this.teams?.home || TEAMS[0], away = this.teams?.away || TEAMS[1]
    const r = prng((TEAMS.indexOf(home) + 3) * 97 + TEAMS.indexOf(away))
    // concrete bowl and the apron around the turf
    g.fillStyle = '#2a2f3a'; g.fillRect(0, 0, cv.width, cv.height)
    rect(-8, -1.4, 128, FIELD_W + 1.4, '#2c6a2a')
    dith(g, 0, by(-1.4), cv.width, by(FIELD_W + 1.4) - by(-1.4), 'rgba(0,0,0,.08)')
    // the padded wall, home colour, a lit top edge; the league's banners hang on the far one
    const pad = lum(home.colors[0]) < 0.12 ? shade(home.colors[1], -0.25) : home.colors[0]
    for (const [y0, y1] of [[-3.8, -1.4], [FIELD_W + 1.4, FIELD_W + 3.8]]) {
      rect(-12, y0, 132, y1, pad); rect(-12, y0, 132, y0 + 0.25, shade(pad, 0.35)); rect(-12, y1 - 0.25, 132, y1, shade(pad, -0.45))
    }
    for (let i = 0, x = -6; x < 124; i++, x += 10.5) {
      const t = TEAMS[i % TEAMS.length], a = Math.min(bx(x), bx(x + 6)), y = by(-3.6) + 1
      g.fillStyle = OUTC; g.fillRect(a - 1, y - 1, 44, 16)
      g.fillStyle = t.colors[0]; g.fillRect(a, y, 42, 14)
      g.fillStyle = 'rgba(255,255,255,.16)'; g.fillRect(a, y, 42, 5)
      g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(a, y + 10, 42, 4)
      g.fillStyle = t.colors[1]; g.fillRect(a, y, 42, 1); g.fillRect(a, y + 13, 42, 1)
      const ink = Math.abs(lum(t.colors[0]) - lum(t.colors[1])) > 0.42 ? t.colors[1] : (lum(t.colors[0]) > 0.5 ? '#111111' : '#ffffff')
      txt(g, t.abbr, a + 21 - tw(t.abbr) / 2, y + 4, ink)
    }
    // the crowd: stepped rows, home colours heavy, a few in the visitors'
    const crowd = (y0, y1) => {
      for (let row = 0; by(y0) + row * 6 < by(y1) - 4; row++) {
        const yy = by(y0) + row * 6
        g.fillStyle = row % 2 ? '#3a2b1f' : '#33261b'; g.fillRect(0, yy, cv.width, 6)
        g.fillStyle = '#7b5a3a'; g.fillRect(0, yy + 4, cv.width, 1)
        for (let x = 2 + (row % 2) * 3; x < cv.width - 3; x += 6) {
          if (r() < 0.08) continue
          const pick = r()
          const shirt = pick < 0.58 ? home.colors[Math.floor(r() * home.colors.length)] : pick < 0.8 ? away.colors[Math.floor(r() * away.colors.length)] : ['#d0d4dc', '#6b7280', '#2f3b55', '#8b2c2c', '#3d6b4a'][Math.floor(r() * 5)]
          const xx = x + Math.floor(r() * 2)
          g.fillStyle = shirt; g.fillRect(xx - 1, yy + 2, 4, 3)
          g.fillStyle = SKIN[Math.floor(r() * SKIN.length)]; g.fillRect(xx, yy - 1, 2, 3)
          g.fillStyle = HAIR[Math.floor(r() * HAIR.length)]; g.fillRect(xx, yy - 1, 2, 1)
        }
      }
    }
    crowd(Y0, -3.8); crowd(FIELD_W + 3.8, Y1)
    // behind the end zones: the stands curve round
    for (const [x0, x1] of [[X0, -12], [132, X1]]) {
      const a = Math.min(bx(x0), bx(x1)), w = Math.abs(bx(x1) - bx(x0))
      for (let yy = by(-3.8); yy < by(FIELD_W + 3.8); yy += 6) {
        g.fillStyle = (yy / 6) % 2 ? '#3a2b1f' : '#33261b'; g.fillRect(a, yy, w, 6)
        for (let x = a + 2; x < a + w - 3; x += 6) { if (r() < 0.1) continue; g.fillStyle = r() < 0.6 ? home.colors[0] : '#6b7280'; g.fillRect(x, yy + 2, 4, 3); g.fillStyle = SKIN[Math.floor(r() * 6)]; g.fillRect(x + 1, yy - 1, 2, 3) }
      }
      const px = Math.min(bx(x0 < 0 ? -12 : 132), bx(x0 < 0 ? -12.6 : 132.6))
      g.fillStyle = pad; g.fillRect(px, by(-3.8), Math.round(0.6 * PX) + 1, by(FIELD_W + 3.8) - by(-3.8))
    }
    return { cv, X0, X1, Y0 }
  }

  _drawStadium(g) {
    let st = this.stadium[this.dir]
    if (!st) st = this.stadium[this.dir] = this._buildStadium(this.dir)
    const sx = Math.round(((this.dir === 1 ? st.X0 : st.X1) - this.cam.x) * PX * this.dir + VW / 2)
    const sy = Math.round((st.Y0 - this.cam.y) * PX + VH / 2)
    g.drawImage(st.cv, sx, sy)
  }

  // Goalposts at the back of each end zone, drawn standing up off the field (Tecmo's way).
  _drawPosts(g) {
    for (const x of [0, 120]) {
      const base = this._toScreen(x, C), top = this._toScreen(x, C - 3.1), bot = this._toScreen(x, C + 3.1)
      if (base.x < -20 || base.x > VW + 20) continue
      g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(base.x - 1, top.y, 3, bot.y - top.y)
      g.fillStyle = OUTC; g.fillRect(base.x - 2, base.y - 13, 4, 14); g.fillRect(base.x - 2, top.y - 25, 4, bot.y - top.y - 2 + 4)
      g.fillStyle = '#f2c230'; g.fillRect(base.x - 1, base.y - 12, 2, 12)
      g.fillRect(base.x - 1, top.y - 24, 2, bot.y - top.y)                                  // crossbar, seen end-on
      g.fillStyle = OUTC; g.fillRect(base.x - 2, top.y - 40, 4, 18); g.fillRect(base.x - 2, bot.y - 40, 4, 18)
      g.fillStyle = '#f5d24a'; g.fillRect(base.x - 1, top.y - 39, 2, 16); g.fillRect(base.x - 1, bot.y - 39, 2, 16)
    }
  }

  _drawOverlay(g) {
    const o = this.overlay
    if (!o) return
    const e = performance.now() / 1000 - o.t0
    if (e >= o.dur) { this.overlay = null; o.then && o.then(); return }
    if (o.type === 'band') drawBand(g, VW, VH, o, e, this.calm)
    else drawCelebration(g, VW, VH, o, e, () => heroSprite(o.k, (this.numbers && this.numbers.QB) || 7, 2, 2), this.calm)
  }

  // ── set a play up ──────────────────────────────────────────────────────────
  // ballOn: 0–100 from the offense's own goal. kits: {offense, defense}. phys: ratings.physics().
  // play: a called play from plays.js (or null: the old random routes). guessed: the other side
  // called the same play (BK 16:06), so one defender beats his block at the snap.
  setup({ ballOn, toGo, kits, phys, goal = false, play = null, guessed = false }) {
    this.play = play
    this.guessed = !!guessed
    this.runPlan = null
    this.los = 10 + ballOn
    this.firstDown = goal ? 110 : Math.min(110, this.los + toGo)
    this.kits = kits
    this.phys = phys
    this.ball = null
    this.carrier = null
    this.aim = null
    this.result = null
    this.juke = 0
    this.jukeCd = 0
    this.dive = 0
    this.jump = 0
    this.jumpCd = 0
    this.landT = 0
    this.t = 0
    const L = this.los
    const P = (role, team, x, y, extra = {}) => ({ role, team, x, y, vx: 0, vy: 0, hist: [], stun: 0, ...extra })
    const qb = P('QB', 'o', L - 4, C)
    const rb = P('RB', 'o', L - 5, C + 2.5, { label: 4, route: pick(RB_ROUTES), side: Math.random() < 0.5 ? -1 : 1 })
    const ol = [-2, 0, 2].map(d => P('OL', 'o', L - 1, C + d))
    const wr = [
      P('WR', 'o', L - 1, C - 15, { label: 1 }),
      P('WR', 'o', L - 1, C + 15, { label: 2 }),
      P('TE', 'o', L - 1.5, C - 7.5, { label: 3 }),
    ]
    for (const w of wr) { w.route = pick(WR_ROUTES); w.wp = 0; w.start = { x: w.x, y: w.y }; w.s = w.y < C ? 1 : -1 }
    rb.wp = 0; rb.start = { x: rb.x, y: rb.y }
    // A called play fixes the routes (plays.js). A run: the back takes the handoff and the
    // sweep goes to his side of the formation.
    const R = play && ROUTES_OF[play.id]
    if (R) {
      wr[0].route = R.wr1; wr[1].route = R.wr2; wr[2].route = R.te
      if (play.kind === 'run') rb.route = 'run'
      else rb.route = R.rb
    }
    const dl = [-2.5, 0.5, 2.5].map((d, i) => P('DL', 'd', L + 1, C + d, { blocker: ol[i], blockT: phys.blockTime + rand(-0.35, 0.45) }))
    if (rb.route === 'block') dl[1].blockT += 0.8
    // They read it (BK 16:06). On a pass, the middle of their line is through at the snap. On a
    // run, one defender plays the run before it starts: the nose shoots the dive's hole, and the
    // edge linebacker on the sweep's side races to the corner. Unblocked, either way.
    this.reader = null
    if (this.guessed) {
      dl[1].blockT = 0.15
      if (play && play.kind === 'run') {
        const side = play.id === 'sweep' ? (wr[2].y < C ? -1 : 1) : (rb.y > C ? 1 : -1)
        this.reader = play.id === 'dive' ? dl[1] : null
        this.readerSpot = play.id === 'dive' ? { x: L - 1.5, y: C + side * 1.0 } : { x: L - 1, y: clamp(C + side * 10, 3, FIELD_W - 3) }
        this.readerSide = side
      }
    }
    const cb1 = P('CB', 'd', L + 6, wr[0].y, { assign: wr[0] })
    const cb2 = P('CB', 'd', L + 6, wr[1].y, { assign: wr[1] })
    const sf = P('S', 'd', L + 11, C - 6, { assign: wr[2] })
    const lb1 = P('LB', 'd', L + 5, C + 5, { assign: rb.route === 'block' || rb.route === 'run' ? null : rb })
    const lb2 = P('LB', 'd', L + 5, C - 4, { zone: true })
    if (this.guessed && play && play.id === 'sweep') this.reader = this.readerSide > 0 ? lb1 : lb2
    this.qb = qb
    this.targets = [...wr, rb]
    this.offense = [qb, rb, ...ol, ...wr]
    this.defense = [...dl, cb1, cb2, sf, lb1, lb2]
    this.players = [...this.offense, ...this.defense]
    // 16-bit look: every player has his own skin tone and a jersey number (made up, never a roster).
    const nums = { QB: [1, 19], RB: [20, 39], OL: [60, 79], WR: [80, 89], TE: [40, 49], DL: [90, 99], LB: [50, 59], CB: [20, 39], S: [20, 49] }
    for (const pl of this.players) {
      const [lo, hi] = nums[pl.role] || [10, 99]
      pl.skin = Math.floor(Math.random() * 6)
      pl.num = (this.numbers && pl.team === 'o' && this.numbers[pl.role]) || lo + Math.floor(Math.random() * (hi - lo + 1))
    }
    this.state = 'presnap'
    this.cam.x = this._camX(qb.x)
    this.cam.y = C
  }

  snap() {
    if (this.state !== 'presnap') return
    // The snap itself is Space (handled by Match). Hold it a beat too long and the
    // engine would read the same press as "take off running", so Space stays locked
    // out until it is released.
    this.spaceLocked = !!this.keys[' ']
    this.t = 0
    // A called run: a short handoff, then the back has it.
    if (this.play && this.play.kind === 'run') { this.state = 'handoff'; this._phase('handoff'); return }
    this.state = 'dropback'
    this._phase('dropback')
  }

  _phase(p) { if (this.cb.onPhase) this.cb.onPhase(p) }

  // One call for every "that mattered" moment on the field.
  _boom({ flash = 0, color = '#F5CB63', shake = 0 }) {
    this.fx.flash = Math.max(this.fx.flash, this.calm ? flash * 0.5 : flash)
    this.fx.color = color
    this.fx.shake = this.calm ? 0 : Math.max(this.fx.shake, shake)
  }

  // ── input ──────────────────────────────────────────────────────────────────
  _bind() {
    this._skip = e => {
      if (!this.overlay) return
      if (e.type === 'keydown' && ![' ', 'Enter', 'Escape'].includes(e.key)) return
      e.preventDefault(); e.stopImmediatePropagation()
      this.skipOverlay()
    }
    this.canvas.addEventListener('pointerdown', this._skip, true)
    window.addEventListener('keydown', this._skip, true)
    this._down = e => {
      if (!['dropback', 'run'].includes(this.state)) return
      e.preventDefault()
      this.canvas.setPointerCapture?.(e.pointerId)
      const p = this._logical(e)
      this.pointer = { x0: p.x, y0: p.y, x: p.x, y: p.y, t0: performance.now(), held: true, moved: 0 }
    }
    this._move = e => {
      if (!this.pointer) return
      const p = this._logical(e)
      this.pointer.moved = Math.max(this.pointer.moved, Math.hypot(p.x - this.pointer.x0, p.y - this.pointer.y0))
      this.pointer.x = p.x; this.pointer.y = p.y
      if (this.state === 'dropback' && this.pointer.moved > 10) this._updateAim()
    }
    this._up = e => {
      const ptr = this.pointer
      this.pointer = null
      if (!ptr) return
      if (this.state === 'dropback') {
        if (this.aim && ptr.moved > 10) {
          if (this.aim.r) this._throwTo(this.aim.r)
          else this._throw(this.aim.x, this.aim.y)
        } else if (ptr.moved <= 10) {
          const r = this._tappedReceiver(ptr)
          if (r) this._throwTo(r)
          else this._qbRun()
        }
        this.aim = null
      } else if (this.state === 'run') {
        if (ptr.moved <= 10 && performance.now() - ptr.t0 < 260) this._doJuke()
      }
    }
    this._key = (e, down) => {
      // Left/right arrows follow the SCREEN: with the field flipped, → still means "toward
      // the right edge of the screen", which is now backward for the offense.
      const k = this.dir === -1 && e.key === 'ArrowLeft' ? 'ArrowRight' : this.dir === -1 && e.key === 'ArrowRight' ? 'ArrowLeft' : e.key
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(k) && this.state !== 'presnap' && this.state !== 'idle') e.preventDefault()
      this.keys[k] = down
      if (k === ' ' && !down) this.spaceLocked = false
      if (!down || e.repeat) return
      const space = k === ' ' && !this.spaceLocked
      if (this.state === 'dropback') {
        if (/^[1-4]$/.test(k)) { const r = this.targets.find(t => t.label === Number(k)); if (r) this._throwTo(r) }
        else if (space) this._qbRun()
      } else if (this.state === 'run') {
        if (space) this._doJuke()
        else if (k === 'd' || k === 'D') this._doDive()
        else if (k === 'j' || k === 'J') this._doJump()
      }
    }
    this._kd = e => this._key(e, true)
    this._ku = e => this._key(e, false)
    this.canvas.addEventListener('pointerdown', this._down)
    this.canvas.addEventListener('pointermove', this._move)
    this.canvas.addEventListener('pointerup', this._up)
    this.canvas.addEventListener('pointercancel', this._up)
    window.addEventListener('keydown', this._kd)
    window.addEventListener('keyup', this._ku)
  }

  _unbind() {
    this.canvas.removeEventListener('pointerdown', this._skip, true)
    window.removeEventListener('keydown', this._skip, true)
    this.canvas.removeEventListener('pointerdown', this._down)
    this.canvas.removeEventListener('pointermove', this._move)
    this.canvas.removeEventListener('pointerup', this._up)
    this.canvas.removeEventListener('pointercancel', this._up)
    window.removeEventListener('keydown', this._kd)
    window.removeEventListener('keyup', this._ku)
  }

  _logical(e) {
    const r = this.canvas.getBoundingClientRect()
    return { x: (e.clientX - r.left) / r.width * VW, y: (e.clientY - r.top) / r.height * VH }
  }
  _toWorld(p) { return { x: (p.x - VW / 2) / (PX * this.dir) + this.cam.x, y: (p.y - VH / 2) / PX + this.cam.y } }
  _toScreen(x, y) { return { x: Math.round((x - this.cam.x) * PX * this.dir + VW / 2), y: Math.round((y - this.cam.y) * PX + VH / 2) } }
  _camX(x) { return clamp(x + 12, VIEW_W / 2 - 4, 120 - VIEW_W / 2 + 4) }

  _updateAim() {
    const p = this.pointer
    let dx = (p.x0 - p.x) / PX * AIM_GAIN * this.dir
    let dy = (p.y0 - p.y) / PX * AIM_GAIN
    const d = Math.hypot(dx, dy)
    if (d > MAX_THROW) { dx *= MAX_THROW / d; dy *= MAX_THROW / d }
    const raw = { x: this.qb.x + dx, y: this.qb.y + dy }
    // Lock onto a receiver when the aim lands on him, on his lead spot, or anywhere on the
    // line between the two. Aim at the man and the ball goes where he will be.
    let best = null
    for (const r of this.targets) {
      if (r.role === 'RB' && r.route === 'block') continue
      const s = this._leadSpot(r)
      const dd = segDist(raw, r, s)
      if (dd <= MAGNET && (!best || dd < best.dd)) best = { r, s, dd }
    }
    this.aim = best ? { x: best.s.x, y: best.s.y, r: best.r } : raw
  }

  // Where a receiver will be when a ball thrown to him now arrives: his ROUTE is run forward
  // for the ball's flight time (the same _runRoute() he will actually run), so the lead follows
  // his cut instead of a straight line off his current heading. Keyboard, tap and locked
  // slingshot throws all use it; the flight time is the one _throw() gives the ball.
  _leadSpot(r) {
    const ahead = T => {
      const g = { ...r }
      for (let t = 0; t < T; t += 1 / 60) this._runRoute(g, 1 / 60)
      return g
    }
    let spot = r
    for (let i = 0; i < 3; i++) spot = ahead(flightTime(Math.hypot(spot.x - this.qb.x, spot.y - this.qb.y)))
    return { x: spot.x, y: spot.y }
  }

  // A tap on a receiver, or on the number above him, picks him.
  _tappedReceiver(ptr) {
    let best = null
    for (const r of this.targets) {
      if (r.role === 'RB' && r.route === 'block') continue
      const s = this._toScreen(r.x, r.y)
      const dd = Math.min(Math.hypot(ptr.x0 - s.x, ptr.y0 - s.y), Math.hypot(ptr.x0 - s.x, ptr.y0 - (s.y - 20)))
      if (dd <= TAP_HIT && (!best || dd < best.dd)) best = { r, dd }
    }
    return best ? best.r : null
  }

  _pressure() {
    return this.defense.some(d => d.role === 'DL' && this.t > d.blockT && dist(d, this.qb) < 3)
  }

  _throw(tx, ty) {
    if (this.state !== 'dropback' || this.qb.x > this.los) return
    const scatter = this.phys.throwJitter * (this._pressure() ? 1.6 : 1) * Math.sqrt(Math.random())
    const ang = Math.random() * Math.PI * 2
    const to = { x: tx + Math.cos(ang) * scatter, y: ty + Math.sin(ang) * scatter }
    const d = Math.hypot(to.x - this.qb.x, to.y - this.qb.y)
    const T = flightTime(d)
    this.ball = { from: { x: this.qb.x, y: this.qb.y }, to, t: 0, T, arc: arcOf(T) }
    this.state = 'air'
    this._phase('air')
  }

  // Keyboard, tap and locked-slingshot throws: lead the receiver to where he will be
  // when the ball arrives.
  _throwTo(r) {
    const s = this._leadSpot(r)
    this._throw(s.x, s.y)
  }

  _qbRun() {
    if (this.state !== 'dropback') return
    this.carrier = this.qb
    this.carrier.speed = this.phys.qbSpeed
    this.state = 'run'
    this._phase('run')
  }

  // The on-screen Dive and Jump buttons call these.
  dive() { this._doDive() }
  jump() { this._doJump() }

  _doDive() {
    if (this.state !== 'run' || this.dive > 0) return
    this.dive = DIVE_T
    this.jump = 0
    this.juke = 0
  }

  _doJump() {
    if (this.state !== 'run' || this.dive > 0 || this.jump > 0 || this.jumpCd > 0) return
    this.jump = JUMP_T
    this.jumpCd = JUMP_CD
  }

  _doJuke() {
    if (this.state !== 'run' || this.jukeCd > 0 || this.dive > 0) return
    this.juke = 0.38
    this.jukeCd = 1.2
    const near = this.defense.filter(d => !d.stun).sort((a, b) => dist(a, this.carrier) - dist(b, this.carrier))[0]
    this.jukeDir = near ? (near.y > this.carrier.y ? -1 : 1) : 1
  }

  // ── the simulation ─────────────────────────────────────────────────────────
  _loop(now) {
    // Fixed substeps, so a slow Chromebook (or a throttled background tab) plays the
    // same game at a lower frame rate rather than in slow motion.
    let elapsed = Math.min(0.5, (now - this.last) / 1000)
    this.last = now
    while (elapsed > 0 && ['handoff', 'dropback', 'air', 'run', 'dead'].includes(this.state)) {
      const dt = Math.min(1 / 60, elapsed)
      this._step(dt)
      elapsed -= dt
    }
    this._draw(now / 1000)
    this.raf = requestAnimationFrame(this._loop)
  }

  _step(dt) {
    this.t += dt
    if (this.fx.flash > 0) this.fx.flash = Math.max(0, this.fx.flash - dt * 2.4)
    if (this.fx.shake > 0) this.fx.shake = Math.max(0, this.fx.shake - dt * 14)
    const ph = this.phys
    for (const p of this.players) {
      p.hist.push({ x: p.x, y: p.y, t: this.t })
      if (p.hist.length > 40) p.hist.shift()
      if (p.stun > 0) p.stun -= dt
    }
    if (this.state === 'dead') {
      this.deadT -= dt
      if (this.deadT <= 0) { this.state = 'idle'; if (this.cb.onPlayEnd) this.cb.onPlayEnd(this.result) }
      return
    }

    // The handoff (a called run): the quarterback turns, the back takes it at the mesh.
    if (this.state === 'handoff') {
      const qb = this.qb, rb = this.targets.find(t => t.role === 'RB')
      qb.x -= 2.2 * dt
      moveToward(rb, qb.x - 0.4, qb.y + 0.9, ph.runSpeed, dt)
      if (this.t >= 0.38) {
        this.carrier = rb
        rb.speed = ph.runSpeed
        // The dive hits the hole on the back's side; the sweep goes to the tight end's side,
        // so he's there to seal the edge.
        const side = this.play.id === 'sweep' ? this._sweepSide() : (rb.y > C ? 1 : -1)
        this.runPlan = this.play.id === 'sweep'
          ? { y: clamp(C + side * 13, 3, FIELD_W - 3), until: this.t + 1.2, lateral: true, side }
          : { y: C + side * 1.0, until: this.t + 0.6, lateral: false, side }
        // The blocking scheme. Dive: the guards hold their men, the nose is shoved out of the hole
        // (unless they read it), the center climbs to the near linebacker, the tight end takes
        // the other. Sweep: the line pulls and leads (below), the tight end seals the edge.
        const ol = this.offense.filter(q => q.role === 'OL'), te = this.targets.find(t => t.role === 'TE')
        const dl = this.defense.filter(q => q.role === 'DL'), lbs = this.defense.filter(q => q.role === 'LB')
        const hole = { x: this.los + 1, y: this.runPlan.y }
        lbs.sort((a, b) => dist(a, hole) - dist(b, hole))
        if (this.play.id === 'dive') {
          ol[1].blockTarget = lbs[0]
          if (te) te.blockTarget = lbs[1]
        } else if (te) {
          te.blockTarget = lbs.filter(l => l !== this.reader).sort((a, b) => Math.abs(a.y - this.runPlan.y) - Math.abs(b.y - this.runPlan.y))[0] || null
        }
        if (this.reader && this.play.id === 'dive') { ol[1].blockTarget = lbs[0]; if (te) te.blockTarget = lbs[1] }
        // On the sweep the receiver on that side stalks the corner in front of him.
        if (this.play.id === 'sweep') {
          const wr = this.targets.filter(t => t.role === 'WR').find(w => Math.sign(w.y - C) === this.runPlan.side)
          const cb = this.defense.filter(d => d.role === 'CB').sort((a, b) => dist(a, wr) - dist(b, wr))[0]
          if (wr && cb && cb !== this.reader) wr.blockTarget = cb
        }
        this.state = 'run'
        this._phase('run')
      }
    }

    // Quarterback: drop, then hold; arrows slide him in the pocket.
    if (this.state === 'dropback') {
      const qb = this.qb
      if (this.t < 0.6) qb.x -= 4.2 * dt
      const k = this.keys
      if (k.ArrowUp) qb.y -= ph.qbSpeed * 0.6 * dt
      if (k.ArrowDown) qb.y += ph.qbSpeed * 0.6 * dt
      if (k.ArrowLeft) qb.x -= ph.qbSpeed * 0.5 * dt
      if (k.ArrowRight) qb.x += ph.qbSpeed * 0.5 * dt
      qb.y = clamp(qb.y, 1, FIELD_W - 1)
      if (qb.x > this.los + 0.5) this._qbRun()
      if (this.pointer && this.pointer.moved > 10) this._updateAim()
    }

    // Routes. The ball in the air pulls nearby receivers to it.
    for (const r of this.targets) {
      if (r === this.carrier) continue
      if (r.blockTarget && this.state === 'run') continue
      if (this.state === 'air' && dist(r, this.ball.to) < 6) { moveToward(r, this.ball.to.x, this.ball.to.y, ph.runSpeed, dt); continue }
      if (this.state === 'run') { r.x += ph.runSpeed * 0.35 * dt; continue }
      this._runRoute(r, dt)
    }

    // Line: blockers hold their spot; the ball carrier's line keeps pushing a little.
    // On a called run they block for real: the sweep's linemen pull and lead to the outside,
    // the dive's push straight ahead. A defender a lead blocker reaches is held a while,
    // longer the better the team's Blocking (phys.blockTime).
    const calledRun = this.play && this.play.kind === 'run' && this.state === 'run'
    // Drive to a man; on contact, hold him for a while (longer with better Blocking). One block
    // per blocker per play: once he's shed, the blocker is out of the play.
    const block = (b, t) => {
      if (t === this.reader) return false
      if (b.holding === t) { if (t.held > 0) { b.x = t.x - 0.7; b.y = t.y } return true }
      if (b.spent) return false
      if (dist(b, t) < 1.25) { t.held = ph.blockTime * 0.4; b.holding = t; b.spent = true; return true }
      moveToward(b, t.x - 0.5, t.y, ph.runSpeed * 0.9, dt)
      return false
    }
    for (const o of this.offense) {
      if (o.role !== 'OL' && !(calledRun && o.blockTarget)) continue
      if (calledRun && this.runPlan) {
        const c = this.carrier, i = this.offense.filter(q => q.role === 'OL').indexOf(o)
        if (o.blockTarget && !o.spent) { block(o, o.blockTarget); continue }
        if (o.holding) { block(o, o.holding); if (o.holding.held > 0) continue }
        if (o.spent) { o.x += 0.6 * dt; continue }
        if (this.play.id === 'sweep') moveToward(o, c.x + 2.5 + i * 1.4, c.y + this.runPlan.side * (1 + i * 1.1), ph.runSpeed, dt)
        else o.x += 1.1 * dt
        const near = this.defense.find(d => !(d.held > 0) && d.stun <= 0 && d.role !== 'DL' && d !== this.reader && dist(d, o) < 1.3)
        if (near) block(o, near)
      } else if (o.role === 'OL') o.x += (Math.random() - 0.5) * 0.6 * dt
    }

    // Defense.
    const readBonus = ph.reaction
    for (const d of this.defense) {
      if (d.stun > 0) continue
      if (d.held > 0) { d.held -= dt; continue }
      if (d === this.reader && (this.state === 'handoff' || this.state === 'run')) {
        const sp = this.readerSpot, c = this.carrier
        if (c && (c.x > sp.x + 1 || dist(d, sp) < 0.6)) moveToward(d, c.x + c.vx * 0.2, c.y + c.vy * 0.2, ph.pursuitSpeed * 1.05, dt)
        else moveToward(d, sp.x, sp.y, ph.pursuitSpeed * 1.15, dt)
        continue
      }
      // A called run: the line is still engaged until its block gives (the same clock a pass uses).
      if (calledRun && d.role === 'DL' && this.t < d.blockT) continue
      if (this.state === 'run') {
        const c = this.carrier
        moveToward(d, c.x + c.vx * 0.35, c.y + c.vy * 0.35, ph.pursuitSpeed * (d.role === 'DL' ? 0.85 : 1), dt)
        continue
      }
      if (d.role === 'DL') {
        if (this.t < d.blockT) { d.x = d.blocker.x + 1 + Math.sin(this.t * 17 + d.y) * 0.15; d.y += (d.blocker.y - d.y) * 0.1; continue }
        moveToward(d, this.qb.x, this.qb.y, ph.rushSpeed, dt)
        if (this.state === 'dropback' && dist(d, this.qb) < 0.9) this._end('sack', this.qb)
        continue
      }
      if (this.state === 'air' && dist(d, this.ball.to) < 7) { moveToward(d, this.ball.to.x, this.ball.to.y, ph.defSpeed, dt); continue }
      if (d.assign) {
        const h = d.assign.hist
        const back = h.find(s => s.t >= this.t - readBonus) || h[h.length - 1] || d.assign
        moveToward(d, back.x + 0.8, back.y + (d.assign.y < C ? 0.4 : -0.4), ph.defSpeed, dt)
      } else if (d.zone) {
        moveToward(d, this.los + 5, clamp(this.qb.y, C - 8, C + 8), ph.defSpeed * 0.7, dt)
      } else {
        moveToward(d, this.los + 4, this.qb.y, ph.defSpeed * 0.6, dt)
      }
    }

    if (this.state === 'air') this._flyBall(dt)
    if (this.state === 'run') this._runCarrier(dt)
  }

  _runRoute(r, dt) {
    const ph = this.phys
    if (r.role === 'RB') {
      const s = r.side
      const path = { flat: [[2, 6 * s], [6, 12 * s]], wheel: [[2, 8 * s], [20, 12 * s]], check: [[4, 0], [6, 2 * s]] }[r.route]
      if (!path) { moveToward(r, this.qb.x + 1, this.qb.y + 1.5 * s, ph.runSpeed * 0.5, dt); return }
      const wp = path[r.wp]
      if (!wp) return
      const tx = r.start.x + wp[0], ty = clamp(r.start.y + wp[1], 1, FIELD_W - 1)
      moveToward(r, tx, ty, ph.runSpeed * 0.9, dt)
      if (Math.hypot(tx - r.x, ty - r.y) < 0.3) r.wp++
      return
    }
    const path = ROUTES[r.route]
    const wp = path[r.wp]
    if (!wp) {
      if (STOP_AT_END.has(r.route)) { r.vx = 0; r.vy = 0; return }
      const last = path[path.length - 1], prev = path[path.length - 2] || [0, 0]
      const dx = last[0] - prev[0], dy = (last[1] - prev[1]) * r.s
      const d = Math.hypot(dx, dy) || 1
      r.vx = dx / d * ph.runSpeed; r.vy = dy / d * ph.runSpeed
      r.x += r.vx * dt; r.y = clamp(r.y + r.vy * dt, 0.8, FIELD_W - 0.8)
      return
    }
    const tx = r.start.x + wp[0], ty = clamp(r.start.y + wp[1] * r.s, 0.8, FIELD_W - 0.8)
    moveToward(r, tx, ty, ph.runSpeed, dt)
    if (Math.hypot(tx - r.x, ty - r.y) < 0.3) r.wp++
  }

  _flyBall(dt) {
    const b = this.ball
    b.t += dt
    if (b.t < b.T) return
    const ph = this.phys
    const spot = b.to
    if (spot.y < 0 || spot.y > FIELD_W || spot.x > 120) return this._end('incomplete', this.qb, { why: 'out of bounds' })
    const rec = this.targets.map(r => ({ r, d: dist(r, spot) })).sort((a, b2) => a.d - b2.d)[0]
    const def = this.defense.map(d => ({ d, dd: dist(d, spot) })).sort((a, b2) => a.dd - b2.dd)[0]
    if (def.dd < 1.0 && def.dd < rec.d) {
      if (Math.random() < 0.4) return this._end('int', def.d, { spot })
      return this._end('incomplete', this.qb, { why: 'broken up' })
    }
    if (rec.d <= ph.catchRadius) {
      const contested = def.dd < 1.6
      const p = clamp(ph.catchBase - (contested ? 0.28 : 0) - rec.d * 0.04, 0.15, 0.97)
      if (Math.random() < p) {
        this.carrier = rec.r
        this.carrier.speed = ph.runSpeed
        this.carrier.x = spot.x; this.carrier.y = spot.y
        this.ball = null
        this.state = 'run'
        this._phase('run')
        if (this.cb.onEvent) this.cb.onEvent({ type: 'catch', label: rec.r.label })
        return
      }
      return this._end('incomplete', this.qb, { why: contested ? 'contested — dropped' : 'dropped' })
    }
    return this._end('incomplete', this.qb, { why: 'nobody there' })
  }

  _runCarrier(dt) {
    const c = this.carrier
    const ph = this.phys
    if (this.jukeCd > 0) this.jukeCd -= dt
    if (this.jumpCd > 0) this.jumpCd -= dt
    if (this.landT > 0) this.landT -= dt
    // Mid-dive: straight ahead, no steering, no tackles. Down where he lands.
    if (this.dive > 0) {
      this.dive -= dt
      c.vx = DIVE_YDS / DIVE_T
      c.vy *= 0.8
      c.x += c.vx * dt
      c.y += c.vy * dt
      if (c.x >= 110) return this._end('td', c)
      if (c.y < 0.2 || c.y > FIELD_W - 0.2) return this._end('oob', c)
      if (this.dive <= 0) { c.down = true; return this._end('tackle', c, { dive: true }) }
      return
    }
    let vy = 0, plan = false
    if (this.keys.ArrowUp) vy = -4.6
    else if (this.keys.ArrowDown) vy = 4.6
    else if (this.pointer && this.pointer.held) {
      const w = this._toWorld(this.pointer)
      vy = clamp((w.y - c.y) * 2.2, -4.6, 4.6)
    } else if (this.runPlan && this.t < this.runPlan.until) {
      // The called run's path, until the student steers: the sweep bends to the sideline first.
      vy = clamp((this.runPlan.y - c.y) * 2.4, -6.2, 6.2); plan = this.runPlan.lateral
    }
    if (this.juke > 0) { this.juke -= dt; vy += this.jukeDir * 6 }
    c.vx = c.speed * (this.keys.ArrowLeft ? 0.55 : plan ? 0.55 : 1)
    c.vy = vy
    c.x += c.vx * dt
    c.y += c.vy * dt
    if (c.x >= 110) return this._end('td', c)
    if (c.y < 0.2 || c.y > FIELD_W - 0.2) return this._end('oob', c)
    if (this.juke > 0) return
    if (this.jump > 0) {
      this.jump -= dt
      if (this.jump <= 0) this.landT = LAND_T
      return
    }
    for (const d of this.defense) {
      // A man who's being blocked can't make the tackle (a called run's blocks; see _step).
      if (d.stun > 0 || d.held > 0 || dist(d, c) > 0.8) continue
      if (Math.random() < ph.breakTackle) {
        d.stun = 0.9
        this._boom({ shake: 1.6 })
        if (this.cb.onEvent) this.cb.onEvent({ type: 'broken' })
        continue
      }
      // The old fumble roll no longer loses the ball by itself. It marks a hit hard enough
      // to shake it loose (shaky), and a hit just after a jump is always one (afterJump).
      // Match turns either into a ball-security question at the dead ball.
      return this._end('tackle', c, { shaky: Math.random() < ph.fumble, afterJump: this.landT > 0 })
    }
  }

  _end(type, at, extra = {}) {
    if (this.state === 'dead' || this.state === 'idle') return
    const x = at.x
    let kind = type
    if ((type === 'tackle' || type === 'sack' || type === 'oob') && x <= 10) kind = 'safety'
    const spot = clamp(x, 0, 120)
    this.result = {
      type: kind,
      yardLine: clamp(Math.round(spot - 10), 0, 100),     // where the ball is now, from the offense's goal
      gained: Math.round(spot - this.los),
      seconds: this.t,
      carrier: this.carrier ? this.carrier.role : null,
      ...extra,
    }
    if (kind === 'incomplete' || kind === 'int') this.result.yardLine = kind === 'int'
      ? clamp(Math.round((extra.spot?.x ?? x) - 10), 0, 100) : this.los - 10
    // What the moment was worth, in light and motion.
    if (kind === 'td') this._boom({ flash: 0.85, color: '#F5CB63', shake: 4 })
    else if (kind === 'int' || kind === 'fumble') this._boom({ flash: 0.7, color: '#E08C82', shake: 5 })
    else if (kind === 'safety') this._boom({ flash: 0.6, color: '#E08C82', shake: 4 })
    else if (kind === 'sack') this._boom({ flash: 0.25, color: '#E08C82', shake: 3.5 })
    else if (this.result.gained >= 20) this._boom({ flash: 0.35, color: '#F5CB63', shake: 1.5 })
    else if (this.result.gained <= 0 && kind !== 'incomplete') this._boom({ shake: 2.6 })

    this.ball = null
    this.aim = null
    this.state = 'dead'
    this.deadT = 0.85
    this._phase('dead')
  }

  // ── drawing ────────────────────────────────────────────────────────────────
  _draw(time) {
    const g = this.ctx
    const focus = this.carrier || (this.ball ? this._ballPos() : this.qb) || { x: 40, y: C }
    if (focus) {
      this.cam.x += (this._camX(focus.x) - this.cam.x) * 0.12
      this.cam.y += (clamp(focus.y, VIEW_H / 2 - 6, FIELD_W - VIEW_H / 2 + 6) - this.cam.y) * 0.12
    }
    g.save()
    if (this.fx.shake > 0) {
      g.translate(Math.round((Math.random() - 0.5) * this.fx.shake * 2), Math.round((Math.random() - 0.5) * this.fx.shake * 2))
    }
    g.fillStyle = '#2a2f3a'
    g.fillRect(-12, -12, VW + 24, VH + 24)
    this._drawStadium(g)
    this._drawField(g)
    this._drawPosts(g)
    if (!this.players.length) { g.restore(); this._drawOverlay(g); return }
    if (['presnap', 'dropback', 'air', 'run'].includes(this.state)) {
      this._vline(g, this.los, '#3B82F6')
      if (this.firstDown < 110) this._vline(g, this.firstDown, '#FACC15')
    }
    const byY = this.players.slice().sort((a, b) => a.y - b.y)
    for (const p of byY) this._drawPlayer(g, p, time)
    if (this.ball) this._drawBall(g)
    else if (!this.carrier && this.qb && this.state !== 'idle') {
      const s = this._toScreen(this.qb.x, this.qb.y)
      g.fillStyle = '#8B4A1C'; g.fillRect(this.dir === 1 ? s.x + 4 : s.x - 7, s.y - 6, 4, 3)
    }
    if (['presnap', 'dropback'].includes(this.state) && !(this.play && this.play.kind === 'run')) this._drawRoutes(g)
    if (this.state === 'presnap' && this.play && this.play.kind === 'run') this._drawRunPath(g)
    if (this.aim && this.state === 'dropback') this._drawAim(g)
    if (['presnap', 'dropback'].includes(this.state) && !(this.play && this.play.kind === 'run')) {
      for (const r of this.targets) {
        const s = this._toScreen(r.x, r.y)
        g.fillStyle = 'rgba(11,18,32,.88)'; g.fillRect(s.x - 5, s.y - 38, 11, 13)
        g.fillStyle = '#F5CB63'; g.fillRect(s.x - 5, s.y - 38, 11, 1)
        this._digit(g, r.label, s.x - 3, s.y - 35, 2, '#F4F6FA')
      }
    }
    g.restore()
    if (this.fx.flash > 0) {
      g.globalAlpha = Math.min(0.55, this.fx.flash * 0.55)
      g.fillStyle = this.fx.color
      g.fillRect(0, 0, VW, VH)
      g.globalAlpha = 1
    }
    this._drawOverlay(g)
  }

  _ballPos() {
    const b = this.ball
    const k = clamp(b.t / b.T, 0, 1)
    return { x: b.from.x + (b.to.x - b.from.x) * k, y: b.from.y + (b.to.y - b.from.y) * k }
  }

  _vline(g, x, color) {
    const a = this._toScreen(x, 0), b = this._toScreen(x, FIELD_W)
    g.fillStyle = color
    g.fillRect(a.x, a.y, 2, b.y - a.y)
  }

  _drawField(g) {
    const tl = this._toScreen(0, 0), br = this._toScreen(120, FIELD_W)
    for (let x = 10; x < 110; x += 5) {
      const a = this._toScreen(x, 0), b = this._toScreen(x + 5, FIELD_W)
      g.fillStyle = (x / 5) % 2 ? '#3B8A38' : '#357F33'
      g.fillRect(a.x, a.y, b.x - a.x, b.y - a.y)
    }
    const ez = (x0, kit) => {
      const a = this._toScreen(x0, 0), b = this._toScreen(x0 + 10, FIELD_W)
      g.fillStyle = kit ? kit.zone || kit.jersey : '#2E6B2C'
      g.globalAlpha = 0.85; g.fillRect(a.x, a.y, b.x - a.x, b.y - a.y); g.globalAlpha = 1
    }
    ez(0, this.kits?.offense)
    ez(110, this.kits?.defense)
    g.fillStyle = 'rgba(255,255,255,.85)'
    for (let x = 10; x <= 110; x += 5) {
      const a = this._toScreen(x, 0), b = this._toScreen(x, FIELD_W)
      g.fillRect(a.x, a.y, 1, b.y - a.y)
    }
    for (let x = 11; x < 110; x++) {
      for (const hy of [FIELD_W * 0.4, FIELD_W * 0.6]) {
        const s = this._toScreen(x, hy); g.fillRect(s.x, s.y - 1, 1, 3)
      }
    }
    g.fillRect(tl.x, tl.y, br.x - tl.x, 2)
    g.fillRect(tl.x, br.y - 2, br.x - tl.x, 2)
    for (let x = 20; x <= 100; x += 10) {
      const n = x <= 60 ? x - 10 : 110 - x
      // Inside the camera's band: at this zoom the old sideline positions sat off screen.
      for (const ny of [9, FIELD_W - 11]) {
        const s = this._toScreen(x, ny)
        const str = String(n)
        this._text(g, str, s.x - (str.length * 8 - 2) / 2, s.y, 2, 'rgba(255,255,255,.7)')
      }
    }
  }

  _digit(g, d, x, y, scale, color) {
    const rows = DIGITS[d]
    if (!rows) return
    g.fillStyle = color
    rows.forEach((row, j) => [...row].forEach((bit, i) => { if (bit === '1') g.fillRect(x + i * scale, y + j * scale, scale, scale) }))
  }
  _text(g, str, x, y, scale, color) { [...str].forEach((ch, i) => this._digit(g, ch, x + i * 4 * scale, y, scale, color)) }

  _drawPlayer(g, p, time) {
    const s = this._toScreen(p.x, p.y)
    if (s.x < -20 || s.x > VW + 20 || s.y < -8 || s.y > VH + 40) return
    const kit = p.team === 'o' ? this.kits.offense : this.kits.defense
    const moving = Math.abs(p.vx) + Math.abs(p.vy) > 0.5
    const bob = moving ? Math.round(Math.sin(time * 15 + p.y)) : 0
    const stride = moving ? Math.round(Math.sin(time * 15 + p.y)) : 0
    const isC = p === this.carrier
    const lift = isC && this.jump > 0 ? Math.round(Math.sin((1 - this.jump / JUMP_T) * Math.PI) * 7) : 0
    const y = s.y + bob - lift
    // A diving carrier tips forward and lies flat where he lands (a quarter turn, so the
    // pixels stay square). The shadow and ring stay on the ground under him.
    const tip = isC && (this.dive > 0 || p.down) ? Math.min(1, p.down ? 1 : (DIVE_T - this.dive) / 0.1) : 0
    // shadow, and a gold ring under whoever has the ball
    g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(s.x - 6, s.y + 5, 13, 3)
    if (p === this.carrier) { g.fillStyle = 'rgba(245,203,99,.75)'; g.fillRect(s.x - 8, s.y + 5, 17, 3) }
    if (tip) {
      g.save()
      g.translate(s.x, s.y + 3)
      g.rotate(tip * (Math.PI / 2) * ((p.team === 'o') === (this.dir === 1) ? 1 : -1))
      g.translate(-s.x, -(s.y + 3))
    }
    // PANTS, HELMET and JERSEY are three separate colours (teams.js). That is what lets
    // Binghamton's blue hat and blue pants carry their red jersey, and it is most of what
    // makes two sides readable against each other at this size. The 16-bit reskin
    // (2026-10-03) draws them as cached sprites: three tones each, a dark outline, two
    // running frames, the facemask facing the way he plays.
    const faceRight = (p.team === 'o') === (this.dir === 1)
    const pose = moving ? (stride > 0 ? 'run0' : 'run1') : 'stand'
    g.drawImage(playerSprite(kit, pose, faceRight ? 1 : -1, 1, p.skin || 0, p.num), s.x - SPRITE.AX, y + 6 - SPRITE.AY)
    if (p.stun > 0) {
      g.fillStyle = '#F4F6FA'
      g.fillRect(s.x - 3, y - 31, 2, 2); g.fillRect(s.x + 3, y - 33, 2, 2)
    }
    if (tip) g.restore()
  }

  _drawBall(g) {
    const b = this.ball
    const k = clamp(b.t / b.T, 0, 1)
    const x = b.from.x + (b.to.x - b.from.x) * k
    const y = b.from.y + (b.to.y - b.from.y) * k
    const h = 4 * b.arc * k * (1 - k)
    const s = this._toScreen(x, y)
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(s.x - 2, s.y + 2, 5, 2)
    const by = Math.round(s.y - h * PX * 0.7) - 3
    g.fillStyle = '#8B4A1C'; g.fillRect(s.x - 2, by, 5, 3)
    g.fillStyle = '#F4F6FA'; g.fillRect(s.x, by + 1, 1, 1)
    const t = this._toScreen(b.to.x, b.to.y)
    g.strokeStyle = 'rgba(245,203,99,.6)'; g.lineWidth = 1
    g.strokeRect(t.x - 2, t.y - 2, 5, 5)
  }

  // ── routes, drawn before the snap (BK, 2026-09-23/26) ───────────────────────
  // The route each receiver will run, as a dotted path. Routes are already picked at
  // random every snap (setup()); drawing them makes that variety visible and makes the
  // throw a timing read instead of a guess. Same waypoints _runRoute() follows, so the
  // drawing can never disagree with where the man actually goes.
  _routePoints(r) {
    const pts = [{ x: r.start.x, y: r.start.y }]
    const cy = y => clamp(y, 0.8, FIELD_W - 0.8)
    if (r.role === 'RB') {
      const s = r.side
      const path = { flat: [[2, 6 * s], [6, 12 * s]], wheel: [[2, 8 * s], [20, 12 * s]], check: [[4, 0], [6, 2 * s]] }[r.route]
      if (!path) return null
      for (const w of path) pts.push({ x: r.start.x + w[0], y: cy(r.start.y + w[1]) })
      return pts
    }
    const path = ROUTES[r.route]
    for (const w of path) pts.push({ x: r.start.x + w[0], y: cy(r.start.y + w[1] * r.s) })
    if (!STOP_AT_END.has(r.route)) {          // he keeps running: show a few more yards
      const a = pts[pts.length - 2], b = pts[pts.length - 1]
      const d = Math.hypot(b.x - a.x, b.y - a.y) || 1
      pts.push({ x: b.x + (b.x - a.x) / d * 8, y: cy(b.y + (b.y - a.y) / d * 8) })
    }
    return pts
  }

  // A called run's path before the snap: the back's line, dotted, an arrowhead at the end.
  _sweepSide() { const te = this.targets.find(t => t.role === 'TE'); return te && te.y < C ? -1 : 1 }

  _drawRunPath(g) {
    const rb = this.targets.find(t => t.role === 'RB')
    if (!rb) return
    const side = this.play.id === 'sweep' ? this._sweepSide() : (rb.y > C ? 1 : -1)
    const pts = this.play.id === 'sweep'
      ? [{ x: rb.x, y: rb.y }, { x: this.los - 1, y: clamp(C + side * 12, 3, FIELD_W - 3) }, { x: this.los + 9, y: clamp(C + side * 13, 3, FIELD_W - 3) }]
      : [{ x: rb.x, y: rb.y }, { x: this.los, y: C + side * 1.0 }, { x: this.los + 8, y: C + side * 1.0 }]
    g.fillStyle = '#F5CB63'
    for (let i = 1; i < pts.length; i++) {
      const a = this._toScreen(pts[i - 1].x, pts[i - 1].y), b = this._toScreen(pts[i].x, pts[i].y)
      const len = Math.hypot(b.x - a.x, b.y - a.y)
      for (let t = 0; t < len; t += 5) g.fillRect(Math.round(a.x + (b.x - a.x) * t / len), Math.round(a.y + (b.y - a.y) * t / len), 2, 2)
    }
    const e = this._toScreen(pts[2].x, pts[2].y), d = this.dir
    for (let i = 0; i < 4; i++) g.fillRect(e.x - d * i, e.y - i, 2, 2 * i + 1)
  }

  _drawRoutes(g) {
    // Bright before the snap, dimmer once the play is on, gone when the ball is thrown.
    g.globalAlpha = this.state === 'presnap' ? 0.95 : 0.5
    for (const r of this.targets) {
      const pts = this._routePoints(r)
      if (!pts) continue
      const col = r.role === 'RB' ? '#BFD4F2' : '#F4F6FA'
      g.fillStyle = col
      let carry = 0
      for (let i = 1; i < pts.length; i++) {
        const a = this._toScreen(pts[i - 1].x, pts[i - 1].y), b = this._toScreen(pts[i].x, pts[i].y)
        const len = Math.hypot(b.x - a.x, b.y - a.y)
        for (let t = carry; t < len; t += 5) {
          const k = t / len
          g.fillRect(Math.round(a.x + (b.x - a.x) * k), Math.round(a.y + (b.y - a.y) * k), 2, 2)
        }
        carry = (carry + 5 - (len % 5)) % 5
      }
      // the end of the route: a small block, so "where he's going" reads at a glance
      const e = this._toScreen(pts[pts.length - 1].x, pts[pts.length - 1].y)
      g.fillStyle = '#F5CB63'; g.fillRect(e.x - 2, e.y - 2, 5, 5)
      g.fillStyle = 'rgba(11,18,32,.9)'; g.fillRect(e.x - 1, e.y - 1, 3, 3)
    }
    g.globalAlpha = 1
  }

  // The reticle is the Throwing stat made visible: its ring is the scatter a throw
  // can land in. Better sources reading, smaller ring.
  _drawAim(g) {
    const p = this.pointer
    // The pull itself: a faint band from where the finger went down to where it is now.
    if (p) {
      const n = Math.max(2, Math.floor(Math.hypot(p.x - p.x0, p.y - p.y0) / 5))
      g.fillStyle = 'rgba(244,246,250,.5)'
      for (let i = 0; i <= n; i++) g.fillRect(Math.round(p.x0 + (p.x - p.x0) * i / n), Math.round(p.y0 + (p.y - p.y0) * i / n), 2, 2)
    }
    // Every receiver's lead spot: where he will be when the ball gets there.
    for (const rc of this.targets) {
      if (rc.role === 'RB' && rc.route === 'block') continue
      const ls = this._leadSpot(rc), s = this._toScreen(ls.x, ls.y)
      const on = this.aim.r === rc
      g.strokeStyle = on ? '#F5CB63' : 'rgba(244,246,250,.7)'; g.lineWidth = 1
      g.beginPath(); g.moveTo(s.x, s.y - 4); g.lineTo(s.x + 4, s.y); g.lineTo(s.x, s.y + 4); g.lineTo(s.x - 4, s.y); g.closePath(); g.stroke()
    }
    const a = this._toScreen(this.qb.x, this.qb.y)
    const t = this._toScreen(this.aim.x, this.aim.y)
    // The flight: the same arc the ball will fly (flight time and height as _throw() sets them).
    const dYards = Math.hypot(this.aim.x - this.qb.x, this.aim.y - this.qb.y)
    const arc = arcOf(flightTime(dYards))
    const n = Math.max(2, Math.floor(Math.hypot(t.x - a.x, t.y - a.y) / 6))
    g.fillStyle = 'rgba(244,246,250,.85)'
    for (let i = 1; i < n; i++) {
      const k = i / n
      const h = 4 * arc * k * (1 - k) * PX * 0.7
      g.fillRect(Math.round(a.x + (t.x - a.x) * k), Math.round(a.y + (t.y - a.y) * k - h), 2, 2)
    }
    const r = Math.max(3, this.phys.throwJitter * (this._pressure() ? 1.6 : 1) * PX)
    g.strokeStyle = '#F5CB63'; g.lineWidth = this.aim.r ? 2 : 1
    g.beginPath(); g.arc(t.x + 0.5, t.y + 0.5, r, 0, Math.PI * 2); g.stroke()
    g.fillStyle = '#F5CB63'; g.fillRect(t.x - 1, t.y - 1, 3, 3)
    // Locked on: his number beside the ring, so the lock never rests on colour alone.
    if (this.aim.r) {
      g.fillStyle = 'rgba(11,18,32,.88)'; g.fillRect(t.x + r + 2, t.y - 7, 9, 13)
      this._digit(g, this.aim.r.label, t.x + r + 4, t.y - 4, 2, '#F5CB63')
    }
  }
}
