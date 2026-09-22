// ============================================================
// SEASON · LEAGUE · CAREER — FULL-SPEC §3 and §5.4.
//
// Everything about the rest of the league is DERIVED from the career's seed: the
// schedule, every other team's result, the playoff bracket, the job offers. So the
// save code only has to carry the player's own eight results, and a restored code
// rebuilds the exact same league table.
// ============================================================
import { ALL_LANES, DEFENSE, FORM_START, STATS } from './ratings.js'
import { TEAMS, mix, rng, teamStrength } from './teams.js'

export const RESULT = { NONE: 0, W: 1, L: 2, T: 3 }
export const REGULAR_GAMES = 8

// ── schedule: a round robin, reshuffled every season ────────────────────────
export function schedule(seed, season) {
  const r = rng(mix(seed, season, 11))
  const order = TEAMS.map((_, i) => i)
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [order[i], order[j]] = [order[j], order[i]] }
  const n = order.length
  const rounds = []
  let ring = order.slice()
  for (let round = 0; round < n - 1; round++) {
    const pairs = []
    for (let i = 0; i < n / 2; i++) pairs.push([ring[i], ring[n - 1 - i]])
    rounds.push(pairs)
    ring = [ring[0], ring[n - 1], ...ring.slice(1, n - 1)]      // circle method: fix the first, rotate the rest
  }
  return rounds.slice(0, REGULAR_GAMES)
}

export function opponentFor(seed, season, team, week) {
  const pair = schedule(seed, season)[week].find(p => p.includes(team))
  return pair[0] === team ? pair[1] : pair[0]
}

// A game the player is not in, settled by the seed. Same answer every time it is asked.
export function simGame(seed, season, tag, a, b) {
  const r = rng(mix(seed, season, tag, a * 16 + b))
  const sa = teamStrength(seed, season, a), sb = teamStrength(seed, season, b)
  const pts = (s, o) => {
    let p = 0
    for (let d = 0; d < 9; d++) {
      const x = r()
      if (x < 0.26 + 0.035 * (s - o)) p += 7
      else if (x < 0.42 + 0.03 * (s - o)) p += 3
    }
    return p
  }
  let pa = pts(sa, sb), pb = pts(sb, sa)
  if (pa === pb) (r() < 0.5 ? pa += 3 : pb += 3)                 // no ties outside the player's own games
  return { a: pa, b: pb, winner: pa > pb ? a : b }
}

export function standings(career) {
  const { seed, season, team, results } = career
  // 'practice' is mid-season too: only a finished regular season counts all eight.
  const played = career.phase === 'regular' || career.phase === 'practice' ? career.week : REGULAR_GAMES
  const rows = TEAMS.map((t, i) => ({ index: i, team: t, w: 0, l: 0, t: 0 }))
  schedule(seed, season).slice(0, played).forEach((pairs, week) => {
    for (const [a, b] of pairs) {
      if (a === team || b === team) {
        const other = a === team ? b : a
        const res = results[week]
        if (res === RESULT.W) { rows[team].w++; rows[other].l++ }
        else if (res === RESULT.L) { rows[team].l++; rows[other].w++ }
        else if (res === RESULT.T) { rows[team].t++; rows[other].t++ }
      } else {
        const g = simGame(seed, season, week, a, b)
        rows[g.winner].w++
        rows[g.winner === a ? b : a].l++
      }
    }
  })
  const tiebreak = rng(mix(seed, season, 99))
  const tb = TEAMS.map(() => tiebreak())
  return rows.sort((x, y) => (y.w + y.t / 2) - (x.w + x.t / 2) || tb[y.index] - tb[x.index])
}

export const record = results => ({
  w: results.filter(r => r === RESULT.W).length,
  l: results.filter(r => r === RESULT.L).length,
  t: results.filter(r => r === RESULT.T).length,
})

// Seeds 1v4 and 2v3; the winners meet in the final.
export function bracket(career) {
  const top = standings({ ...career, phase: 'playoffs' }).slice(0, 4).map(r => r.index)
  const semis = [[top[0], top[3]], [top[1], top[2]]]
  const mine = semis.find(s => s.includes(career.team))
  const other = semis.find(s => s !== mine)
  const otherGame = simGame(career.seed, career.season, 50, other[0], other[1])
  return { top, semis, mine, other, otherWinner: otherGame.winner, otherScore: otherGame }
}

export function playoffOpponent(career) {
  const b = bracket(career)
  if (!b.mine) return null
  return career.playoffRound === 1 ? b.mine.find(i => i !== career.team) : b.otherWinner
}

// How strong the team across the line is TODAY — which is not the same as how good that
// team is in the standings (simGame uses the raw strength for the rest of the league).
// v4 difficulty pass: week 1 used to be as hard as week 8. Now the season ramps — the
// early schedule gives a fresh squad a fair fight, and by week 8 the league is at full
// strength. The playoffs stay a step above that, and later seasons harder again.
export const WEEK_RAMP = week => -2 + week * 0.42

export function opponentStrength(career, opp) {
  const base = teamStrength(career.seed, career.season, opp)
  const ramp = career.phase === 'playoffs' ? 1.6 : WEEK_RAMP(career.week)
  const era = Math.floor((career.season - 1) / 3)
  return clamp(Math.round(base + ramp + era), 2, 9)
}

// ── the career ───────────────────────────────────────────────────────────────
// A squad arrives at levels 1–3. Level is what a player is worth to his stat, and
// Practice Week training (or a free-agent signing) is how it goes up. Max 4.
export function levelsFor(seed, team, salt = 0) {
  // v4: no level-1 starters. A squad you inherit is ordinary, not broken.
  const r = rng(mix(seed, team, 5, salt))
  return Object.fromEntries(STATS.map(s => [s, r() < 0.6 ? 2 : 3]))
}
export const MAX_LEVEL = 4

