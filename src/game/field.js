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
//                      quick tap = the quarterback takes off running
//                      keys 1–4 throw to that receiver · Space runs · ↑/↓ slide in the pocket
//   ball carrier       hold and point up/down to steer · tap or Space to juke · ↑/↓ steer
//
// World units are yards. x runs 0–120 (0–10 own end zone, 110–120 theirs);
// y runs across the field, 0–53.3. The offense always drives to the right.
// ============================================================

export const VW = 480
export const VH = 270
const PX = 7
const VIEW_W = VW / PX
const VIEW_H = VH / PX
export const FIELD_W = 53.33
const C = FIELD_W / 2
const AIM_GAIN = 2.6
const MAX_THROW = 55

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
    this.last = performance.now()
    this._bind()
    // Dev only: lets a test script step the field when the tab is hidden (rAF pauses). Never in a build.
    if (import.meta.env?.DEV) window.__rbEngine = this
    this._loop = this._loop.bind(this)
    this.raf = requestAnimationFrame(this._loop)
  }

  destroy() {
    cancelAnimationFrame(this.raf)
    this._unbind()
  }

  // ── set a play up ──────────────────────────────────────────────────────────
  // ballOn: 0–100 from the offense's own goal. kits: {offense, defense}. phys: ratings.physics().
  setup({ ballOn, toGo, kits, phys, goal = false }) {
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
    const dl = [-2.5, 0.5, 2.5].map((d, i) => P('DL', 'd', L + 1, C + d, { blocker: ol[i], blockT: phys.blockTime + rand(-0.35, 0.45) }))
    if (rb.route === 'block') dl[1].blockT += 0.8
    const cb1 = P('CB', 'd', L + 6, wr[0].y, { assign: wr[0] })
    const cb2 = P('CB', 'd', L + 6, wr[1].y, { assign: wr[1] })
    const sf = P('S', 'd', L + 11, C - 6, { assign: wr[2] })
    const lb1 = P('LB', 'd', L + 5, C + 5, { assign: rb.route === 'block' ? null : rb })
    const lb2 = P('LB', 'd', L + 5, C - 4, { zone: true })
    this.qb = qb
    this.targets = [...wr, rb]
    this.offense = [qb, rb, ...ol, ...wr]
    this.defense = [...dl, cb1, cb2, sf, lb1, lb2]
    this.players = [...this.offense, ...this.defense]
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
    this.state = 'dropback'
    this.t = 0
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
        if (this.aim && ptr.moved > 10) this._throw(this.aim.x, this.aim.y)
        else if (ptr.moved <= 10) this._qbRun()
        this.aim = null
      } else if (this.state === 'run') {
        if (ptr.moved <= 10 && performance.now() - ptr.t0 < 260) this._doJuke()
      }
    }
    this._key = (e, down) => {
      const k = e.key
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(k) && this.state !== 'presnap' && this.state !== 'idle') e.preventDefault()
      this.keys[k] = down
      if (k === ' ' && !down) this.spaceLocked = false
      if (!down || e.repeat) return
      const space = k === ' ' && !this.spaceLocked
      if (this.state === 'dropback') {
        if (/^[1-4]$/.test(k)) { const r = this.targets.find(t => t.label === Number(k)); if (r) this._throwTo(r) }
        else if (space) this._qbRun()
      } else if (this.state === 'run' && space) this._doJuke()
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
  _toWorld(p) { return { x: (p.x - VW / 2) / PX + this.cam.x, y: (p.y - VH / 2) / PX + this.cam.y } }
  _toScreen(x, y) { return { x: Math.round((x - this.cam.x) * PX + VW / 2), y: Math.round((y - this.cam.y) * PX + VH / 2) } }
  _camX(x) { return clamp(x + 12, VIEW_W / 2 - 4, 120 - VIEW_W / 2 + 4) }

  _updateAim() {
    const p = this.pointer
    let dx = (p.x0 - p.x) / PX * AIM_GAIN
    let dy = (p.y0 - p.y) / PX * AIM_GAIN
    const d = Math.hypot(dx, dy)
    if (d > MAX_THROW) { dx *= MAX_THROW / d; dy *= MAX_THROW / d }
    this.aim = { x: this.qb.x + dx, y: this.qb.y + dy }
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
    const T = clamp(d / 24, 0.35, 1.9)
    this.ball = { from: { x: this.qb.x, y: this.qb.y }, to, t: 0, T, arc: Math.min(6, T * 3.2) }
    this.state = 'air'
    this._phase('air')
  }

  // Keyboard throw: lead the receiver to where he will be when the ball arrives.
  _throwTo(r) {
    let tx = r.x, ty = r.y
    for (let i = 0; i < 3; i++) {
      const T = clamp(Math.hypot(tx - this.qb.x, ty - this.qb.y) / 24, 0.35, 1.9)
      tx = r.x + r.vx * T; ty = r.y + r.vy * T
    }
    this._throw(tx, ty)
  }

  _qbRun() {
    if (this.state !== 'dropback') return
    this.carrier = this.qb
    this.carrier.speed = this.phys.qbSpeed
    this.state = 'run'
    this._phase('run')
  }

  _doJuke() {
    if (this.state !== 'run' || this.jukeCd > 0) return
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
    while (elapsed > 0 && ['dropback', 'air', 'run', 'dead'].includes(this.state)) {
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
      if (this.state === 'air' && dist(r, this.ball.to) < 6) { moveToward(r, this.ball.to.x, this.ball.to.y, ph.runSpeed, dt); continue }
      if (this.state === 'run') { r.x += ph.runSpeed * 0.35 * dt; continue }
      this._runRoute(r, dt)
    }

    // Line: blockers hold their spot; the ball carrier's line keeps pushing a little.
    for (const o of this.offense) if (o.role === 'OL') { o.x += (Math.random() - 0.5) * 0.6 * dt }

    // Defense.
    const readBonus = ph.reaction
    for (const d of this.defense) {
      if (d.stun > 0) continue
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
    let vy = 0
    if (this.keys.ArrowUp) vy = -4.6
    else if (this.keys.ArrowDown) vy = 4.6
    else if (this.pointer && this.pointer.held) {
      const w = this._toWorld(this.pointer)
      vy = clamp((w.y - c.y) * 2.2, -4.6, 4.6)
    }
    if (this.juke > 0) { this.juke -= dt; vy += this.jukeDir * 6 }
    c.vx = c.speed * (this.keys.ArrowLeft ? 0.55 : 1)
    c.vy = vy
    c.x += c.vx * dt
    c.y += c.vy * dt
    if (c.x >= 110) return this._end('td', c)
    if (c.y < 0.2 || c.y > FIELD_W - 0.2) return this._end('oob', c)
    if (this.juke > 0) return
    for (const d of this.defense) {
      if (d.stun > 0 || dist(d, c) > 0.8) continue
      if (Math.random() < ph.breakTackle) {
        d.stun = 0.9
        this._boom({ shake: 1.6 })
        if (this.cb.onEvent) this.cb.onEvent({ type: 'broken' })
        continue
      }
      if (Math.random() < ph.fumble) return this._end('fumble', c)
      return this._end('tackle', c)
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
      this.cam.y += (clamp(focus.y, VIEW_H / 2 - 3, FIELD_W - VIEW_H / 2 + 3) - this.cam.y) * 0.12
    }
    g.save()
    if (this.fx.shake > 0) {
      g.translate(Math.round((Math.random() - 0.5) * this.fx.shake * 2), Math.round((Math.random() - 0.5) * this.fx.shake * 2))
    }
    g.fillStyle = '#23471F'
    g.fillRect(-12, -12, VW + 24, VH + 24)
    this._drawField(g)
    if (!this.players.length) return
    if (['presnap', 'dropback', 'air', 'run'].includes(this.state)) {
      this._vline(g, this.los, '#3B82F6')
      if (this.firstDown < 110) this._vline(g, this.firstDown, '#FACC15')
    }
    const byY = this.players.slice().sort((a, b) => a.y - b.y)
    for (const p of byY) this._drawPlayer(g, p, time)
    if (this.ball) this._drawBall(g)
    else if (!this.carrier && this.qb && this.state !== 'idle') {
      const s = this._toScreen(this.qb.x, this.qb.y)
      g.fillStyle = '#8B4A1C'; g.fillRect(s.x + 4, s.y - 6, 4, 3)
    }
    if (this.aim && this.state === 'dropback') this._drawAim(g)
    if (['presnap', 'dropback'].includes(this.state)) {
      for (const r of this.targets) {
        const s = this._toScreen(r.x, r.y)
        g.fillStyle = 'rgba(11,18,32,.88)'; g.fillRect(s.x - 5, s.y - 26, 11, 13)
        g.fillStyle = '#F5CB63'; g.fillRect(s.x - 5, s.y - 26, 11, 1)
        this._digit(g, r.label, s.x - 3, s.y - 23, 2, '#F4F6FA')
      }
    }
    g.restore()
    if (this.fx.flash > 0) {
      g.globalAlpha = Math.min(0.55, this.fx.flash * 0.55)
      g.fillStyle = this.fx.color
      g.fillRect(0, 0, VW, VH)
      g.globalAlpha = 1
    }
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
    if (s.x < -16 || s.x > VW + 16 || s.y < -24 || s.y > VH + 16) return
    const kit = p.team === 'o' ? this.kits.offense : this.kits.defense
    const moving = Math.abs(p.vx) + Math.abs(p.vy) > 0.5
    const bob = moving ? Math.round(Math.sin(time * 15 + p.y)) : 0
    const stride = moving ? Math.round(Math.sin(time * 15 + p.y)) : 0
    const y = s.y + bob
    // shadow, and a gold ring under whoever has the ball
    g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(s.x - 5, s.y + 5, 11, 2)
    if (p === this.carrier) { g.fillStyle = 'rgba(245,203,99,.6)'; g.fillRect(s.x - 7, s.y + 5, 15, 2) }
    // legs (they scissor as he runs), shoes
    g.fillStyle = kit.trim
    g.fillRect(s.x - 3, y + 1, 2, 4 - stride)
    g.fillRect(s.x + 2, y + 1, 2, 4 + stride)
    g.fillStyle = '#1A1A1A'
    g.fillRect(s.x - 4, s.y + 4, 3, 2); g.fillRect(s.x + 2, s.y + 4, 3, 2)
    // arms
    g.fillStyle = '#E8C9A0'
    g.fillRect(s.x - 5, y - 5 + stride, 2, 5); g.fillRect(s.x + 4, y - 5 - stride, 2, 5)
    // jersey and shoulder pads
    g.fillStyle = kit.jersey; g.fillRect(s.x - 4, y - 7, 9, 9)
    g.fillStyle = kit.trim; g.fillRect(s.x - 4, y - 7, 9, 2)
    // helmet with a facemask facing the way he plays
    g.fillStyle = kit.trim; g.fillRect(s.x - 4, y - 14, 9, 7)
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(s.x - 4, y - 14, 9, 2)
    g.fillStyle = p.team === 'o' ? '#0B1220' : '#F4F6FA'
    g.fillRect(p.team === 'o' ? s.x + 4 : s.x - 5, y - 11, 2, 3)
    if (p.stun > 0) {
      g.fillStyle = '#F4F6FA'
      g.fillRect(s.x - 3, y - 19, 2, 2); g.fillRect(s.x + 3, y - 21, 2, 2)
    }
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

  // The reticle is the Throwing stat made visible: its ring is the scatter a throw
  // can land in. Better sources reading, smaller ring.
  _drawAim(g) {
    const a = this._toScreen(this.qb.x, this.qb.y)
    const t = this._toScreen(this.aim.x, this.aim.y)
    const n = Math.max(2, Math.floor(Math.hypot(t.x - a.x, t.y - a.y) / 6))
    g.fillStyle = 'rgba(244,246,250,.85)'
    for (let i = 1; i < n; i++) {
      const k = i / n
      const h = 4 * Math.min(6, 3) * k * (1 - k) * PX * 0.35
      g.fillRect(Math.round(a.x + (t.x - a.x) * k), Math.round(a.y + (t.y - a.y) * k - h), 2, 2)
    }
    const r = Math.max(3, this.phys.throwJitter * (this._pressure() ? 1.6 : 1) * PX)
    g.strokeStyle = '#F5CB63'; g.lineWidth = 1
    g.beginPath(); g.arc(t.x + 0.5, t.y + 0.5, r, 0, Math.PI * 2); g.stroke()
    g.fillStyle = '#F5CB63'; g.fillRect(t.x - 1, t.y - 1, 3, 3)
  }
}
