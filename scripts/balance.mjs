// ============================================================
// BALANCE REPORT — `npm run balance`
//
// Prints the numbers a difficulty pass has to argue with: what a fresh team is
// worth, how hard its opponents are week by week, and how many points a simulated
// opponent drive is worth against it. Every number here comes from the real modules,
// so it moves when the game moves.
//
// The OFFENSIVE half of balance cannot be measured here: it lives in the canvas
// engine (field.js), which needs a browser. Run that trial in the dev build — the v3
// and v4 handoffs record how — and treat both halves as bot-measured until a human plays.
// ============================================================
import { simDrive } from '../src/game/drive.js'
import { FORM_START, ratings, values } from '../src/game/ratings.js'
import { REGULAR_GAMES, newCareer, opponentStrength } from '../src/game/season.js'
import { TEAMS } from '../src/game/teams.js'

const SEEDS = 64
const DRIVES_PER_GAME = 7          // roughly what a half-by-half game produces

const fresh = []
for (let seed = 0; seed < SEEDS; seed++) fresh.push(values(ratings(newCareer('us11r', seed % TEAMS.length, seed))))
const mean = (rows, k) => rows.reduce((n, r) => n + r[k], 0) / rows.length

console.log(`\nFRESH TEAM (season 1, week 1, before any Practice Week) — FORM_START ${FORM_START}`)
for (const k of ['throwing', 'hands', 'speed', 'blocking', 'toughness', 'defense']) {
  const vals = fresh.map(f => f[k])
  console.log(`  ${k.padEnd(10)} avg ${mean(fresh, k).toFixed(2)}   range ${Math.min(...vals)}–${Math.max(...vals)}`)
}

console.log('\nOPPONENT STRENGTH BY WEEK (what the player actually faces)')
const byWeek = []
for (let week = 0; week < REGULAR_GAMES; week++) {
  let tot = 0, n = 0
  for (let seed = 0; seed < SEEDS; seed++) {
    const c = { ...newCareer('us11r', seed % TEAMS.length, seed), week, phase: 'regular' }
    for (let opp = 0; opp < TEAMS.length; opp++) { if (opp === c.team) continue; tot += opponentStrength(c, opp); n++ }
  }
  byWeek.push(tot / n)
  console.log(`  week ${week + 1}: ${(tot / n).toFixed(2)}`)
}
let pl = 0, pn = 0
for (let seed = 0; seed < SEEDS; seed++) {
  const c = { ...newCareer('us11r', seed % TEAMS.length, seed), week: 0, phase: 'playoffs' }
  for (let opp = 0; opp < TEAMS.length; opp++) { if (opp === c.team) continue; pl += opponentStrength(c, opp); pn++ }
}
console.log(`  playoffs: ${(pl / pn).toFixed(2)}`)

const pts = (def, opp, start = 25) => {
  let p = 0
  for (let i = 0; i < 8000; i++) p += simDrive({ opp, defense: def, start }).points
  return p / 8000
}

const freshDef = Math.round(mean(fresh, 'defense'))
console.log(`\nPOINTS ALLOWED, fresh defense (${freshDef}) — per drive, and per ${DRIVES_PER_GAME}-drive game`)
for (const [label, week] of [['week 1', 0], ['week 4', 3], ['week 8', 7]]) {
  const o = Math.round(byWeek[week])
  const p = pts(freshDef, o)
  console.log(`  ${label.padEnd(7)} vs opponent ${o}: ${p.toFixed(2)} / drive → ${(p * DRIVES_PER_GAME).toFixed(0)} a game`)
}

console.log(`\nWHAT PRACTICE WEEK IS WORTH — week 1 opponent (${Math.round(byWeek[0])}), points allowed a game`)
for (const d of [freshDef, freshDef + 1, freshDef + 2, freshDef + 3]) {
  console.log(`  defense ${d}: ${(pts(d, Math.round(byWeek[0])) * DRIVES_PER_GAME).toFixed(0)}`)
}
console.log()
