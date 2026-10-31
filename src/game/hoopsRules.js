// ============================================================
// BASKETBALL'S RULES — the numbers under the court, with no canvas and no React.
//
// BK, 2026-10-31 18:25–18:38: basketball is the third Review Bowl sport. Inspiration: Bulls vs
// Blazers (1991, Genesis). Same twelve high school teams, league, questions, Locker Room, Practice
// Week and save file as football and volleyball. Boys' and girls' basketball both offered.
//
// Like volleyball, every stat keeps its football key underneath (ratings.js); only the words change.
// The stat map is the scope's (Out/josh-scope-2026-10-31-1832-review-bowl-basketball.md):
//   throwing  → Passing       (point guard)    how open the entry is: which plays you can call
//   hands     → Ball handling (shooting guard) drives finish, the ball stays yours
//   speed     → Shooting      (small forward)  the jumper's release window
//   blocking  → Rebounding    (power forward)  second chances, post finishing
//   toughness → Free throws   (center)         the free-throw meter's sweet spot
//   defense   → Defense       (the team; Practice Week) see their play sooner, a wider contest
//
// Everything a student knows reaches the floor through these functions. hoops.js rolls the dice
// with them, and scripts/test.mjs plays whole games with them, so the balance is tested, not felt.
// Nothing here is stored or sent.
// ============================================================

export const HOOPS = {
  quarters: 4,
  possPerQuarter: 4,       // per side: 8 trips down the floor a quarter, 32 in regulation
  otPoss: 2,               // per side in an overtime period
  quarterMinutes: 8,       // the clock on the board (a high school quarter)
  otMinutes: 4,
  shotClock: 35,           // what the shot clock reads when a possession starts (PROPOSED, see BB words)
  timeoutsPerHalf: 2,
  maxSecondChances: 2,     // offensive rebounds that keep one possession alive
}

// The stats arrive keyed by the football stat they sit on (ratings.js values, 1–10).
export const BB_KEY = { throwing: 'Passing', hands: 'Handling', speed: 'Shooting', blocking: 'Rebounding', toughness: 'FreeThrows', defense: 'Defense' }
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
export function bbStats(v = {}) {
  const out = {}
  for (const k in BB_KEY) out[BB_KEY[k]] = clamp(v[k] ?? 5, 1, 10)
  return out
}
// The other team plays every stat at its hidden strength (teams.js teamStrength), as volleyball does.
export const oppStats = strength => bbStats(Object.fromEntries(Object.keys(BB_KEY).map(k => [k, strength])))

// ── plays ────────────────────────────────────────────────────────────────────
// Three calls, one per scoring player. Each play's finish leans on the stat its player carries.
export const PLAYS = ['drive', 'shooter', 'post']
export const POINTS = { drive: 2, shooter: 3, post: 2 }
export const FINISH_STAT = { drive: 'Handling', shooter: 'Shooting', post: 'Rebounding' }

// The entry pass: Passing against their Defense decides how many calls are open (volleyball's pass).
// 3 = every call open · 2 = the post is fronted · 1 = pressure, drive only.
export function entryQuality(passing, oppDefense, roll) {
  const s = passing / 10 * 1.1 - oppDefense / 10 * 0.35 + (roll - 0.5) * 0.5
  return s < 0.28 ? 1 : s < 0.58 ? 2 : 3
}
export const openPlays = q => (q >= 3 ? ['drive', 'shooter', 'post'] : q === 2 ? ['drive', 'shooter'] : ['drive'])

