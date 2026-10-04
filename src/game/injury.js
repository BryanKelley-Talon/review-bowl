// ============================================================
// INJURIES AND REHAB — Review Bowl football (BK 2026-10-03 23:10 / 23:16, Leo's memo
// In/leo-memo-2026-10-03-review-bowl-injuries-next-update.md; build ordered 23:57:
// "let's start building the injury mechanic").
//
// The shape BK and Leo set:
//   · An injury never stops the game. A default backup with a low skill level steps in.
//     The injured starter is out the rest of that game and one or two more.
//   · Injuries are rare and tied to the hard hits the game already has (the ball-security
//     moments). At most one a game, and one player out at a time.
//   · Rehab speeds the return: a short essay-organizing task in Practice Week. Sort the
//     context, the claim and the evidence for a CLE (US) or an EIE (Global). Two levels,
//     like Diagnose the Essay, so a weak writer can still bring the player back:
//     Level 1 → back one game sooner; Level 2 → back for the next game.
//   · 2-d: choose-and-arrange only. Nothing a student sorts is stored or sent. The save
//     code carries the injury (which player, games left) and nothing else.
//
// Pure functions only; Match.jsx and PracticeWeek.jsx do the showing.
// ============================================================

// The ball carrier who takes the hit → the stat his position builds (teams.js POSITION_OF).
// The line and the defense don't carry the ball, so they never get hurt here.
export const HURT_STAT_OF = { RB: 'speed', WR: 'hands', TE: 'toughness', QB: 'throwing' }
export const INJURY_STATS = ['throwing', 'hands', 'speed', 'toughness']

const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d)

// A hard hit just happened to `carrier` (a role: 'RB', 'WR', 'TE', 'QB').
// Returns { stat, out } or null. `out` = games missed AFTER this one.
export function rollInjury({ carrier, already, rules = {}, random = Math.random }) {
  if (already) return null                                 // one at a time, one a game
  const stat = HURT_STAT_OF[carrier]
  if (!stat) return null
  if (random() >= num(rules.injury_chance, 0.15)) return null
  const [lo, hi] = rules.injury_games || [1, 2]
  const out = lo + Math.floor(random() * (hi - lo + 1))
  return { stat, out: Math.max(1, Math.min(2, out)) }
}

// The levels the team actually plays with: the injured starter's spot goes to the backup.
// The backup is never better than the starter he replaces.
export function playingLevels(levels, injury, rules = {}) {
  if (!injury) return levels
  const backup = num(rules.backup_level, 1)
  return { ...levels, [injury.stat]: Math.min(levels[injury.stat] ?? 2, backup) }
}

// After a game. `carried` is the injury the team came in with (the backup played this
// game, so one game comes off). `fresh` is one that happened during it (its games start
// counting next week). One player out at a time, so fresh only exists when carried didn't.
export function injuryAfterGame(carried, fresh) {
  if (fresh) return { stat: fresh.stat, out: fresh.out }
  if (!carried) return null
  const out = carried.out - 1
  return out > 0 ? { stat: carried.stat, out } : null
}

// A finished rehab level (BK 2026-10-04 07:43: "one level brings him back a game early; two
// levels, he's back next game"). Each level a student finishes takes one game off; he's out
// one or two games, so two finished levels always bring him back.
export function afterRehab(injury) {
  if (!injury) return injury
  const out = injury.out - 1
  return out > 0 ? { ...injury, out } : null
}

// ── the rehab tasks (Sam's CLE set, Will's EIE set; leo-ruling-2026-10-04-rehab-tasks) ──────
// A pack: { _meta: { returnRule }, button?, civic_principles_card?, sets: [{ set, title, docs,
// documents?, tasks: [task] }] }. A task: { id, level: CRAWL | WALK | JOG, kind: sort | order |
// find-and-place, prompt, slots: [..], pieces: [{ id, text, goes: slot | null }], hints (2),
// reasoning, distractors, right?, swap?, paragraph? (find-and-place: "[ SPOT n ]" marks a spot) }.
export const LEVELS = ['CRAWL', 'WALK', 'JOG']
const KINDS = ['sort', 'order', 'find-and-place']

