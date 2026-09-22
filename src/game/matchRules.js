// ============================================================
// MATCH RULES — downs, clock, scoring. Pure functions, no UI, so the rules the
// build order calls non-negotiable are testable on their own (scripts/test.mjs):
//
//   • A touchdown's six points bank the instant the ball crosses — before the
//     extra-point question is even drawn. The question can add one. Nothing a
//     question does can take the six back.  (build-order rule 1)
//   • PENALTY MOMENTS (v5, BK 2026-09-22: "its real football, its consequences")
//     amend that rule for YARDAGE only. A big gain that ends in the field of play
//     can draw a flag: answer the check and the play stands, miss it and the play
//     comes back with a 10-yard penalty and the down replayed. **A touchdown is
//     never called back** — the six are banked and stay banked, which is the part
//     of rule 1 BK has not moved.
//   • The clock runs in chunks per snap, Retro Bowl style — never real time.
//
// The clock is kept per HALF (quarters are just a label on it), so a drive that
// crosses the end of the first or third quarter simply carries on.
// ============================================================
import { clamp } from './ratings.js'

export function newGame(quarterMinutes = 8) {
  return {
    Q: quarterMinutes * 60,
    half: 1,
    halfLeft: quarterMinutes * 60 * 2,
    you: 0, opp: 0,
    ballOn: 25, down: 1, toGo: 10,
    timeouts: 3,
    lastRunoff: 0,
    firstRecv: null,
    ot: 0,
  }
}

export function clockOf(g) {
  if (g.ot) return { label: `OT${g.ot > 1 ? g.ot : ''}`, time: '—' }
  const inFirst = g.halfLeft > g.Q
  const q = g.half * 2 - (inFirst ? 1 : 0)
  const s = Math.max(0, inFirst ? g.halfLeft - g.Q : g.halfLeft)
  return { label: `Q${q}`, time: `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` }
}

export const goalToGo = g => g.ballOn + g.toGo >= 100
export const halfOver = g => !g.ot && g.halfLeft <= 0

export function firstDown(g, ballOn) {
  return { ...g, ballOn, down: 1, toGo: Math.min(10, 100 - ballOn) }
}

const tick = (g, secs) => (g.ot ? g : { ...g, halfLeft: g.halfLeft - secs })

// One snap's result from the field engine → the new game state and what happens next.
// outcome.kind: 'continue' | 'td' | 'safety' | 'turnover' | 'downs'
export function applyPlay(g0, res, random = Math.random) {
  const playSecs = clamp(Math.round((res.seconds || 4) * 1.4), 4, 12)
  const inBounds = res.type === 'tackle' || res.type === 'sack'
  const runoff = inBounds ? Math.round(22 + random() * 12) : 0
  let g = { ...tick(g0, playSecs + runoff), lastRunoff: runoff }

  switch (res.type) {
    case 'td':
      g = { ...g, you: g.you + 6 }                         // banked now; the XP question comes after
      return { g, outcome: { kind: 'td' } }
    case 'safety':
      g = { ...g, opp: g.opp + 2 }
      return { g, outcome: { kind: 'safety', oppStart: 35 } }
    case 'int': {
      const spot = res.yardLine >= 100 ? 80 : res.yardLine   // picked in their end zone: touchback
      return { g, outcome: { kind: 'turnover', oppStart: clamp(100 - spot, 1, 99), why: 'Intercepted' } }
    }
    case 'fumble':
      return { g, outcome: { kind: 'turnover', oppStart: clamp(100 - res.yardLine, 1, 99), why: 'Fumble — they recover' } }
    case 'incomplete': {
      g = { ...g, down: g.down + 1 }
      if (g.down > 4) return { g, outcome: { kind: 'downs', oppStart: clamp(100 - g.ballOn, 1, 99) } }
      return { g, outcome: { kind: 'continue' } }
    }
    default: {                                               // tackle · oob · sack
      const spot = clamp(res.yardLine, 1, 99)
      const line = g.ballOn + g.toGo
      if (spot >= line) return { g: firstDown(g, spot), outcome: { kind: 'continue', firstDown: true } }
      g = { ...g, ballOn: spot, down: g.down + 1, toGo: line - spot }
      if (g.down > 4) return { g, outcome: { kind: 'downs', oppStart: clamp(100 - spot, 1, 99) } }
      return { g, outcome: { kind: 'continue' } }
    }
  }
}

// ── penalty moments ─────────────────────────────────────────────────────────
// Eligible: a big gain that ended in the field of play. Never a score, never a
// turnover, never a loss — a flag is for taking something away, and those plays
// have nothing to take.
export function isPenaltySpot(res, outcome, rules = {}) {
  if (!outcome || outcome.kind !== 'continue') return false
  if (!['tackle', 'oob'].includes(res.type)) return false
  return res.gained >= (rules.penalty_min_gain ?? 15)
}

// The flag. The play comes back to where it started, the down is replayed, and the
// penalty is walked off from that spot — half the distance when the goal line is close,
// the way it actually works. `before` is the game state BEFORE the snap.
export function applyPenalty(before, after, rules = {}) {
  const yards = rules.penalty_yards ?? 10
  const walk = before.ballOn <= yards * 2 ? Math.max(1, Math.floor(before.ballOn / 2)) : yards
  const ballOn = clamp(before.ballOn - walk, 1, 99)
  return {
    ...after,                      // keep the clock that already ran
    ballOn,
    down: before.down,             // the down is replayed
    toGo: Math.min(before.toGo + walk, 100 - ballOn),
    lastRunoff: 0,                 // a flag stops the clock
    penaltyYards: walk,
  }
}

// The extra point. Adds one on a right answer. Takes nothing on a wrong one.
export function extraPoint(g, correct) {
  return correct ? { ...g, you: g.you + 1 } : g
}

// The two-point try (v5, BK: a chance to get back a kick you missed earlier). Two
// questions instead of one: get them all and it is worth two, miss any and it is worth
// nothing — the same bet the real decision is. The touchdown is banked either way.
export function twoPoint(g, made) {
  return made ? { ...g, you: g.you + 2 } : g
}

export function punt(g, random = Math.random) {
  const land = g.ballOn + Math.round(36 + random() * 10)
  return { g: tick(g, 8), oppStart: land >= 100 ? 20 : clamp(100 - land, 1, 99) }
}

export const kickDistance = g => 100 - g.ballOn + 17
export const canKick = g => kickDistance(g) <= 57
export const kickChance = g => clamp(1.02 - 0.013 * (kickDistance(g) - 20), 0.25, 0.97)

export function fieldGoal(g, random = Math.random) {
  const good = random() < kickChance(g)
  const g2 = tick(g, 6)
  return good
    ? { g: { ...g2, you: g2.you + 3 }, good, oppStart: 25 }
    : { g: g2, good, oppStart: Math.max(20, 100 - g.ballOn) }
}

// The opponent's drive, already simulated (drive.js), applied.
export function applyDrive(g, d) {
  const g2 = { ...tick(g, d.seconds), opp: g.opp + d.points }
  return firstDown(g2, d.next)
}

// A timeout stops the clock: the runoff after the last snap comes back.
export function callTimeout(g) {
  if (g.timeouts <= 0) return g
  return { ...g, timeouts: g.timeouts - 1, halfLeft: g.halfLeft + g.lastRunoff, lastRunoff: 0 }
}

export function startSecondHalf(g) {
  return { ...g, half: 2, halfLeft: g.Q * 2, timeouts: 3, lastRunoff: 0 }
}

export function startOvertime(g) {
  return { ...firstDown({ ...g, ot: g.ot + 1 }, 75) }
}
