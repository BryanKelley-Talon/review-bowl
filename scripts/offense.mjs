// ============================================================
// OFFENSIVE BALANCE — `npm run offense`
//
// Runs the REAL canvas engine (src/game/field.js) headlessly: the drawing calls go to
// a no-op context, the clock is fake, and the snaps are played by a bot that throws to
// a random receiver at a random moment. Nothing about the physics is simulated twice —
// this is the same code the student plays.
//
// READ THE NUMBERS HONESTLY. The bot does not aim, does not read coverage, does not
// steer a ball carrier and never jukes, so it is a FLOOR, not a forecast: a person who
// aims at the open man will beat every figure here. What the table is good for is
// comparing one rating against another, and one build against the last one.
// ============================================================
import { FieldEngine } from '../src/game/field.js'
import { physics } from '../src/game/ratings.js'
import { kits, TEAMS } from '../src/game/teams.js'

// ── the thinnest browser the engine will accept ─────────────────────────────
let clock = 0
const noop = () => {}
const ctx = new Proxy({}, { get: (_, k) => (k === 'canvas' ? canvas : noop), set: () => true })
const canvas = {
  width: 0, height: 0,
  getContext: () => ctx,
  addEventListener: noop, removeEventListener: noop, setPointerCapture: noop,
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 480, height: 270 }),
}
globalThis.window = { addEventListener: noop, removeEventListener: noop, matchMedia: () => ({ matches: false }) }
globalThis.performance = { now: () => clock }
globalThis.requestAnimationFrame = () => 0
globalThis.cancelAnimationFrame = noop
globalThis.matchMedia = () => ({ matches: false })

const FRAME = 33.4
const engine = new FieldEngine(canvas, {})
const KITS = kits(TEAMS[0], TEAMS[1])

function playSnap(phys, ballOn = 25) {
  let result = null
  engine.cb = { onPlayEnd: r => { result = r }, onPhase: noop, onEvent: noop }
  engine.setup({ ballOn, toGo: 10, kits: KITS, phys })
  engine.snap()
  engine.last = clock
  // Hold the ball 1.1–2.0s, then throw at somebody. No aiming, no steering, no jukes.
  const hold = Math.round(30 * (1.1 + Math.random() * 0.9))
  for (let i = 0; i < hold && !result; i++) { clock += FRAME; engine._loop(clock) }
  if (engine.state === 'dropback') engine._throwTo(engine.targets[Math.floor(Math.random() * engine.targets.length)])
  for (let i = 0; i < 500 && !result; i++) { clock += FRAME; engine._loop(clock) }
  return result
}

export function trial(rating, opp, n = 400) {
  const v = { throwing: rating, hands: rating, speed: rating, blocking: rating, toughness: rating }
  const phys = physics(v, opp)
  let comp = 0, yards = 0, tds = 0, ints = 0, sacks = 0, big = 0, played = 0
  for (let i = 0; i < n; i++) {
    const r = playSnap(phys)
    if (!r) continue
    played++
    if (!['incomplete', 'int', 'sack'].includes(r.type)) comp++
    if (r.type === 'td') tds++
    if (r.type === 'int') ints++
    if (r.type === 'sack') sacks++
    const gain = r.type === 'int' ? 0 : r.gained
    if (gain >= 20) big++
    yards += gain
  }
  return {
    comp: Math.round(comp / played * 100),
    yds: +(yards / played).toFixed(1),
    big: Math.round(big / played * 100),
    td: Math.round(tds / played * 100),
    turnover: Math.round(ints / played * 100),
    sack: Math.round(sacks / played * 100),
  }
}

// Run directly (the repo path has spaces, so compare decoded rather than by URL).
if (decodeURIComponent(import.meta.url).endsWith(process.argv[1])) {
  const rows = [
    ['fresh team, week 1', 3, 3],
    ['one practice week in', 4, 3],
    ['mid-season, even', 5, 5],
    ['engaged student, week 8', 7, 5],
    ['maxed out vs the league', 9, 5],
    ['maxed out vs a weak team', 9, 3],
    ['student who skips practice', 2, 5],
  ]
  console.log('\nOFFENCE — bot floor (no aiming, no steering, no jukes), 400 snaps a row, from the 25')
  console.log('  matchup                       comp%   yds/snap   20+yd%   TD%   giveaway%')
  for (const [label, rating, opp] of rows) {
    const t = trial(rating, opp)
    console.log(`  ${label.padEnd(28)} ${String(t.comp).padStart(4)}%  ${String(t.yds).padStart(8)}   ${String(t.big).padStart(5)}%  ${String(t.td).padStart(3)}%   ${String(t.turnover).padStart(6)}%`)
  }
  console.log()
}