export function taskIsUsable(t) {
  if (!t || !KINDS.includes(t.kind) || !LEVELS.includes(t.level) || !t.prompt) return false
  if (!Array.isArray(t.slots) || !t.slots.length || !Array.isArray(t.pieces) || !t.pieces.length) return false
  if (!Array.isArray(t.hints) || t.hints.length < 2 || !t.reasoning) return false
  // every slot is filled by exactly one piece; a piece that fits nowhere is only for find-and-place
  for (const sl of t.slots) if (t.pieces.filter(p => p.goes === sl).length !== 1) return false
  if (t.pieces.some(p => p.goes !== null && !t.slots.includes(p.goes))) return false
  if (t.kind !== 'find-and-place' && t.pieces.some(p => p.goes === null)) return false
  if (t.kind === 'find-and-place') {
    const spots = (t.paragraph || []).filter(x => /^\[ SPOT \d+ \]$/.test(x)).length
    if (spots !== t.slots.length) return false
  }
  return true
}

// The usable sets for one pack: each keeps only its usable tasks, at most one per level.
export function rehabSets(pack) {
  return (pack?.sets || []).map(st => ({ ...st, tasks: LEVELS.map(lv => (st.tasks || []).find(t => t.level === lv && taskIsUsable(t))).filter(Boolean) }))
    .filter(st => st.tasks.length)
}

// One drop: piece onto slot. { ok, line } — line is what the desk wrote for that moment:
// a right line (CRAWL, Sam) on a correct drop; on a wrong one, the slot's line (sort), early or
// late (order), the piece's own line when it fits nowhere, or the swap line (find-and-place).
export function judgeDrop(task, piece, slot) {
  if (piece.goes === slot) return { ok: true, line: task.right?.[slot] || null }
  const d = task.distractors || {}
  if (task.kind === 'sort') return { ok: false, line: d[slot] || null }
  if (task.kind === 'order') {
    const at = task.slots.indexOf(slot), want = task.slots.indexOf(piece.goes)
    return { ok: false, line: (at < want ? d.early : d.late) || null }
  }
  if (piece.goes === null) return { ok: false, line: d[piece.id] || null }
  return { ok: false, line: task.swap || d.swap || null }
}

// placed: { [slot]: pieceId }. Finished when every slot holds its own piece.
export function taskFinished(task, placed) {
  return task.slots.every(sl => { const p = task.pieces.find(x => x.id === placed[sl]); return p && p.goes === sl })
}

// ── the save code: one 4-bit field. 0 = nobody hurt; 1–8 = stat × games left. ──
export function injuryToBits(injury) {
  if (!injury) return 0
  const i = INJURY_STATS.indexOf(injury.stat)
  if (i < 0) return 0
  return 1 + i * 2 + (Math.max(1, Math.min(2, injury.out)) - 1)
}
export function injuryFromBits(v) {
  if (!v || v > INJURY_STATS.length * 2) return null
  const n = v - 1
  return { stat: INJURY_STATS[n >> 1], out: (n & 1) + 1 }
}

// ── the words: proposed 2026-10-04 00:2x (injury proof, page 1); APPROVED by BK 00:33 ─────
// ("I give my yes on all three things"). Rehab v2 (2026-10-04): the levels are the desks' CRAWL / WALK / JOG,
// each task's prompt is the desk's, and the return rule is the desk's _meta.returnRule.
const games = n => `${n} more ${n === 1 ? 'game' : 'games'}`
export const INJ_WORDS = {
  _approved: true,
  hurt: (name, pos, n) => `${name} (${pos}) is hurt: out the rest of this game and ${games(n)}. A backup steps in.`,
  backupTag: 'Backup',
  rehabHead: 'Rehab',
  rehabBody: (name, pos, n) => `${name} (${pos}) is out ${games(n)}, and a backup is playing. Organize an essay and he comes back sooner.`,
  hint: 'Hint',
  right1: name => `Right. ${name} is back one game sooner.`,
  rightBack: name => `Right. ${name} is back for the next game.`,
  noTasks: 'Rehab opens when the essay tasks are ready. He heals on schedule until then.',
}
