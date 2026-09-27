// ============================================================
// THE DEALER — which question a gate asks.
//
// One cumulative pool (FULL-SPEC §3): every gate can draw from anything enabled,
// weighted by BK's lane weights in the manifest. Each lane is a shuffled deck, so a
// student sees the whole lane before anything repeats. The deck lives in memory
// only — it is a convenience, and a fresh page simply reshuffles.
// ============================================================
import { LANES } from '../game/ratings.js'

// Where each gate prefers to look. `only` is strict unless the lanes are empty.
// `size` (BK, 2026-09-27): 'short' is strict: an in-game gate never asks a document question,
// and draws nothing rather than a long one. 'long' is a preference: the moments where the game
// already stops (training, facilities, free agency) ask the document questions first, and fall
// back to short ones only when a lane has no long ones.
// In-game `prefer` hammers what BK named: vocabulary, skill concepts and principles (CLE for
// U.S., Enduring Issues for Global), and the exam's task words.
const HAMMER = { vocab: 2, skills: 2, reading: 2 }
const GATES = {
  coin:     { label: 'Coin toss', size: 'short', prefer: HAMMER },
  xp:       { label: 'Extra point', size: 'short', prefer: { skills: 3, vocab: 2, reading: 2 }, scoring: true },
  timeout:  { label: 'Timeout', size: 'short', prefer: HAMMER },
  live:     { label: 'Big moment', size: 'short', prefer: { skills: 2, vocab: 2, context: 2 } },
  halftime: { label: 'Halftime', size: 'short', prefer: HAMMER },
  press:    { label: 'Press conference', size: 'short', prefer: { context: 2, reading: 2 } },
  // A flag is a quick look at the officials, not a reading passage: vocabulary and
  // identification shapes only (BK, 2026-09-22: "shorter, vocab matching type or ID type").
  penalty:  { label: 'Flag on the play', size: 'short', only: ['vocab', 'skills', 'reading'] },
  // Practice Week film study: three quick ones between games, borrowed from the vocabulary lanes.
  practice: { label: 'Film study', size: 'short', only: ['vocab', 'reading', 'skills'] },
  // The bigger rewards ask the bigger questions: a level, a facility, a signing.
  training: { label: 'Training', size: 'long' },
  agency:   { label: 'Free agency', size: 'long' },
}

export function makeDealer(pool, course, rules = {}, random = Math.random) {
  const decks = {}
  let last = null

  // size: 'short' | 'long' | null. Items without a size (older pools) count as short.
  const eligible = (lane, scoring, size = null) => (pool.lanes[lane] || []).filter(q =>
    !(scoring && q.answerVerified === false && !rules.unverified_in_scoring_gates) &&
    (!size || (q.size || 'short') === size))

  // ONE deck per lane, shared by every gate — a scoring gate just skips the items it
  // may not ask. (Separate decks per gate type let the same item come up twice a game.)
  function fromDeck(lane, scoring, size = null) {
    const ok = eligible(lane, scoring, size)
    if (!ok.length) return null
    const all = pool.lanes[lane]
    let deck = decks[lane] || []
    if (!deck.some(id => ok.some(q => q.id === id))) {
      deck = all.map(q => q.id)
      for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]] }
      if (deck.length > 1 && deck[deck.length - 1] === last) deck.unshift(deck.pop())
    }
    let at = deck.length - 1
    while (at >= 0 && !ok.some(q => q.id === deck[at])) at--
    const id = deck[at]
    deck.splice(at, 1)
    decks[lane] = deck
    last = id
    return ok.find(q => q.id === id)
  }

  function pickLane(weights, scoring, size = null) {
    const live = LANES.filter(l => (weights[l] || 0) > 0 && eligible(l, scoring, size).length)
    if (!live.length) return null
    const total = live.reduce((n, l) => n + weights[l], 0)
    let r = random() * total
    for (const l of live) { r -= weights[l]; if (r <= 0) return l }
    return live[live.length - 1]
  }

  return {
    emptyLanes: LANES.filter(l => !(pool.lanes[l] || []).length),
    size: LANES.reduce((n, l) => n + (pool.lanes[l] || []).length, 0),

    // gate: one of GATES. opts.lane forces a lane (free agency). opts.playoff marks
    // every gate as scoring — playoffs are summative.
    draw(gate, opts = {}) {
      const g = GATES[gate] || {}
      const scoring = !!(g.scoring || opts.playoff)
      const base = course.weights || {}
      const tryLanes = opts.lane ? [opts.lane] : g.only
      // One pass per acceptable size: short gates try short only; long gates try long, then short.
      const sizes = g.size === 'short' ? ['short'] : g.size === 'long' ? ['long', 'short'] : [null]
      for (const size of sizes) {
        if (tryLanes) {
          const lane = pickLane(Object.fromEntries(tryLanes.map(l => [l, 1])), scoring, size)
          if (lane) return fromDeck(lane, scoring, size)
          if (opts.lane) continue            // a forced lane never borrows another lane
        }
        const weights = Object.fromEntries(LANES.map(l => [l, (base[l] ?? 1) * ((g.prefer || {})[l] || 1)]))
        const lane = pickLane(weights, scoring, size) || pickLane(Object.fromEntries(LANES.map(l => [l, 1])), scoring, size)
        if (lane) return fromDeck(lane, scoring, size)
      }
      return null
    },
  }
}

export const gateLabel = gate => (GATES[gate] || {}).label || gate
