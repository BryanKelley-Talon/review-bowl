// ============================================================
// THE OTHER TEAM'S POSSESSIONS — simulated to one card, the way Retro Bowl does it.
// The student never plays defense (BK was explicit: no defensive play-calling).
//
// v3 (iteration order §4): a drive now runs in two steps instead of one roll, so the
// trained Defense stat is paid where it should be —
//   1. HOW FAR they get. Defense matters a little here.
//   2. WHAT IT'S WORTH when they get there. Defense matters a LOT here, in proportion
//      to threat.js's threat weight: a goal-line stand is where the film study shows up.
// A team that did its Practice Week keeps a drive that reached the 5 out of the end zone.
// A team that skipped it watches the same drive score.
// ============================================================
import { clamp } from './ratings.js'
import { threatLabel, threatOf } from './threat.js'

const rand = (r, a, b) => a + r() * (b - a)

// start: the opponent's own yard line (25 after a touchback). defense: your Defense rating.
// secondsLeft: time left in the half. ot: an overtime possession (no clock).
export function simDrive({ opp, defense, start = 25, secondsLeft = 999, ot = false, random = Math.random }) {
  const r = random
  const edge = opp - defense

  // ── 1 · how far they get. Defense matters a little here. ───────────────────
  // Skewed, not flat: most drives stall, a real share reach the red zone. The exponent
  // is what keeps an even matchup near a field goal a drive (checked in scripts/test.mjs).
  const push = 8 + 65 * Math.pow(r(), 0.9) + edge * 3.5 + (ot ? 12 : 0)
  const reach = clamp(Math.round(start + push), start, 99)
  const threat = threatOf(reach)
  const seconds = ot ? 0 : Math.round(rand(r, 70, 250))

  // A giveaway can end it at any depth; a defense that knows its material forces more.
  const pTurnover = clamp(0.10 - 0.018 * edge, 0.03, 0.28)
  if (r() < pTurnover) {
    const spot = clamp(Math.round(start + push * rand(r, 0.2, 0.8)), 1, 99)
    return finish({ result: 'TURNOVER', points: 0, start, end: spot, seconds, r, secondsLeft, ot, threat, stand: null })
  }

  // ── 2 · what it is worth. Defense is paid in proportion to the threat. ─────
  // At the goal line this decides the game; out past midfield it barely registers.
  const stopPower = (defense - opp) * 0.075 + 0.10
  const pStand = clamp(stopPower * threat * 1.6, 0.03, 0.8)
  const stood = r() < pStand

  if (reach >= 80) {
    if (stood) {
      return r() < 0.6
        ? finish({ result: 'FG', points: 3, start, end: reach, seconds, r, secondsLeft, ot, threat, stand: 'held them to a field goal' })
        : finish({ result: 'DOWNS', points: 0, start, end: reach, seconds, r, secondsLeft, ot, threat, stand: 'stopped them on downs' })
    }
    return finish({ result: 'TD', points: r() < 0.95 ? 7 : 6, start, end: 100, seconds, r, secondsLeft, ot, threat, stand: null })
  }
  if (reach >= 62) {
    if (stood) return finish({ result: 'DOWNS', points: 0, start, end: reach, seconds, r, secondsLeft, ot, threat, stand: 'stopped them short of the posts' })
    return r() < 0.72
      ? finish({ result: 'FG', points: 3, start, end: reach, seconds, r, secondsLeft, ot, threat, stand: null })
      : finish({ result: 'MISS', points: 0, start, end: reach, seconds, r, secondsLeft, ot, threat, stand: null })
  }
  if (ot) return finish({ result: 'DOWNS', points: 0, start, end: reach, seconds: 0, r, secondsLeft, ot, threat, stand: stood ? 'stopped them cold' : null })
  return finish({ result: 'PUNT', points: 0, start, end: reach, seconds, r, secondsLeft, ot, threat, stand: null })
}

function finish({ result, points, start, end, seconds, r, secondsLeft, ot, threat, stand }) {
  if (!ot && seconds > secondsLeft) {
    // The half runs out first. A drive already in range still gets its kick away.
    seconds = secondsLeft
    if ((result === 'TD' || result === 'FG') && r() < 0.5) { result = 'FG'; points = 3 }
    else { result = 'END'; points = 0; stand = null }
  }
  const plays = Math.max(3, Math.round(seconds / 28 + r() * 3))

  // Where the player's next drive starts, from the player's own goal.
  let next = 25
  if (result === 'PUNT') {
    const land = end + Math.round(rand(r, 34, 46))
    next = land >= 100 ? 20 : clamp(100 - land, 8, 40)
  } else if (result === 'TURNOVER' || result === 'DOWNS' || result === 'MISS') {
    next = clamp(100 - end, 5, 95)
  }
  return { result, points, yards: Math.max(0, end - start), seconds, plays, next, threat, stand, reached: end }
}

export function driveLine(name, d) {
  const what = {
    TD: 'Touchdown', FG: 'Field goal', MISS: 'Field goal is no good — your ball',
    PUNT: 'Punt', TURNOVER: 'Turnover — your ball', DOWNS: 'Stopped on downs — your ball',
    END: 'The half runs out',
  }[d.result]
  return `${name}: ${d.plays} plays, ${d.yards} yards — ${what}.`
}

// What the defense just did, in one line, and only when it actually did something.
export function standLine(d, defense) {
  if (!d.stand) return null
  return `They got ${threatLabel(d.reached)} and your defense ${d.stand} — that is your Defense rating (${defense}) doing the work.`
}