// The release ring: tap as it closes. The window widens with the stat behind the play.
export function shotWindow(play, st, { steady = false, boost = false } = {}) {
  const v = st[FINISH_STAT[play]] ?? 5
  const k = (steady ? 1.9 : 1) * (boost ? 1.3 : 1)
  return { perfect: (0.06 + v * 0.006) * k, ok: (0.14 + v * 0.012) * k }
}
// The contest ring on defense: the same shape, on Defense.
export function contestWindow(def, { steady = false, boost = false } = {}) {
  const k = (steady ? 1.9 : 1) * (boost ? 1.3 : 1)
  return { perfect: (0.06 + def * 0.006) * k, ok: (0.14 + def * 0.012) * k }
}
export function gradeOf(err, w) {
  const a = Math.abs(err)
  return a < w.perfect ? 'perfect' : a < w.ok ? 'good' : 'off'
}
// The computer's own timing, by its strength (volleyball's aiSpike rule).
export function aiGrade(stat, roll) { return roll < 0.15 + stat * 0.03 ? 'perfect' : roll < 0.75 ? 'good' : 'off' }

const GRADE_ADJ = { perfect: 0.14, good: 0.04, off: -0.18 }
const CONTEST_ADJ = { perfect: 0.16, good: 0.08, off: 0, early: 0.02, none: 0 }
const BASE = { drive: 0.55, shooter: 0.36, post: 0.5 }

// The chance a shot goes in. `guessed`: the defense called this play. `contest`: the defender's grade.
export function makeChance({ play, grade, off, def, guessed = false, contest = 'none' }) {
  const skill = off[FINISH_STAT[play]] ?? 5
  const p = BASE[play] + (skill - 5) * 0.03 - ((def.Defense ?? 5) - 5) * 0.02
    + (GRADE_ADJ[grade] ?? 0) - (guessed ? 0.1 : 0) - (CONTEST_ADJ[contest] ?? 0)
  return clamp(p, 0.05, 0.92)
}

// A foul on the shot. Drives and post-ups draw more; a defender who goes early reaches in.
export function foulChance({ play, contest = 'none' }) {
  const base = { drive: 0.13, post: 0.17, shooter: 0.04 }[play]
  return clamp(base + (contest === 'early' ? 0.12 : 0), 0, 0.4)
}

// A turnover before the shot: Ball handling against their Defense, worse into a defense that read it.
export function turnoverChance({ handling, def, guessed = false, play }) {
  return clamp(0.05 + (def - handling) * 0.008 + (guessed && play === 'drive' ? 0.07 : 0), 0.01, 0.25)
}

// After a miss: the chance the shooting team gets it back. `box` is the student's box-out grade,
// read for whichever side the student is on (a good box-out helps the student's team).
const BOX_ADJ = { perfect: 0.15, good: 0.06, off: -0.05, none: -0.05 }
export function offRebChance({ offReb, defReb, box = null, studentOnOffense = true }) {
  const b = box ? (BOX_ADJ[box] ?? 0) * (studentOnOffense ? 1 : -1) : 0
  return clamp(0.28 + (offReb - defReb) * 0.03 + b, 0.08, 0.6)
}

// Free throws: volleyball's serve meter, its sweet spot set by Free throws.
export const ftGreen = (ft, steady = false) => (0.05 + ft * 0.012) * (steady ? 1.8 : 1)
export const FT_YELLOW = 0.13
// d: how far the marker was from the middle (0–0.5). Returns the chance the shot drops.
export function ftChance(d, green) { return d < green ? 0.95 : d < green + FT_YELLOW ? 0.55 : 0.12 }
export const aiFtChance = ft => clamp(0.5 + ft * 0.03, 0.4, 0.85)
// How many free throws a foul is worth: and-one on a make, or the shot's value on a miss.
export const ftCount = (play, made) => (made ? 1 : POINTS[play])

// Seeing their play: the read cue shows this many seconds before the call has to land.
export const readLead = (def, boost = false) => 0.15 + def * 0.06 + (boost ? 0.35 : 0)

// The computer's play call, by how open its entry was.
export function aiPlay(q, roll) {
  const open = openPlays(q)
  const w = q >= 3 ? [0.35, 0.35, 0.3] : q === 2 ? [0.5, 0.5, 0] : [1, 0, 0]
  let acc = 0
  for (let i = 0; i < 3; i++) { acc += w[i]; if (roll < acc && open.includes(PLAYS[i])) return PLAYS[i] }
  return 'drive'
}
// The computer's guess on defense, by its strength (volleyball's block guess).
export const aiGuessRight = (strength, roll) => roll < 0.3 + 0.035 * strength

