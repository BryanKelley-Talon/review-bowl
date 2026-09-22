// The other team's possessions are simulated, the way Retro Bowl does it: a drive
// resolves to one card. Your Defense rating — the average of your five stats, so
// built from every lane of content — is what holds them.
import { clamp } from './ratings.js'

const rand = (r, a, b) => a + r() * (b - a)

// start: the opponent's yard line, measured from THEIR goal (25 after a touchback).
// secondsLeft: time left in the half. ot: overtime possession (no clock).
export function simDrive({ opp, defense, start = 25, secondsLeft = 999, ot = false, random = Math.random }) {
  const r = random
  const edge = opp - defense
  const pTD = clamp(0.23 + 0.045 * edge + 0.006 * (start - 25) + (ot ? 0.12 : 0), 0.06, 0.72)
  const pFG = ot ? 0.3 : 0.16
  const pTO = clamp(0.12 - 0.02 * edge, 0.04, 0.3)
  const x = r()
  let result, yards, seconds
  if (x < pTD) { result = 'TD'; yards = 100 - start; seconds = rand(r, 120, 270) }
  else if (x < pTD + pFG) { result = 'FG'; yards = clamp(Math.round(rand(r, 62, 78) - start), 5, 90); seconds = rand(r, 100, 230) }
  else if (x < pTD + pFG + pTO) { result = 'TURNOVER'; yards = Math.round(rand(r, 4, 38)); seconds = rand(r, 40, 150) }
  else if (ot) { result = 'DOWNS'; yards = Math.round(rand(r, 0, 12)); seconds = 0 }
  else { result = 'PUNT'; yards = Math.round(rand(r, 6, 32)); seconds = rand(r, 70, 170) }

  if (!ot && seconds > secondsLeft) {
    // The half runs out first. A long drive near the posts still gets a kick away.
    seconds = secondsLeft
    if (result === 'TD' || result === 'FG') result = r() < 0.5 ? 'FG' : 'END'
    else result = 'END'
  }
  const end = clamp(start + yards, 1, 99)
  const plays = Math.max(3, Math.round(seconds / 28 + r() * 3))
  const points = result === 'TD' ? (r() < 0.95 ? 7 : 6) : result === 'FG' ? 3 : 0

  // Where the player's next drive starts, from the player's own goal.
  let next = 25
  if (result === 'PUNT') {
    const land = end + Math.round(rand(r, 34, 46))
    next = land >= 100 ? 20 : clamp(100 - land, 8, 40)
  } else if (result === 'TURNOVER' || result === 'DOWNS') next = clamp(100 - end, 5, 95)

  return { result, points, yards: Math.max(0, end - start), seconds: Math.round(seconds), plays, next }
}

export function driveLine(name, d) {
  const what = { TD: 'Touchdown', FG: 'Field goal', PUNT: 'Punt', TURNOVER: 'Turnover — your ball', DOWNS: 'Stopped on downs — your ball', END: 'The half runs out' }[d.result]
  return `${name}: ${d.plays} plays, ${d.yards} yards — ${what}.`
}
