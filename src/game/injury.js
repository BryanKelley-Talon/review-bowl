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

// A rehab session in Practice Week. level 1 or 2; correct true/false.
export function afterRehab(injury, level, correct) {
  if (!injury || !correct) return injury
  if (level >= 2) return null
  const out = injury.out - 1
  return out > 0 ? { ...injury, out } : null
}

// ── the rehab task: sort each card into its bin ──────────────────────────────
export const ROLES = ['context', 'claim', 'evidence', 'none']

// placed: { [cardIndex]: role }. Right only when every card is in its own bin.
export function sortIsRight(task, placed) {
  return task.cards.every((c, i) => placed[i] === c.role)
}

// The rehab tasks for this course and level, from the manifest's rehab packs.
// A task is usable when it has a task line, 3+ cards with known roles, two hints and a reason.
export function rehabTasks(packs, course, level) {
  const out = []
  for (const p of packs) for (const t of p?.tasks || []) {
    if (t.course !== course || Number(t.level) !== level) continue
    if (!t.task || !Array.isArray(t.cards) || t.cards.length < 3) continue
    if (!t.cards.every(c => c && c.text && ROLES.includes(c.role))) continue
    if (!Array.isArray(t.hints) || t.hints.length < 2 || !t.reasoning) continue
    out.push(t)
  }
  return out
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

// ── the words: WORKING LABELS until BK says yes (proposed in chat 2026-10-04) ────────
// npm run release-check fails while _approved is false or a placeholder rehab pack is on.
const games = n => `${n} more ${n === 1 ? 'game' : 'games'}`
export const INJ_WORDS = {
  _approved: false,
  hurt: (name, pos, n) => `${name} (${pos}) is hurt: out the rest of this game and ${games(n)}. A backup steps in.`,
  backupTag: 'Backup',
  rehabHead: 'Rehab',
  rehabBody: (name, pos, n) => `${name} (${pos}) is out ${games(n)}, and a backup is playing. Organize an essay and he comes back sooner.`,
  level: { 1: 'Level 1 · sort 3 cards · back one game sooner', 2: 'Level 2 · sort 5 cards · back for the next game' },
  sortHow: 'Tap a card, then tap where it goes.',
  bins: { context: 'Context', claim: 'Claim', evidence: 'Evidence', none: 'Doesn’t fit' },
  check: 'Check it',
  hint: 'Hint',
  right1: name => `Right. ${name} is back one game sooner.`,
  rightBack: name => `Right. ${name} is back for the next game.`,
  wrong: (name, n) => `Not this time. ${name} heals on schedule: out ${games(n)}.`,
  oneSession: 'One rehab session a week.',
  noTasks: 'Rehab opens when the essay tasks are ready. He heals on schedule until then.',
  task: 'The task',
  unsorted: 'Not sorted yet',
}