export function newCareer(course, team, seed = Math.floor(Math.random() * 64)) {
  return {
    course, team, seed,
    // A season opens in Practice Week, so the first thing a student meets is the
    // defensive film study rather than a cold kickoff.
    season: 1, phase: 'practice', week: 0,
    results: [0, 0, 0, 0, 0, 0, 0, 0],
    playoffRound: 0, champ: false,
    cash: 5,                                   // in $10k
    security: 18,                              // job security, 0–31
    form: Object.fromEntries(ALL_LANES.map(l => [l, FORM_START])),
    facilities: Object.fromEntries([...STATS, DEFENSE].map(s => [s, 0])),
    levels: levelsFor(seed, team),
    titles: 0,
    practiceDone: false,
  }
}

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

// A finished game. outcome: { result: RESULT.*, press: bool }
export function afterGame(career, outcome) {
  const c = { ...career, results: career.results.slice() }
  const won = outcome.result === RESULT.W, lost = outcome.result === RESULT.L
  const earned = (won ? 3 : lost ? 1 : 2) + (outcome.press ? 1 : 0) + (c.phase === 'playoffs' && won ? 2 : 0)
  const security = (won ? 2 : lost ? -2 : 0) + (outcome.press ? 1 : 0)
  c.cash = clamp(c.cash + earned, 0, 31)
  c.security = clamp(c.security + security, 0, 31)

  if (c.phase === 'regular') {
    c.results[c.week] = outcome.result
    c.week += 1
    if (c.week >= REGULAR_GAMES) {
      const rank = standings(c).findIndex(r => r.index === c.team)
      if (rank < 4) { c.phase = 'playoffs'; c.playoffRound = 1 }
      else c.phase = 'seasonEnd'
    } else {
      // Practice Week: recovery, film study and training before the next opponent.
      // Not before a playoff game — the playoffs run cold (iteration order §5).
      c.phase = 'practice'
      c.practiceDone = false
    }
  } else if (c.phase === 'playoffs') {
    if (won && c.playoffRound === 1) c.playoffRound = 2
    else {
      if (won) { c.champ = true; c.titles = clamp(c.titles + 1, 0, 3) }
      c.phase = 'seasonEnd'
    }
  }
  return { career: c, earned, security }
}

// The front office's verdict on the season. Pure: shown first, applied on Continue.
export function seasonReview(career) {
  const rec = record(career.results)
  const made = career.playoffRound > 0
  let delta = 0
  const reasons = []
  if (career.champ) { delta += 6; reasons.push('Won the championship (+6)') }
  else if (made) { delta += 3; reasons.push('Made the playoffs (+3)') }
  if (rec.w <= 2) { delta -= 4; reasons.push(`Only ${rec.w} wins (−4)`) }
  const after = clamp(career.security + delta, 0, 31)
  return { rec, made, champ: career.champ, delta, reasons, after, fired: after < 10 }
}

export function applySeasonReview(career) {
  const r = seasonReview(career)
  return { ...career, security: r.after, phase: r.fired ? 'jobs' : 'offseason' }
}

// Fired: three other programs call. Knowledge travels with the coach; facilities do not.
export function jobOffers(career) {
  const r = rng(mix(career.seed, career.season, career.team, 31))
  const others = TEAMS.map((_, i) => i).filter(i => i !== career.team)
  for (let i = others.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [others[i], others[j]] = [others[j], others[i]] }
  return others.slice(0, 3)
}

export function takeJob(career, team) {
  return {
    ...career, team, security: 16, phase: 'offseason',
    facilities: Object.fromEntries([...STATS, DEFENSE].map(s => [s, 0])),
    levels: levelsFor(career.seed, team, career.season),
  }
}

export function startNextSeason(career) {
  return {
    ...career, season: clamp(career.season + 1, 1, 16), phase: 'practice', week: 0,
    results: [0, 0, 0, 0, 0, 0, 0, 0], playoffRound: 0, champ: false, practiceDone: false,
  }
}

// Practice Week is over; the next opponent is up.
export function finishPractice(career) {
  return { ...career, phase: 'regular', practiceDone: true }
}

// Training one player (Practice Week). v4, BK's ruling: **a right answer is the whole
// price.** Money was friction with no educational value in the weekly loop; the cash
// economy now exists only for the off-season's deeper tier. The limit that keeps this
// paced is one session per player per week, not a bank balance.
export function trainPlayer(career, stat) {
  const level = career.levels[stat] ?? 2
  if (level >= MAX_LEVEL) return career
  return { ...career, levels: { ...career.levels, [stat]: level + 1 } }
}

// A tier-1 facility in Practice Week, on the same terms: answer it, own it.
export function upgradeFacility(career, stat, max = PRACTICE_FACILITY_MAX) {
  const level = career.facilities[stat] || 0
  if (level >= max) return career
  return { ...career, facilities: { ...career.facilities, [stat]: level + 1 } }
}

// ── the off-season market ────────────────────────────────────────────────────
export function freeAgents(career) {
  const r = rng(mix(career.seed, career.season, career.team, 17))
  const list = []
  const pool = STATS.slice()
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]] }
  for (const stat of pool.slice(0, 3)) {
    const level = r() < 0.3 ? 4 : 3
    list.push({ stat, level, cost: level === 4 ? 4 : 2 })
  }
  return list
}

export const FACILITY_COST = [3, 5]                     // level 0→1, 1→2, in $10k
// Practice Week sells the first tier only; the second tier stays the off-season's
// deeper investment (BK: post-season should be "even more so").
export const PRACTICE_FACILITY_MAX = 1