// ── the game: periods, possessions, the clock ───────────────────────────────
// Side 0 is the student's team, side 1 the other. The tip-off winner starts the first and third
// quarters, the other team the second and fourth (the alternating-possession arrow); overtime
// keeps alternating.
export function newHoopsGame(tipWinner) {
  return { period: 1, poss: 0, score: [0, 0], tip: tipWinner, offense: tipWinner, timeouts: HOOPS.timeoutsPerHalf, over: false }
}
export const isOT = g => g.period > HOOPS.quarters
export const periodLength = g => (isOT(g) ? HOOPS.otPoss : HOOPS.possPerQuarter) * 2
export const startingOffense = g => (g.period % 2 === 1 ? g.tip : 1 - g.tip)
export const periodName = g => (isOT(g) ? (g.period === HOOPS.quarters + 1 ? 'OT' : `${g.period - HOOPS.quarters}OT`) : `Q${g.period}`)
// The board's clock: the period's minutes, one share gone per trip down the floor.
export function clockText(g, frac = 0) {
  const mins = isOT(g) ? HOOPS.otMinutes : HOOPS.quarterMinutes
  const left = Math.max(0, mins * 60 * (1 - (g.poss + frac) / periodLength(g)))
  const m = Math.floor(left / 60), s = Math.floor(left % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}
// The last trip of the fourth quarter or an overtime, in a game within one score: the big moment.
export const finalPossession = g => g.period >= HOOPS.quarters && g.poss === periodLength(g) - 1
export const isBigMoment = g => finalPossession(g) && Math.abs(g.score[0] - g.score[1]) <= 3

// A possession ends: score it, flip the ball. Returns what happens next.
export function endPossession(g, side, pts) {
  g.score[side] += pts
  g.poss += 1
  g.offense = 1 - g.offense
  if (g.poss < periodLength(g)) return 'next'
  if (g.period >= HOOPS.quarters && g.score[0] !== g.score[1]) { g.over = true; return 'final' }
  if (g.period === 2) return 'half'
  return 'period'
}
export function nextPeriod(g) {
  g.period += 1
  g.poss = 0
  g.offense = startingOffense(g)
  if (g.period === 3) g.timeouts = HOOPS.timeoutsPerHalf
}

// ── one possession, all computer: the test harness and the balance check ───
// Plays a trip with the same functions the court uses. `r` is a seeded random (0–1).
export function simPossession(r, off, def, defStrength = def.Defense) {
  const q = entryQuality(off.Passing, def.Defense, r())
  let chances = 0
  for (;;) {
    const play = aiPlay(chances ? Math.min(q, 2) : q, r())
    const guessed = aiGuessRight(defStrength, r())
    if (r() < turnoverChance({ handling: off.Handling, def: def.Defense, guessed, play })) return 0
    const grade = aiGrade(off[FINISH_STAT[play]], r())
    const contest = guessed ? aiGrade(def.Defense, r()) : 'none'
    const made = r() < makeChance({ play, grade, off, def, guessed, contest })
    let pts = made ? POINTS[play] : 0
    if (r() < foulChance({ play, contest })) {
      const n = ftCount(play, made)
      for (let i = 0; i < n; i++) if (r() < aiFtChance(off.FreeThrows)) pts += 1
      return pts
    }
    if (made) return pts
    if (chances >= HOOPS.maxSecondChances || r() >= offRebChance({ offReb: off.Rebounding, defReb: def.Rebounding })) return 0
    chances += 1
  }
}
export function simGame(r, a, b, tipWinner = 0) {
  const g = newHoopsGame(tipWinner)
  for (let guard = 0; guard < 500; guard++) {
    const side = g.offense
    const pts = side === 0 ? simPossession(r, a, b) : simPossession(r, b, a)
    const next = endPossession(g, side, pts)
    if (next === 'final') return g
    if (next === 'half' || next === 'period') nextPeriod(g)
  }
  throw new Error('a simulated game never ended')
}
