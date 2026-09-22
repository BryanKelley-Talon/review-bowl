// ============================================================
// THE STAT LAYER — FULL-SPEC §2.2. The mechanism that makes "success is content,
// not swipe skill" real rather than asserted.
//
// Five lanes of content, five team stats. Every answer at a dead-ball gate moves
// that lane's FORM; form is the largest single part of the stat; the stat sets the
// odds in live play. A team that knows the material throws tighter and breaks more
// tackles. A team that doesn't still plays — it is just playing a worse team.
//
//   rating (1–10) = content (0–5, from form)  +  roster stars (0–3)  +  facility (0–2)
//                   + halftime / timeout adjustments (temporary)
//
// Form is kept in whole points 0–15 so the save code carries it exactly.
// ============================================================

// CONTENT LANES — the five a question pack can belong to. A pack declares one of
// these; answering it builds that lane's stat during a game.
export const LANES = ['sources', 'context', 'vocab', 'reading', 'skills']
export const STAT_OF = { sources: 'throwing', context: 'hands', vocab: 'speed', reading: 'blocking', skills: 'toughness' }
export const LANE_OF = Object.fromEntries(Object.entries(STAT_OF).map(([l, s]) => [s, l]))
export const STATS = LANES.map(l => STAT_OF[l])

// DEFENSE — a sixth lane, and a real trainable stat as of v3 (iteration order §4).
// It was the average of the other five, which meant no moment on the calendar trained
// it. Now it has its own form, built ONLY in Practice Week (season.js / PracticeWeek.jsx),
// and it pays off on the opponent's threatening drives rather than on your own snaps.
// No pack maps to it: it is trained with borrowed vocab, as film study.
export const DEFENSE = 'defense'
export const ALL_LANES = [...LANES, DEFENSE]
STAT_OF[DEFENSE] = DEFENSE
LANE_OF[DEFENSE] = DEFENSE

export const FORM_MAX = 15
export const FORM_START = 4
const GAIN = 2
const LOSS = 1
// Practice Week swings harder than an in-game answer, because BK's ruling is that the
// week's answers set what the defense is worth in the NEXT game — the most recent week
// has to be able to move it. Both are manifest knobs (rules.defense_gain / defense_loss).
const DEFENSE_GAIN = 3
const DEFENSE_LOSS = 2

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

// A correct answer builds form; a miss costs a little. Hints are free unless BK's
// manifest says otherwise (rules.hint_form_discount).
export function applyAnswer(form, lane, correct, hintsUsed = 0, rules = {}) {
  const discount = Math.max(0, Number(rules.hint_form_discount) || 0)
  const gain = lane === DEFENSE ? (rules.defense_gain ?? DEFENSE_GAIN) : GAIN
  const loss = lane === DEFENSE ? (rules.defense_loss ?? DEFENSE_LOSS) : LOSS
  const delta = correct ? Math.max(1, gain - discount * hintsUsed) : -loss
  return { ...form, [lane]: clamp((form[lane] ?? FORM_START) + delta, 0, FORM_MAX) }
}

// A lane with no content on this door still has a stat. Until its content lands,
// every answer builds it — and the team screen says so, rather than leaving a stat
// frozen for a reason a student could never see.
export function applyAnswerAll(form, lane, correct, hintsUsed, rules, emptyLanes) {
  let next = applyAnswer(form, lane, correct, hintsUsed, rules)
  for (const e of emptyLanes || []) if (e !== lane) next = applyAnswer(next, e, correct, hintsUsed, rules)
  return next
}

export const contentPart = f => Math.round(clamp(f, 0, FORM_MAX) / FORM_MAX * 5)

// levels: one player per stat, level 1–4 (teams.js). Raised by training in Practice
// Week or by signing a free agent. A player's level IS his contribution to his stat.
export function ratings({ form = {}, levels = {}, facilities = {}, boost = {} }) {
  const out = {}
  for (const lane of LANES) {
    const stat = STAT_OF[lane]
    const parts = {
      content: contentPart(form[lane] ?? FORM_START),
      roster: clamp((levels[stat] ?? 2) - 1, 0, 3),
      facility: clamp(facilities[stat] ?? 0, 0, 2),
      boost: boost[stat] || 0,
    }
    out[stat] = { value: clamp(parts.content + parts.roster + parts.facility + parts.boost, 1, 10), parts }
  }
  // Defense: its own content form, its own facility (the film room) — and the roster
  // part is the squad's average level, because the same eleven kids play both ways.
  const squad = STATS.reduce((n, s) => n + clamp((levels[s] ?? 2) - 1, 0, 3), 0) / STATS.length
  const dparts = {
    content: contentPart(form[DEFENSE] ?? FORM_START),
    roster: Math.round(squad),
    facility: clamp(facilities[DEFENSE] ?? 0, 0, 2),
    boost: boost[DEFENSE] || 0,
  }
  out[DEFENSE] = { value: clamp(dparts.content + dparts.roster + dparts.facility + dparts.boost, 1, 10), parts: dparts }
  return out
}

export const values = r => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v.value]))

// What each stat does on the field, in numbers. The engine reads only this.
// Kept in one place so the team screen can print exactly what the engine uses.
export function physics(v, opp, read = false) {
  const f = x => 0.82 + 0.03 * x                               // 1 → .85, 10 → 1.12
  return {
    throwJitter: 0.35 + (10 - v.throwing) * 0.26,              // yards of scatter on a throw
    catchRadius: 1.0 + 0.13 * v.hands,                         // yards a receiver can reach
    catchBase: 0.58 + 0.035 * v.hands,                         // uncontested catch chance
    runSpeed: 6.5 * f(v.speed),                                // yd/s, receivers and backs
    qbSpeed: 5.6 * f(v.speed),
    blockTime: 1.25 + 0.22 * v.blocking,                       // seconds the line holds
    breakTackle: 0.04 + 0.022 * v.toughness,
    fumble: Math.max(0.005, 0.035 - 0.003 * v.toughness),
    defSpeed: 6.7 * f(opp) * (read ? 0.84 : 1),                // coverage speed
    pursuitSpeed: 7.45 * f(opp) * (read ? 0.92 : 1),
    rushSpeed: 5.4 * f(opp),
    reaction: read ? 0.55 : 0.3,                               // seconds a defender trails his man
  }
}

// Plain-English lines for the team screen: what the number is doing right now.
export function explain(stat, v) {
  const p = physics({ throwing: v, hands: v, speed: v, blocking: v, toughness: v }, 5)
  switch (stat) {
    case 'throwing': return `Throws land within about ${p.throwJitter.toFixed(1)} yards of where you aim.`
    case 'hands': return `Receivers reach ${p.catchRadius.toFixed(1)} yards and catch ${Math.round(p.catchBase * 100)}% of clean balls.`
    case 'speed': return `Ball carriers run ${p.runSpeed.toFixed(1)} yards a second.`
    case 'blocking': return `The line holds for about ${p.blockTime.toFixed(1)} seconds.`
    case 'toughness': return `${Math.round(p.breakTackle * 100)}% of tackles broken; fumbles on ${(p.fumble * 100).toFixed(1)}% of hits.`
    case 'defense': return 'Stops the other team, and matters most the closer they get to your goal line.'
    default: return ''
  }
}
