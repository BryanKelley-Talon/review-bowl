// ============================================================
// WHOLE-GAME SIM — `npm run sim`
//
// Plays complete games headlessly: the player's offence is the REAL engine (field.js)
// driven by the same no-aim bot as scripts/offense.mjs, the opponent's possessions are
// the REAL drive sim, and downs/clock/scoring are the REAL matchRules. It answers the
// one question a difficulty pass has to answer: **can a student win an early game?**
//
// APPROXIMATIONS, stated plainly:
//   • the bot never aims, never steers, never jukes → a person does better than this
//   • extra points convert at the student's assumed answer accuracy
//   • no timeouts, no halftime adjustments, no big-moment reads (all of which help the student)
// So these win rates are a FLOOR. Compare builds with them; don't quote them as forecasts.
// ============================================================
import { physics } from '../src/game/ratings.js'
import { simDrive } from '../src/game/drive.js'
import {
  applyDrive, applyPlay, canKick, extraPoint, fieldGoal, firstDown, goalToGo, halfOver, kickChance,
  newGame, punt, startSecondHalf,
} from '../src/game/matchRules.js'
import { FieldEngine } from '../src/game/field.js'
import { kits, TEAMS } from '../src/game/teams.js'

let clock = 0
const noop = () => {}
const ctx = new Proxy({}, { get: () => noop, set: () => true })
const canvas = {
  width: 0, height: 0, getContext: () => ctx,
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

function snap(phys, g) {
  let result = null
  engine.cb = { onPlayEnd: r => { result = r }, onPhase: noop, onEvent: noop }
  engine.setup({ ballOn: g.ballOn, toGo: g.toGo, goal: goalToGo(g), kits: KITS, phys })
  engine.snap()
  engine.last = clock
  const hold = Math.round(30 * (1.1 + Math.random() * 0.9))
  for (let i = 0; i < hold && !result; i++) { clock += FRAME; engine._loop(clock) }
  if (engine.state === 'dropback') engine._throwTo(engine.targets[Math.floor(Math.random() * engine.targets.length)])
  for (let i = 0; i < 500 && !result; i++) { clock += FRAME; engine._loop(clock) }
  return result || { type: 'incomplete', yardLine: g.ballOn, gained: 0, seconds: 4 }
}

export function playGame({ rating, opp, defense, accuracy = 0.75 }) {
  const v = { throwing: rating, hands: rating, speed: rating, blocking: rating, toughness: rating }
  const phys = physics(v, opp)
  let g = newGame(8)
  let mine = Math.random() < accuracy           // the coin toss is a content gate too
  let guard = 0

  const theirDrive = start => {
    const d = simDrive({ opp, defense, start, secondsLeft: g.halfLeft })
    g = applyDrive(g, d)
    return d.result === 'END'
  }

  while (guard++ < 400) {
    if (halfOver(g)) {
      if (g.half === 2) break
      g = startSecondHalf(g)
      mine = !mine
      if (!mine) { theirDrive(25); mine = true; continue }
      g = firstDown(g, 25)
      continue
    }
    if (!mine) { theirDrive(25); mine = true; continue }

    // fourth down: kick if it is there, otherwise go
    if (g.down === 4) {
      if (canKick(g) && kickChance(g) > 0.5) {
        const k = fieldGoal(g)
        g = k.g
        mine = false
        if (!halfOver(g)) theirDrive(k.good ? 25 : k.oppStart)
        mine = true
        continue
      }
      if (g.ballOn < 55) {
        const p = punt(g)
        g = p.g
        if (!halfOver(g)) theirDrive(p.oppStart)
        mine = true
        continue
      }
    }

    const res = snap(phys, g)
    const out = applyPlay(g, res)
    g = out.g
    if (out.outcome.kind === 'td') {
      g = extraPoint(g, Math.random() < accuracy)     // the XP question
      if (!halfOver(g)) theirDrive(25)
      mine = true
    } else if (out.outcome.kind === 'safety') {
      if (!halfOver(g)) theirDrive(35)
      mine = true
    } else if (out.outcome.kind === 'turnover' || out.outcome.kind === 'downs') {
      if (!halfOver(g)) theirDrive(out.outcome.oppStart)
      mine = true
    }
  }
  return { you: g.you, them: g.opp }
}

if (decodeURIComponent(import.meta.url).endsWith(process.argv[1])) {
  // Opponent strength per row tracks season.js's WEEK_RAMP — week 1 ≈ 3, week 4 ≈ 4,
  // week 8 ≈ 6, playoffs ≈ 7. Keep these in step if the ramp changes.
  const rows = [
    ['week 1 · skips practice entirely', 2, 3, 2],
    ['week 1 · does practice, answers well', 4, 3, 5],
    ['week 1 · does practice, answers so-so', 3, 3, 4],
    ['week 4 · engaged all season', 6, 4, 7],
    ['week 8 · engaged all season', 8, 6, 9],
    ['semifinal · engaged all season', 8, 8, 9],
    ['championship · engaged all season', 8, 9, 9],
    ['championship · half-engaged', 6, 9, 6],
    ['week 8 · never engaged', 2, 6, 2],
  ]
  const N = 100
  console.log(`\nWHOLE GAMES — ${N} per row, bot floor on offence\n`)
  console.log('  scenario                                 record     avg score    win%')
  for (const [label, rating, opp, defense] of rows) {
    let w = 0, l = 0, t = 0, pf = 0, pa = 0
    for (let i = 0; i < N; i++) {
      const r = playGame({ rating, opp, defense })
      pf += r.you; pa += r.them
      if (r.you > r.them) w++; else if (r.you < r.them) l++; else t++
    }
    console.log(`  ${label.padEnd(40)} ${`${w}-${l}${t ? `-${t}` : ''}`.padEnd(10)} ${(pf / N).toFixed(0)}–${(pa / N).toFixed(0)}`.padEnd(66) + `${Math.round(w / N * 100)}%`)
  }
  console.log()
}
